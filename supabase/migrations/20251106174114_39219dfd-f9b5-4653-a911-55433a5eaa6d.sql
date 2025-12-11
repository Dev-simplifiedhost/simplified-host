-- Add max_plus_ones column to events table
ALTER TABLE public.events 
ADD COLUMN max_plus_ones integer DEFAULT NULL;

COMMENT ON COLUMN public.events.max_plus_ones IS 'Maximum number of additional guests allowed per RSVP. NULL means unlimited when allow_plus_ones is true.';

-- Change allow_plus_ones default to false
ALTER TABLE public.events 
ALTER COLUMN allow_plus_ones SET DEFAULT false;

-- Migrate plus_one_name to additional_guests (jsonb array)
-- First, add the new column
ALTER TABLE public.rsvps 
ADD COLUMN additional_guests jsonb DEFAULT '[]'::jsonb;

-- Migrate existing data: convert single plus_one_name to array format
UPDATE public.rsvps 
SET additional_guests = jsonb_build_array(plus_one_name)
WHERE plus_one_name IS NOT NULL AND plus_one_name != '';

-- Drop the old column
ALTER TABLE public.rsvps 
DROP COLUMN plus_one_name;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_rsvps_additional_guests ON public.rsvps USING GIN (additional_guests);

COMMENT ON COLUMN public.rsvps.additional_guests IS 'Array of additional guest names brought by the primary guest.';