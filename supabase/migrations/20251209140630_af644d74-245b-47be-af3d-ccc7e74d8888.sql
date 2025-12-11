-- Add link_url column to event_items table for external product links
ALTER TABLE public.event_items 
ADD COLUMN link_url text;