import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting auto-archive process...');

    // Get all non-archived events with event dates
    const { data: events, error: fetchError } = await supabase
      .from('events')
      .select('id, name, event_date, archive_delay_days, is_archived')
      .eq('is_archived', false)
      .not('event_date', 'is', null);

    if (fetchError) {
      console.error('Error fetching events:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${events?.length || 0} non-archived events`);

    const now = new Date();
    const eventsToArchive: string[] = [];

    // Check each event to see if it should be archived
    for (const event of events || []) {
      const eventDate = new Date(event.event_date);
      const archiveDelayDays = event.archive_delay_days || 1;
      const archiveDate = new Date(eventDate);
      archiveDate.setDate(archiveDate.getDate() + archiveDelayDays);

      // If current date is past the archive date, mark for archiving
      if (now >= archiveDate) {
        eventsToArchive.push(event.id);
        console.log(`Event "${event.name}" (${event.id}) will be archived`);
      }
    }

    console.log(`Archiving ${eventsToArchive.length} events`);

    // Archive the events
    if (eventsToArchive.length > 0) {
      const { error: updateError } = await supabase
        .from('events')
        .update({
          is_archived: true,
          archived_at: now.toISOString(),
        })
        .in('id', eventsToArchive);

      if (updateError) {
        console.error('Error archiving events:', updateError);
        throw updateError;
      }
    }

    const result = {
      success: true,
      archivedCount: eventsToArchive.length,
      timestamp: now.toISOString(),
    };

    console.log('Auto-archive completed:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Auto-archive error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
