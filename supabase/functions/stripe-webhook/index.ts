import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
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
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    
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

    const body = await req.text();
    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get('stripe-signature');
      if (!signature) {
        throw new Error('Missing Stripe signature');
      }
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      // For development, parse without verification
      event = JSON.parse(body);
    }

    console.log('Received Stripe webhook:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Update stripe_payments record
        const { data: payment, error: paymentError } = await supabaseClient
          .from('stripe_payments')
          .update({
            status: 'succeeded',
            stripe_payment_intent_id: session.payment_intent as string,
            completed_at: new Date().toISOString(),
          })
          .eq('stripe_checkout_session_id', session.id)
          .select()
          .single();

        if (paymentError) {
          console.error('Error updating stripe_payments:', paymentError);
        }

        // Create item_claim record if this is for a specific item
        const metadata = session.metadata || {};
        const eventId = metadata.event_id;
        const itemId = metadata.item_id;
        const contributorName = metadata.contributor_name;
        const contributorEmail = metadata.contributor_email;
        const amountTotal = (session.amount_total || 0) / 100;

        if (eventId) {
          // Create item_claim record
          const claimData: any = {
            event_id: eventId,
            claim_type: 'monetary',
            contributor_name: contributorName || 'Card Payment',
            contributor_email: contributorEmail || null,
            amount_contributed: amountTotal,
            payment_verified: true,
            verified_at: new Date().toISOString(),
            payment_method: 'stripe',
            stripe_checkout_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent as string,
          };

          if (itemId) {
            claimData.item_id = itemId;
          } else {
            // Find a general contribution item or create one
            const { data: generalItem } = await supabaseClient
              .from('event_items')
              .select('id')
              .eq('event_id', eventId)
              .eq('goal_type', 'monetary')
              .limit(1)
              .single();

            if (generalItem) {
              claimData.item_id = generalItem.id;
            }
          }

          if (claimData.item_id) {
            const { error: claimError } = await supabaseClient
              .from('item_claims')
              .insert(claimData);

            if (claimError) {
              console.error('Error creating item_claim:', claimError);
            }
          }

          // Also add to contributions table
          await supabaseClient
            .from('contributions')
            .insert({
              event_id: eventId,
              contributor_name: contributorName || 'Card Payment',
              amount: amountTotal,
              payment_method: 'card',
              note: `Paid via Stripe (${session.id})`,
            });

          console.log('Payment completed for event:', eventId, 'amount:', amountTotal);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Update payment status to failed
        await supabaseClient
          .from('stripe_payments')
          .update({ status: 'failed' })
          .eq('stripe_checkout_session_id', session.id);
        
        console.log('Checkout session expired:', session.id);
        break;
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const userId = account.metadata?.user_id;
        
        if (userId) {
          // Check if account is fully set up
          const chargesEnabled = account.charges_enabled;
          const payoutsEnabled = account.payouts_enabled;
          const detailsSubmitted = account.details_submitted;
          
          let status = 'pending';
          if (chargesEnabled && payoutsEnabled && detailsSubmitted) {
            status = 'complete';
          } else if (account.requirements?.disabled_reason) {
            status = 'restricted';
          }

          await supabaseClient
            .from('profiles')
            .update({ stripe_account_status: status })
            .eq('id', userId);

          console.log('Updated Stripe account status for user:', userId, 'status:', status);
        }
        break;
      }

      default:
        console.log('Unhandled webhook event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
