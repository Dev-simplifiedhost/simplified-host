import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UnfulfilledEvent {
  event_id: string;
  event_name: string;
  host_email: string;
  unfulfilled_items: Array<{
    name: string;
    category: string;
    goal_quantity: number | null;
    current_quantity: number;
    goal_amount: number | null;
    current_amount: number;
    remaining_quantity: number;
    remaining_amount: number;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Checking for events with unfulfilled items...');

    // Call the database function to get events needing reminders
    const { data: events, error: fetchError } = await supabase
      .rpc('generate_item_followup_reminders');

    if (fetchError) {
      console.error('Error fetching events:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${events?.length || 0} events needing item reminders`);

    const results = [];

    // Create reminders for each event
    if (events && events.length > 0) {
      for (const event of events as UnfulfilledEvent[]) {
        console.log(`Creating reminder for event: ${event.event_name}`);

        try {
          const { data: reminderId, error: createError } = await supabase
            .rpc('create_item_reminder', {
              p_event_id: event.event_id,
              p_event_name: event.event_name,
              p_host_email: event.host_email,
              p_unfulfilled_items: event.unfulfilled_items,
            });

          if (createError) {
            console.error(`Error creating reminder for event ${event.event_name}:`, createError);
            results.push({
              event_id: event.event_id,
              event_name: event.event_name,
              status: 'error',
              error: createError.message,
            });
          } else {
            console.log(`Created reminder ${reminderId} for event ${event.event_name}`);
            results.push({
              event_id: event.event_id,
              event_name: event.event_name,
              reminder_id: reminderId,
              status: 'success',
              items_count: event.unfulfilled_items.length,
            });
          }
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          console.error(`Exception creating reminder for event ${event.event_name}:`, err);
          results.push({
            event_id: event.event_id,
            event_name: event.event_name,
            status: 'error',
            error: errorMessage,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error processing item reminders:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});