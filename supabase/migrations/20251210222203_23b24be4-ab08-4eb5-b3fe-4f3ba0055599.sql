-- Add suggested_count and suggested_by array fields to event_items
ALTER TABLE public.event_items 
ADD COLUMN IF NOT EXISTS suggested_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS suggested_by text[] DEFAULT '{}'::text[];