-- Phase 1: Database Schema Updates for Free-Tier Messaging System

-- 1.1 Add single reminder tracking to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS single_reminders_sent integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS single_reminder_limit integer DEFAULT 2;

-- 1.2 Create guest_sms_log table for 24-hour protection limit
CREATE TABLE IF NOT EXISTS public.guest_sms_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.rsvps(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('bulk_rsvp', 'rsvp', 'payment', 'event_date', 'item_claim')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  message_text text,
  character_count integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast 24-hour lookups
CREATE INDEX IF NOT EXISTS idx_guest_sms_log_recent 
ON public.guest_sms_log(event_id, guest_id, sent_at DESC);

-- Enable RLS
ALTER TABLE public.guest_sms_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for guest_sms_log
CREATE POLICY "Event hosts can view SMS logs"
ON public.guest_sms_log
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM events
  WHERE events.id = guest_sms_log.event_id
  AND events.user_id = auth.uid()
));

CREATE POLICY "System can insert SMS logs"
ON public.guest_sms_log
FOR INSERT
WITH CHECK (true);

-- 1.3 Create sms_analytics table for PRD-required analytics tracking
CREATE TABLE IF NOT EXISTS public.sms_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('sms_sent', 'sms_limit_paywall_shown', 'cta_clicked')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS idx_sms_analytics_user_event 
ON public.sms_analytics(user_id, event_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.sms_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for sms_analytics
CREATE POLICY "Users can view own analytics"
ON public.sms_analytics
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics"
ON public.sms_analytics
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 1.4 Helper function to check 24-hour guest SMS limit
CREATE OR REPLACE FUNCTION public.check_guest_sms_limit(
  p_event_id uuid,
  p_guest_id uuid,
  p_max_per_day integer DEFAULT 2
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
  v_last_sent timestamptz;
BEGIN
  SELECT COUNT(*), MAX(sent_at)
  INTO v_count, v_last_sent
  FROM guest_sms_log
  WHERE event_id = p_event_id
    AND guest_id = p_guest_id
    AND sent_at > (now() - INTERVAL '24 hours');
  
  RETURN jsonb_build_object(
    'allowed', v_count < p_max_per_day,
    'sent_today', COALESCE(v_count, 0),
    'remaining', GREATEST(0, p_max_per_day - COALESCE(v_count, 0)),
    'last_sent', v_last_sent
  );
END;
$$;

-- 1.5 Function to increment single reminder count and check limit
CREATE OR REPLACE FUNCTION public.increment_single_reminder_count(p_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_count integer;
  v_limit integer;
BEGIN
  SELECT single_reminders_sent, single_reminder_limit 
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
  SET single_reminders_sent = single_reminders_sent + 1
  WHERE id = p_event_id;
  
  RETURN true;
END;
$$;