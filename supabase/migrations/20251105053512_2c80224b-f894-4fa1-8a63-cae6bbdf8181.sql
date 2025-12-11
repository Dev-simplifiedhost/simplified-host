-- Add fields to announcements table for enhanced functionality
ALTER TABLE public.announcements 
  ADD COLUMN title TEXT,
  ADD COLUMN category TEXT DEFAULT 'update' CHECK (category IN ('update', 'reminder', 'alert', 'thank_you')),
  ADD COLUMN is_pinned BOOLEAN DEFAULT false,
  ADD COLUMN visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'co_hosts_only')),
  ADD COLUMN scheduled_for TIMESTAMP WITH TIME ZONE,
  ADD COLUMN is_published BOOLEAN DEFAULT true,
  ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ADD COLUMN author_name TEXT;

-- Update trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Only allow one pinned announcement per event
CREATE UNIQUE INDEX idx_one_pinned_per_event ON public.announcements(event_id) 
WHERE is_pinned = true;

-- Trigger to log announcement activities
CREATE OR REPLACE FUNCTION public.log_announcement_activity()
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
  IF TG_OP = 'INSERT' AND NEW.is_published = true THEN
    INSERT INTO activities (user_id, event_id, activity_type, activity_data)
    VALUES (
      v_event_user_id,
      NEW.event_id,
      'announcement_posted',
      jsonb_build_object(
        'title', NEW.title,
        'message_preview', LEFT(NEW.message, 100),
        'event_name', v_event_name,
        'category', NEW.category
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER announcement_activity_trigger
AFTER INSERT ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.log_announcement_activity();