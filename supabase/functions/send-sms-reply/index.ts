import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the JWT and get the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message_id, event_id, reply_text } = await req.json();

    // Validate inputs
    if (!message_id || !event_id || !reply_text) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: message_id, event_id, reply_text' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate reply length (SMS limit: 1600 chars for concatenated messages)
    if (reply_text.length > 1600) {
      return new Response(
        JSON.stringify({ error: 'Reply text exceeds 1600 character limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing SMS reply for message ${message_id} from user ${user.id}`);

    // Verify user owns the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('name, user_id')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      console.error('Event not found:', eventError);
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (event.user_id !== user.id) {
      console.error(`User ${user.id} does not own event ${event_id}`);
      return new Response(
        JSON.stringify({ error: 'You do not have permission to reply to messages for this event' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the original message details
    const { data: message, error: messageError } = await supabase
      .from('host_messages')
      .select('sender_name, sender_phone, country_code, message_body')
      .eq('id', message_id)
      .single();

    if (messageError || !message) {
      console.error('Message not found:', messageError);
      return new Response(
        JSON.stringify({ error: 'Original message not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check
    const { data: rateLimitCheck } = await supabase.rpc('check_rate_limit', {
      p_identifier: user.id,
      p_endpoint: 'send-sms-reply',
      p_max_requests: 10,
      p_window_minutes: 10,
    });

    if (rateLimitCheck && !rateLimitCheck.allowed) {
      console.log(`Rate limit exceeded for user ${user.id}`);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please wait before sending another SMS.',
          retryAfter: rateLimitCheck.blocked_until
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number for Twilio (ensure it starts with +)
    let toPhone = message.sender_phone;
    if (!toPhone.startsWith('+')) {
      // Add + and country code if not present
      const countryCode = message.country_code || 'US';
      const countryCodeMap: Record<string, string> = {
        'US': '1', 'CA': '1', 'GB': '44', 'AU': '61', 'IN': '91',
        'DE': '49', 'FR': '33', 'JP': '81', 'CN': '86'
      };
      const code = countryCodeMap[countryCode] || '1';
      toPhone = `+${code}${toPhone.replace(/\D/g, '')}`;
    }

    // Verify guest has opted in to SMS
    console.log(`Checking SMS consent for phone: ${message.sender_phone}`);
    const { data: consentCheck } = await supabase.rpc('check_sms_consent_global', {
      p_phone: message.sender_phone,
      p_country_code: message.country_code || 'US'
    });

    if (!consentCheck) {
      console.error('Guest has not opted in to SMS notifications');
      return new Response(
        JSON.stringify({
          error: 'Guest has not opted in to SMS notifications. They must provide their phone number and consent before receiving SMS.'
        }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('SMS consent verified ✓');

    // Format SMS message with context
    const originalMessagePreview = message.message_body.substring(0, 50);
    const smsBody = `${event.name} - Reply from Host:\n\n${reply_text}\n\n---\nRe: "${originalMessagePreview}${message.message_body.length > 50 ? '...' : ''}"\n\nReply STOP to opt out`;

    console.log(`Sending SMS to ${toPhone}. Message length: ${smsBody.length} chars`);

    // Get Twilio credentials from environment
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('Missing Twilio credentials');
      return new Response(
        JSON.stringify({ error: 'SMS service not configured. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        To: toPhone,
        From: twilioPhoneNumber,
        Body: smsBody,
      }),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio error:', twilioData);
      return new Response(
        JSON.stringify({
          error: 'Failed to send SMS',
          details: twilioData.message || 'Unknown error from SMS provider'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('SMS sent successfully. Twilio SID:', twilioData.sid);

    // Save the reply to database
    const { data: reply, error: replyError } = await supabase
      .from('host_message_replies')
      .insert({
        message_id,
        event_id,
        reply_text,
        sent_via: 'sms',
        delivery_status: twilioData.status || 'sent',
        twilio_sid: twilioData.sid,
        created_by: user.id,
      })
      .select()
      .single();

    if (replyError) {
      console.error('Error saving reply to database:', replyError);
      // SMS was sent but we couldn't save to DB - still return success
      return new Response(
        JSON.stringify({
          success: true,
          warning: 'SMS sent but failed to save to database',
          twilio_sid: twilioData.sid,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Reply saved to database with ID:', reply.id);

    return new Response(
      JSON.stringify({
        success: true,
        reply_id: reply.id,
        twilio_sid: twilioData.sid,
        delivery_status: twilioData.status,
        segments: twilioData.num_segments || 1,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-sms-reply function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
