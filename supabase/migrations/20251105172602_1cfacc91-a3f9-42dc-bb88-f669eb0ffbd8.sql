-- Add country_code column to rsvps table
ALTER TABLE rsvps 
ADD COLUMN country_code text DEFAULT 'US';

-- Add country_code column to event_comments table
ALTER TABLE event_comments 
ADD COLUMN country_code text DEFAULT 'US';

-- Add country_code column to host_messages table
ALTER TABLE host_messages 
ADD COLUMN country_code text DEFAULT 'US';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_rsvps_country_code ON rsvps(country_code);
CREATE INDEX IF NOT EXISTS idx_event_comments_country_code ON event_comments(country_code);
CREATE INDEX IF NOT EXISTS idx_host_messages_country_code ON host_messages(country_code);