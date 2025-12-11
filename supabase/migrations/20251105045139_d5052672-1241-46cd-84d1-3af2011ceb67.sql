-- Add draft and autosave support to events table
ALTER TABLE public.events 
ADD COLUMN is_draft boolean DEFAULT true,
ADD COLUMN auto_saved_at timestamp with time zone,
ADD COLUMN published_at timestamp with time zone;

-- Update existing events to be published (not drafts)
UPDATE public.events SET is_draft = false, published_at = created_at WHERE is_draft IS NULL;