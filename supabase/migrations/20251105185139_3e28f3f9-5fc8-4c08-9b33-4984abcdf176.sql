-- Add dietary preference columns to rsvps table
ALTER TABLE rsvps 
ADD COLUMN IF NOT EXISTS dietary_preferences TEXT[],
ADD COLUMN IF NOT EXISTS dietary_other TEXT,
ADD COLUMN IF NOT EXISTS dietary_allergy TEXT;