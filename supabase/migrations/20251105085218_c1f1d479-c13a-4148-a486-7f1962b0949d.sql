-- Add archive columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS archive_delay_days integer DEFAULT 1;

-- Create index for efficient querying of archived events
CREATE INDEX IF NOT EXISTS idx_events_is_archived ON public.events(is_archived);
CREATE INDEX IF NOT EXISTS idx_events_archived_at ON public.events(archived_at);

-- Add comment to explain the archive_delay_days column
COMMENT ON COLUMN public.events.archive_delay_days IS 'Number of days after event_date when the event should be automatically archived';