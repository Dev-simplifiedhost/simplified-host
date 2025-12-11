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

    const { claim_id, event_id, contributor_name, contributor_phone, country_code, amount, payment_method, payment_handle, host_name, event_name } = await req.json();

    // Validate inputs
    if (!claim_id || !event_id || !contributor_phone) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: claim_id, event_id, contributor_phone' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing payment reminder for claim ${claim_id} from user ${user.id}`);

    // Verify user owns the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('name, user_id, host_name')
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
        JSON.stringify({ error: 'You do not have permission to send reminders for this event' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting check
    const { data: rateLimitCheck } = await supabase.rpc('check_rate_limit', {
      p_identifier: user.id,
      p_endpoint: 'send-payment-reminder',
      p_max_requests: 10,
      p_window_minutes: 10,
    });

    if (rateLimitCheck && !rateLimitCheck.allowed) {
      console.log(`Rate limit exceeded for user ${user.id}`);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please wait before sending another reminder.',
          retryAfter: rateLimitCheck.blocked_until
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number for Twilio (ensure it starts with +)
    let toPhone = contributor_phone;
    if (!toPhone.startsWith('+')) {
      const countryCodeVal = country_code || 'US';
      const countryCodeMap: Record<string, string> = {
        'US': '1', 'CA': '1', 'GB': '44', 'AU': '61', 'IN': '91',
        'DE': '49', 'FR': '33', 'JP': '81', 'CN': '86'
      };
      const code = countryCodeMap[countryCodeVal] || '1';
      toPhone = `+${code}${toPhone.replace(/\D/g, '')}`;
    }

    // Format SMS message
    const formattedAmount = amount ? `$${Number(amount).toFixed(2)}` : 'your contribution';
    const paymentInfo = payment_method && payment_handle 
      ? `You can send via ${payment_method} to ${payment_handle}.` 
      : 'Please check the event page for payment details.';
    
    const smsBody = `Hi ${contributor_name || 'there'}, just a quick reminder about ${formattedAmount} for ${event_name || event.name}. ${paymentInfo} Thank you! – ${host_name || event.host_name || 'Host'}\n\nReply STOP to opt out`;

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

    console.log('Payment reminder SMS sent successfully. Twilio SID:', twilioData.sid);

    return new Response(
      JSON.stringify({
        success: true,
        twilio_sid: twilioData.sid,
        delivery_status: twilioData.status,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-payment-reminder function:', error);
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
