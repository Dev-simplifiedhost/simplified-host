-- Drop the insecure RSVP update policy
DROP POLICY IF EXISTS "Guests can update their own RSVPs" ON public.rsvps;

-- Create security definer function to validate guest token
CREATE OR REPLACE FUNCTION public.can_update_rsvp(_rsvp_id uuid, _guest_token uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rsvps
    WHERE id = _rsvp_id
      AND guest_token = _guest_token
  )
$$;

-- Create audit log table for RSVP changes
CREATE TABLE IF NOT EXISTS public.rsvp_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rsvp_id uuid NOT NULL REFERENCES public.rsvps(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  changed_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  old_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  new_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Enable RLS on audit log
ALTER TABLE public.rsvp_audit_log ENABLE ROW LEVEL SECURITY;

-- Event owners can view audit logs
CREATE POLICY "Event owners can view RSVP audit logs"
ON public.rsvp_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = rsvp_audit_log.event_id
      AND events.user_id = auth.uid()
  )
);

-- System can insert audit logs
CREATE POLICY "System can insert RSVP audit logs"
ON public.rsvp_audit_log
FOR INSERT
WITH CHECK (true);

-- Create trigger function to log RSVP updates
CREATE OR REPLACE FUNCTION public.log_rsvp_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed_fields jsonb := '{}'::jsonb;
  v_old_values jsonb := '{}'::jsonb;
  v_new_values jsonb := '{}'::jsonb;
BEGIN
  -- Track which fields changed
  IF OLD.rsvp_status IS DISTINCT FROM NEW.rsvp_status THEN
    v_changed_fields := v_changed_fields || jsonb_build_object('rsvp_status', true);
    v_old_values := v_old_values || jsonb_build_object('rsvp_status', OLD.rsvp_status);
    v_new_values := v_new_values || jsonb_build_object('rsvp_status', NEW.rsvp_status);
  END IF;
  
  IF OLD.guest_name IS DISTINCT FROM NEW.guest_name THEN
    v_changed_fields := v_changed_fields || jsonb_build_object('guest_name', true);
    v_old_values := v_old_values || jsonb_build_object('guest_name', OLD.guest_name);
    v_new_values := v_new_values || jsonb_build_object('guest_name', NEW.guest_name);
  END IF;
  
  IF OLD.guest_email IS DISTINCT FROM NEW.guest_email THEN
    v_changed_fields := v_changed_fields || jsonb_build_object('guest_email', true);
    v_old_values := v_old_values || jsonb_build_object('guest_email', OLD.guest_email);
    v_new_values := v_new_values || jsonb_build_object('guest_email', NEW.guest_email);
  END IF;
  
  IF OLD.guest_phone IS DISTINCT FROM NEW.guest_phone THEN
    v_changed_fields := v_changed_fields || jsonb_build_object('guest_phone', true);
    v_old_values := v_old_values || jsonb_build_object('guest_phone', OLD.guest_phone);
    v_new_values := v_new_values || jsonb_build_object('guest_phone', NEW.guest_phone);
  END IF;

  IF OLD.dietary_preferences IS DISTINCT FROM NEW.dietary_preferences THEN
    v_changed_fields := v_changed_fields || jsonb_build_object('dietary_preferences', true);
    v_old_values := v_old_values || jsonb_build_object('dietary_preferences', OLD.dietary_preferences);
    v_new_values := v_new_values || jsonb_build_object('dietary_preferences', NEW.dietary_preferences);
  END IF;

  -- Log the change if any fields were modified
  IF v_changed_fields != '{}'::jsonb THEN
    INSERT INTO public.rsvp_audit_log (
      rsvp_id,
      event_id,
      changed_fields,
      old_values,
      new_values
    ) VALUES (
      NEW.id,
      NEW.event_id,
      v_changed_fields,
      v_old_values,
      v_new_values
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to rsvps table
DROP TRIGGER IF EXISTS log_rsvp_update_trigger ON public.rsvps;
CREATE TRIGGER log_rsvp_update_trigger
AFTER UPDATE ON public.rsvps
FOR EACH ROW
EXECUTE FUNCTION public.log_rsvp_update();

-- Create secure RSVP update policy with guest_token validation
CREATE POLICY "Guests can update RSVPs with valid token"
ON public.rsvps
FOR UPDATE
USING (public.can_update_rsvp(id, guest_token))
WITH CHECK (public.can_update_rsvp(id, guest_token));