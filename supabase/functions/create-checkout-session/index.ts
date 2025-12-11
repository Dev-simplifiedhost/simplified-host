import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.79.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLATFORM_FEE_PERCENT = 0.045; // 4.5%

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const {
      eventId,
      itemId,
      amount,
      contributorName,
      contributorEmail,
      successUrl,
      cancelUrl,
    } = await req.json();

    // Validate required fields
    if (!eventId || !amount || !contributorName || !successUrl || !cancelUrl) {
      throw new Error('Missing required fields');
    }

    // Get event and host info
    const { data: event, error: eventError } = await supabaseClient
      .from('events')
      .select('id, name, user_id, credit_card_payments_enabled')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      throw new Error('Event not found');
    }

    if (!event.credit_card_payments_enabled) {
      throw new Error('Credit card payments not enabled for this event');
    }

    // Get host's Stripe account
    const { data: hostProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_account_id, stripe_account_status')
      .eq('id', event.user_id)
      .single();

    if (profileError || !hostProfile?.stripe_account_id) {
      throw new Error('Host has not connected Stripe');
    }

    if (hostProfile.stripe_account_status !== 'complete') {
      throw new Error('Host Stripe account is not fully set up');
    }

    // Get item name if itemId provided
    let itemName = 'Event Contribution';
    if (itemId) {
      const { data: item } = await supabaseClient
        .from('event_items')
        .select('name')
        .eq('id', itemId)
        .single();
      if (item) {
        itemName = item.name;
      }
    }

    // Calculate amounts (amount is in dollars, Stripe uses cents)
    const amountCents = Math.round(amount * 100);
    const platformFeeCents = Math.round(amountCents * PLATFORM_FEE_PERCENT);

    // Create Stripe Checkout session
    // payment_method_types omitted to let Stripe auto-enable Apple Pay, Google Pay, etc.
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: itemName,
              description: `Contribution to ${event.name}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      customer_email: contributorEmail || undefined,
      payment_intent_data: {
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: hostProfile.stripe_account_id,
        },
        metadata: {
          event_id: eventId,
          item_id: itemId || '',
          contributor_name: contributorName,
          contributor_email: contributorEmail || '',
        },
      },
      metadata: {
        event_id: eventId,
        item_id: itemId || '',
        contributor_name: contributorName,
        contributor_email: contributorEmail || '',
      },
    });

    // Create pending payment record
    await supabaseClient
      .from('stripe_payments')
      .insert({
        event_id: eventId,
        stripe_checkout_session_id: session.id,
        amount_gross: amount,
        platform_fee: amount * PLATFORM_FEE_PERCENT,
        amount_net: amount * (1 - PLATFORM_FEE_PERCENT),
        status: 'pending',
        contributor_name: contributorName,
        contributor_email: contributorEmail || null,
      });

    console.log('Created checkout session:', session.id, 'for event:', eventId);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
