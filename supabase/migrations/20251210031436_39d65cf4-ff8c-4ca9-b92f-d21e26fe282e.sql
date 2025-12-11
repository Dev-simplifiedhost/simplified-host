-- Add SMS broadcast tracking columns to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS sms_broadcasts_sent integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS sms_broadcast_limit integer DEFAULT 3;

-- Create sms_broadcasts table to log broadcast history
CREATE TABLE public.sms_broadcasts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sent_by uuid NOT NULL,
  target_audience text NOT NULL CHECK (target_audience IN ('attending', 'maybe', 'attending_and_maybe', 'all_invited')),
  message_text text NOT NULL,
  recipients_count integer NOT NULL DEFAULT 0,
  successful_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_broadcasts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Event hosts can view their broadcasts
CREATE POLICY "Event hosts can view their broadcasts"
ON public.sms_broadcasts
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM events
  WHERE events.id = sms_broadcasts.event_id
  AND events.user_id = auth.uid()
));

-- RLS Policies: Event hosts can insert broadcasts
CREATE POLICY "Event hosts can insert broadcasts"
ON public.sms_broadcasts
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM events
  WHERE events.id = sms_broadcasts.event_id
  AND events.user_id = auth.uid()
));

-- Create index for faster lookups
CREATE INDEX idx_sms_broadcasts_event_id ON public.sms_broadcasts(event_id);

-- Function to increment broadcast count
CREATE OR REPLACE FUNCTION public.increment_sms_broadcast_count(p_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_count integer;
  v_limit integer;
BEGIN
  SELECT sms_broadcasts_sent, sms_broadcast_limit 
  INTO v_current_count, v_limit
  FROM events 
  WHERE id = p_event_id AND user_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Event not found or not authorized';
  END IF;
  
  IF v_current_count >= v_limit THEN
    RETURN false;
  END IF;
  
  UPDATE events 
  SET sms_broadcasts_sent = sms_broadcasts_sent + 1
  WHERE id = p_event_id;
  
  RETURN true;
END;
$$;