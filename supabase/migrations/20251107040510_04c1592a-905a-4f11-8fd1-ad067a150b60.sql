-- Update log_rsvp_activity function to include phone and email in activity_data
CREATE OR REPLACE FUNCTION public.log_rsvp_activity()
RETURNS TRIGGER AS $$
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
        'guest_email', NEW.guest_email,
        'guest_phone', NEW.guest_phone,
        'country_code', NEW.country_code,
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
        'guest_email', NEW.guest_email,
        'guest_phone', NEW.guest_phone,
        'country_code', NEW.country_code,
        'old_status', OLD.rsvp_status,
        'new_status', NEW.rsvp_status,
        'event_name', v_event_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;