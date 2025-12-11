-- Add pwac_share_token column to events table for sharing PWAC plans
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS pwac_share_token TEXT UNIQUE;

-- Create index for fast lookups by share token
CREATE INDEX IF NOT EXISTS idx_events_pwac_share_token ON public.events(pwac_share_token);

-- RLS policy already allows public SELECT on events, so shared plans are accessible