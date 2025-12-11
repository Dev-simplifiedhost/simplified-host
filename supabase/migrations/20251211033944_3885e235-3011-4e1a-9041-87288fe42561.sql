-- Add show_needs_most_hint column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS show_needs_most_hint BOOLEAN DEFAULT true;