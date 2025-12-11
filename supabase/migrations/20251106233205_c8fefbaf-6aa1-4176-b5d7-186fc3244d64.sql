-- Add setting to control email requirement for host messages
ALTER TABLE public.events 
ADD COLUMN require_email_for_messages BOOLEAN DEFAULT false;