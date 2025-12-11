import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse Twilio webhook body (form-encoded)
    const formData = await req.formData();
    const messageBody = formData.get('Body')?.toString().toLowerCase() || '';
    const fromNumber = formData.get('From')?.toString() || '';
    const messageStatus = formData.get('SmsStatus')?.toString() || '';
    const messageSid = formData.get('MessageSid')?.toString() || '';

    console.log('Twilio webhook received:', {
      from: fromNumber,
      body: messageBody,
      status: messageStatus,
      sid: messageSid
    });

    // Clean phone number (remove + prefix)
    const cleanedPhone = fromNumber.replace('+', '');

    // Handle STOP/UNSUBSCRIBE messages
    if (['stop', 'stopall', 'unsubscribe', 'cancel', 'end', 'quit'].includes(messageBody.trim())) {
      console.log(`Processing opt-out for ${fromNumber}`);
      
      // Update all guest_preferences for this phone number
      const { data, error } = await supabaseClient
        .from('guest_preferences')
        .update({
          sms_enabled: false,
          unsubscribed_at: new Date().toISOString()
        })
        .eq('guest_phone', cleanedPhone)
        .select();

      if (error) {
        console.error('Error updating opt-out:', error);
        throw error;
      }

      console.log(`Opted out ${data?.length || 0} records for ${fromNumber}`);

      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { 
          headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
          status: 200
        }
      );
    }

    // Handle START/SUBSCRIBE messages
    if (['start', 'yes', 'unstop'].includes(messageBody.trim())) {
      console.log(`Processing opt-in for ${fromNumber}`);
      
      const { data, error } = await supabaseClient
        .from('guest_preferences')
        .update({
          sms_enabled: true,
          sms_consent_given_at: new Date().toISOString(),
          unsubscribed_at: null
        })
        .eq('guest_phone', cleanedPhone)
        .select();

      if (error) {
        console.error('Error updating opt-in:', error);
        throw error;
      }

      console.log(`Opted in ${data?.length || 0} records for ${fromNumber}`);
    }

    // Handle delivery status updates
    if (messageStatus && messageSid) {
      console.log(`Updating delivery status for message ${messageSid}: ${messageStatus}`);
      
      // Update delivery status in host_message_replies
      const { error } = await supabaseClient
        .from('host_message_replies')
        .update({ delivery_status: messageStatus })
        .eq('twilio_sid', messageSid);

      if (error) {
        console.error('Error updating delivery status:', error);
      }
    }

    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { 
        headers: { ...corsHeaders, 'Content-Type': 'text/xml' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
