import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  eventId: string;
  guestId: string;
  reminderType: 'bulk_rsvp' | 'rsvp' | 'payment' | 'event_date' | 'item_claim';
  message: string;
  guestPhone: string;
  countryCode: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    // Get auth token from header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: RequestBody = await req.json();
    const { eventId, guestId, reminderType, message, guestPhone, countryCode } = body;

    console.log(`Processing ${reminderType} reminder for guest ${guestId} on event ${eventId}`);

    // Verify user owns the event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, user_id, single_reminders_sent, single_reminder_limit')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (event.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Not authorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check 24-hour guest limit (max 2 SMS per guest per day)
    const { data: limitCheck } = await supabase.rpc('check_guest_sms_limit', {
      p_event_id: eventId,
      p_guest_id: guestId,
    });

    if (limitCheck && !limitCheck.allowed) {
      console.log(`Daily limit reached for guest ${guestId}`);
      return new Response(
        JSON.stringify({ error: 'daily_limit_reached', details: limitCheck }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check event-level single reminder limit (for non-bulk reminders)
    if (reminderType !== 'bulk_rsvp') {
      if (event.single_reminders_sent >= event.single_reminder_limit) {
        console.log(`Single reminder limit reached for event ${eventId}`);
        return new Response(
          JSON.stringify({ error: 'single_limit_reached' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Format phone number
    let formattedPhone = guestPhone.replace(/\D/g, '');
    if (!formattedPhone.startsWith('+')) {
      // Add country code if not present
      const countryPrefix = countryCode === 'US' ? '1' : countryCode;
      if (!formattedPhone.startsWith(countryPrefix)) {
        formattedPhone = `+${countryPrefix}${formattedPhone}`;
      } else {
        formattedPhone = `+${formattedPhone}`;
      }
    }

    // Validate message length (155 char limit)
    if (message.length > 155) {
      return new Response(
        JSON.stringify({ error: 'Message exceeds 155 character limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add opt-out footer if there's room
    let finalMessage = message;
    const optOutText = ' Reply STOP to opt out.';
    if (message.length + optOutText.length <= 160) {
      finalMessage = message + optOutText;
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
        Body: finalMessage,
      }),
    });

    const twilioResult = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error('Twilio error:', twilioResult);
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS', details: twilioResult }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`SMS sent successfully. SID: ${twilioResult.sid}`);

    // Log to guest_sms_log
    await supabase.from('guest_sms_log').insert({
      event_id: eventId,
      guest_id: guestId,
      reminder_type: reminderType,
      message_text: message,
      character_count: message.length,
    });

    // Increment single reminder count for non-bulk
    if (reminderType !== 'bulk_rsvp') {
      await supabase
        .from('events')
        .update({ single_reminders_sent: event.single_reminders_sent + 1 })
        .eq('id', eventId);
    }

    // Log to sms_analytics
    await supabase.from('sms_analytics').insert({
      event_id: eventId,
      user_id: user.id,
      event_type: 'sms_sent',
      metadata: {
        type: reminderType,
        guestId,
        characterCount: message.length,
        timestamp: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: twilioResult.sid,
        remainingReminders: event.single_reminder_limit - event.single_reminders_sent - 1,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-guest-reminder:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
