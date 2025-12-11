-- Create activities table for tracking all user actions
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_event_id ON public.activities(event_id);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX idx_activities_type ON public.activities(activity_type);

-- Enable Row Level Security
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Users can view their own activities
CREATE POLICY "Users can view their own activities"
ON public.activities
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert activities (we'll use triggers)
CREATE POLICY "System can insert activities"
ON public.activities
FOR INSERT
WITH CHECK (true);

-- Users can update their own activities (mark as read)
CREATE POLICY "Users can update their own activities"
ON public.activities
FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime for activities
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;

-- Create function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_event_id UUID,
  p_activity_type TEXT,
  p_activity_data JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activities (user_id, event_id, activity_type, activity_data)
  VALUES (p_user_id, p_event_id, p_activity_type, p_activity_data);
END;
$$;

-- Trigger function for RSVP activities
CREATE OR REPLACE FUNCTION public.log_rsvp_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_user_id UUID;
  v_event_name TEXT;
BEGIN
  -- Get event owner and name
  SELECT user_id, name INTO v_event_user_id, v_event_name
  FROM events WHERE id = NEW.event_id;

  -- Log activity for event host
  IF TG_OP = 'INSERT' THEN
    INSERT INTO activities (user_id, event_id, activity_type, activity_data)
    VALUES (
      v_event_user_id,
      NEW.event_id,
      'guest_rsvp',
      jsonb_build_object(
        'guest_name', NEW.guest_name,
        'rsvp_status', NEW.rsvp_status,
        'event_name', v_event_name
      )
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.rsvp_status != NEW.rsvp_status THEN
    INSERT INTO activities (user_id, event_id, activity_type, activity_data)
    VALUES (
      v_event_user_id,
      NEW.event_id,
      'guest_rsvp_changed',
      jsonb_build_object(
        'guest_name', NEW.guest_name,
        'old_status', OLD.rsvp_status,
        'new_status', NEW.rsvp_status,
        'event_name', v_event_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger function for item claim activities
CREATE OR REPLACE FUNCTION public.log_item_claim_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_user_id UUID;
  v_event_name TEXT;
BEGIN
  -- Get event owner and name
  SELECT user_id, name INTO v_event_user_id, v_event_name
  FROM events WHERE id = NEW.event_id;

  -- Log activity for event host
  IF TG_OP = 'UPDATE' THEN
    IF OLD.claimed_by IS NULL AND NEW.claimed_by IS NOT NULL THEN
      -- Item claimed
      INSERT INTO activities (user_id, event_id, activity_type, activity_data)
      VALUES (
        v_event_user_id,
        NEW.event_id,
        'item_claimed',
        jsonb_build_object(
          'item_name', NEW.name,
          'claimed_by', NEW.claimed_by_name,
          'event_name', v_event_name
        )
      );
    ELSIF OLD.claimed_by IS NOT NULL AND NEW.claimed_by IS NULL THEN
      -- Item unclaimed
      INSERT INTO activities (user_id, event_id, activity_type, activity_data)
      VALUES (
        v_event_user_id,
        NEW.event_id,
        'item_unclaimed',
        jsonb_build_object(
          'item_name', NEW.name,
          'event_name', v_event_name
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER rsvp_activity_trigger
AFTER INSERT OR UPDATE ON public.rsvps
FOR EACH ROW
EXECUTE FUNCTION public.log_rsvp_activity();

CREATE TRIGGER item_claim_activity_trigger
AFTER UPDATE ON public.event_items
FOR EACH ROW
EXECUTE FUNCTION public.log_item_claim_activity();