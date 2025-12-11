-- Add phone number and delivery tracking columns to collaborator_invites
ALTER TABLE collaborator_invites 
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS delivery_method text DEFAULT 'link_only',
ADD COLUMN IF NOT EXISTS sms_sent_at timestamptz;

-- Update default expiry to 48 hours for new invites
ALTER TABLE collaborator_invites 
ALTER COLUMN expires_at SET DEFAULT (now() + '48 hours'::interval);