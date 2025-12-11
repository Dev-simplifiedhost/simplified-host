-- Add require_email_for_rsvp setting to events table
ALTER TABLE public.events 
ADD COLUMN require_email_for_rsvp BOOLEAN DEFAULT false;