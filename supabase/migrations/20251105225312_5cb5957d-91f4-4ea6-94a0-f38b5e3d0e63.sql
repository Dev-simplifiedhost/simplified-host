-- Add serves_per_unit column to event_items table
ALTER TABLE public.event_items 
ADD COLUMN serves_per_unit integer DEFAULT NULL;

COMMENT ON COLUMN public.event_items.serves_per_unit IS 'How many people one unit of this item serves (optional)';