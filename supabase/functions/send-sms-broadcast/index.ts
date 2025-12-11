import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BroadcastRequest {
  event_id: string;
  target_audience: 'attending' | 'maybe' | 'attending_and_maybe' | 'all_invited';
  message_text: string;
}

interface Recipient {
  guest_name: string;
  guest_phone: string;
  country_code: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { event_id, target_audience, message_text }: BroadcastRequest = await req.json();

    if (!event_id || !target_audience || !message_text) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate message length (SMS segment is ~160 chars)
    if (message_text.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Message too long. Maximum 500 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify event ownership and check broadcast limit
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, host_name, user_id, sms_broadcasts_sent, sms_broadcast_limit')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      console.error('Event fetch error:', eventError);
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (event.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to send broadcasts for this event' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check broadcast limit
    const broadcastsSent = event.sms_broadcasts_sent || 0;
    const broadcastLimit = event.sms_broadcast_limit || 3;

    if (broadcastsSent >= broadcastLimit) {
      return new Response(
        JSON.stringify({ 
          error: `Broadcast limit reached. You have used all ${broadcastLimit} broadcasts for this event.`,
          broadcasts_sent: broadcastsSent,
          broadcast_limit: broadcastLimit
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build RSVP status filter based on target audience
    let rsvpStatusFilter: string[] = [];
    switch (target_audience) {
      case 'attending':
        rsvpStatusFilter = ['attending'];
        break;
      case 'maybe':
        rsvpStatusFilter = ['maybe'];
        break;
      case 'attending_and_maybe':
        rsvpStatusFilter = ['attending', 'maybe'];
        break;
      case 'all_invited':
        rsvpStatusFilter = ['attending', 'maybe', 'cant_go', 'not_responded'];
        break;
    }

    // Fetch eligible recipients (RSVPs with SMS consent)
    const { data: rsvps, error: rsvpError } = await supabase
      .from('rsvps')
      .select('id, guest_name, guest_phone, country_code, guest_token')
      .eq('event_id', event_id)
      .in('rsvp_status', rsvpStatusFilter)
      .not('guest_phone', 'is', null);

    if (rsvpError) {
      console.error('RSVP fetch error:', rsvpError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch recipients' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rsvps || rsvps.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No eligible recipients found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get guest preferences for SMS consent
    const guestTokens = rsvps.map(r => r.guest_token);
    const { data: preferences, error: prefError } = await supabase
      .from('guest_preferences')
      .select('guest_token, sms_enabled, sms_consent_given_at')
      .eq('event_id', event_id)
      .in('guest_token', guestTokens);

    if (prefError) {
      console.error('Preferences fetch error:', prefError);
    }

    // Filter recipients with SMS consent
    const consentedTokens = new Set(
      (preferences || [])
        .filter(p => p.sms_enabled === true && p.sms_consent_given_at !== null)
        .map(p => p.guest_token)
    );

    const eligibleRecipients: Recipient[] = rsvps
      .filter(r => consentedTokens.has(r.guest_token) && r.guest_phone)
      .map(r => ({
        guest_name: r.guest_name,
        guest_phone: r.guest_phone!,
        country_code: r.country_code || 'US'
      }));

    if (eligibleRecipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No recipients with SMS consent found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending broadcast to ${eligibleRecipients.length} recipients for event ${event_id}`);

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('Missing Twilio credentials');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the message body
    const eventName = event.name || 'Your Event';
    const hostName = event.host_name || 'Your Host';
    const fullMessage = `${eventName}\n\n${message_text}\n\n---\nFrom: ${hostName}\nReply STOP to opt out`;

    // Send SMS to each recipient
    let successCount = 0;
    let failCount = 0;
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const authString = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    for (const recipient of eligibleRecipients) {
      try {
        // Format phone number
        let formattedPhone = recipient.guest_phone;
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = `+${formattedPhone.replace(/\D/g, '')}`;
        }

        const formData = new URLSearchParams();
        formData.append('To', formattedPhone);
        formData.append('From', twilioPhoneNumber);
        formData.append('Body', fullMessage);

        const twilioResponse = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        if (twilioResponse.ok) {
          successCount++;
          console.log(`SMS sent to ${recipient.guest_name}`);
        } else {
          const errorData = await twilioResponse.json();
          console.error(`Failed to send SMS to ${recipient.guest_name}:`, errorData);
          failCount++;
        }

        // Rate limiting: small delay between messages
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        console.error(`Error sending SMS to ${recipient.guest_name}:`, err);
        failCount++;
      }
    }

    // Log the broadcast
    const { error: broadcastError } = await supabase
      .from('sms_broadcasts')
      .insert({
        event_id,
        sent_by: user.id,
        target_audience,
        message_text,
        recipients_count: eligibleRecipients.length,
        successful_count: successCount,
        failed_count: failCount,
      });

    if (broadcastError) {
      console.error('Failed to log broadcast:', broadcastError);
    }

    // Increment broadcast count
    const { error: updateError } = await supabase
      .from('events')
      .update({ sms_broadcasts_sent: broadcastsSent + 1 })
      .eq('id', event_id);

    if (updateError) {
      console.error('Failed to update broadcast count:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        recipients_count: eligibleRecipients.length,
        successful_count: successCount,
        failed_count: failCount,
        broadcasts_remaining: broadcastLimit - broadcastsSent - 1
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Broadcast error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
