-- Add new columns for enhanced wizard features
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS event_type TEXT,
ADD COLUMN IF NOT EXISTS show_guest_list BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS welcome_announcement TEXT;