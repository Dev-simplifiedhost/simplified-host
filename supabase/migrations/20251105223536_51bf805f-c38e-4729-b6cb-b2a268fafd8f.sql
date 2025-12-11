
-- Add dietary_other column to event_items table
ALTER TABLE public.event_items
ADD COLUMN IF NOT EXISTS dietary_other text;

COMMENT ON COLUMN public.event_items.dietary_other IS 'Free text field for additional dietary restrictions not covered by dietary_tags';
