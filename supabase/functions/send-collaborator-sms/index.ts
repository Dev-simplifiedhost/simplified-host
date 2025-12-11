import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  invite_id: string;
  phone: string;
  country_code?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const { invite_id, phone, country_code = 'US' }: RequestBody = await req.json();

    if (!invite_id || !phone) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: invite_id and phone' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending collaborator invite SMS for invite: ${invite_id}`);

    // Get invite details with event info
    const { data: invite, error: inviteError } = await supabase
      .from('collaborator_invites')
      .select(`
        id,
        invite_token,
        email,
        name,
        event_id,
        invited_by
      `)
      .eq('id', invite_id)
      .single();

    if (inviteError || !invite) {
      console.error('Invite not found:', inviteError);
      return new Response(
        JSON.stringify({ error: 'Invite not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('name, host_name')
      .eq('id', invite.event_id)
      .single();

    if (eventError || !event) {
      console.error('Event not found:', eventError);
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get host profile name as fallback
    let hostName = event.host_name;
    if (!hostName && invite.invited_by) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', invite.invited_by)
        .single();
      hostName = profile?.display_name || 'Your friend';
    }

    // Build invite URL
    const baseUrl = Deno.env.get('SITE_URL') || 'https://simplifiedhost.com';
    const inviteUrl = `${baseUrl}/invite/${invite.invite_token}`;

    // Build SMS message (keep under 160 chars for single SMS)
    const eventNameShort = event.name.length > 30 ? event.name.substring(0, 27) + '...' : event.name;
    const hostNameShort = (hostName || 'Someone').length > 15 ? (hostName || 'Someone').substring(0, 12) + '...' : (hostName || 'Someone');
    
    const message = `${hostNameShort} invited you to help plan \"${eventNameShort}\". Accept here: ${inviteUrl}`;

    console.log(`SMS message (${message.length} chars): ${message}`);

    // Format phone number
    let formattedPhone = phone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('1') && country_code === 'US') {
      formattedPhone = '1' + formattedPhone;
    }
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: twilioPhoneNumber,
        Body: message,
      }),
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio error:', twilioResult);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send SMS', 
          details: twilioResult.message || 'Unknown error' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SMS sent successfully:', twilioResult.sid);

    // Update invite record with delivery info
    const { error: updateError } = await supabase
      .from('collaborator_invites')
      .update({
        phone: formattedPhone,
        delivery_method: 'sms',
        sms_sent_at: new Date().toISOString(),
      })
      .eq('id', invite_id);

    if (updateError) {
      console.error('Failed to update invite record:', updateError);
      // Don't fail the request, SMS was sent successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_sid: twilioResult.sid,
        phone: formattedPhone 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending collaborator SMS:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

