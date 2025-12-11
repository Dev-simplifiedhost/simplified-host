-- Add comprehensive event fields
ALTER TABLE public.events 
ADD COLUMN start_time time,
ADD COLUMN end_time time,
ADD COLUMN is_all_day boolean DEFAULT false,
ADD COLUMN host_name text,
ADD COLUMN rsvp_deadline timestamp with time zone,
ADD COLUMN max_attendees integer,
ADD COLUMN privacy_setting text DEFAULT 'public' CHECK (privacy_setting IN ('public', 'invite_only')),
ADD COLUMN parking_instructions text,
ADD COLUMN accessibility_info text,
ADD COLUMN dress_code text,
ADD COLUMN special_requests text,
ADD COLUMN theme_color text DEFAULT 'default',
ADD COLUMN contribution_methods jsonb DEFAULT '[]'::jsonb,
ADD COLUMN contribution_message text,
ADD COLUMN date_updated_at timestamp with time zone;

-- Add constraint: RSVP deadline should be before event date
-- Using a validation trigger instead of CHECK constraint to avoid immutability issues
CREATE OR REPLACE FUNCTION public.validate_event_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate RSVP deadline is before event date
  IF NEW.rsvp_deadline IS NOT NULL AND NEW.event_date IS NOT NULL THEN
    IF NEW.rsvp_deadline > NEW.event_date THEN
      RAISE EXCEPTION 'RSVP deadline cannot be after the event date';
    END IF;
  END IF;
  
  -- Validate end time is after start time
  IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
    IF NEW.end_time <= NEW.start_time THEN
      RAISE EXCEPTION 'End time must be after start time';
    END IF;
  END IF;
  
  -- Track date changes for guest notifications
  IF TG_OP = 'UPDATE' AND OLD.event_date IS DISTINCT FROM NEW.event_date THEN
    NEW.date_updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_event_dates_trigger
BEFORE INSERT OR UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.validate_event_dates();

-- Set default RSVP deadline to 3 days before event
CREATE OR REPLACE FUNCTION public.set_default_rsvp_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rsvp_deadline IS NULL AND NEW.event_date IS NOT NULL THEN
    NEW.rsvp_deadline := NEW.event_date - INTERVAL '3 days';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_default_rsvp_deadline_trigger
BEFORE INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.set_default_rsvp_deadline();