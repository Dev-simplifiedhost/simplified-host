-- Add new event settings for UI customization
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS enable_activity_feed BOOLEAN DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS enable_comments BOOLEAN DEFAULT true;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS items_section_label TEXT DEFAULT 'bring_something';