-- Add allow_plus_ones column to events table
ALTER TABLE public.events
ADD COLUMN allow_plus_ones BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.events.allow_plus_ones IS 'Controls whether guests can bring plus ones when RSVPing';