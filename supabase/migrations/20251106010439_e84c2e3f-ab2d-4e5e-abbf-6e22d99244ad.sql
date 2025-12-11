-- Fix 1: Add SET search_path to get_default_permissions function for security best practices
CREATE OR REPLACE FUNCTION get_default_permissions(_role collaborator_role)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN CASE _role
    WHEN 'co_host' THEN '{
      "manage_rsvps": true,
      "manage_items": true,
      "post_announcements": true,
      "send_reminders": true,
      "view_contributions": true,
      "edit_event_details": true,
      "manage_payments": true,
      "invite_others": true,
      "export_data": true,
      "delete_content": true
    }'::jsonb
    WHEN 'editor' THEN '{
      "manage_rsvps": true,
      "manage_items": true,
      "post_announcements": true,
      "send_reminders": true,
      "view_contributions": false,
      "edit_event_details": true,
      "manage_payments": false,
      "invite_others": false,
      "export_data": true,
      "delete_content": false
    }'::jsonb
    WHEN 'viewer' THEN '{
      "manage_rsvps": false,
      "manage_items": false,
      "post_announcements": false,
      "send_reminders": false,
      "view_contributions": false,
      "edit_event_details": false,
      "manage_payments": false,
      "invite_others": false,
      "export_data": false,
      "delete_content": false
    }'::jsonb
    ELSE '{}'::jsonb
  END;
END;
$$;

-- Fix 2: Restrict RSVP SELECT access to protect guest contact information (CRITICAL PRIVACY FIX)
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view RSVPs" ON public.rsvps;

-- Event owners can view all RSVPs for their events
CREATE POLICY "Event owners can view RSVPs"
ON public.rsvps
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = rsvps.event_id
    AND events.user_id = auth.uid()
  )
);

-- Event collaborators with permissions can view RSVPs
CREATE POLICY "Event collaborators can view RSVPs"
ON public.rsvps
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM event_collaborators ec
    WHERE ec.event_id = rsvps.event_id
    AND ec.user_id = auth.uid()
    AND ec.status = 'active'
    AND (ec.expires_at IS NULL OR ec.expires_at > now())
    AND (ec.permissions->>'manage_rsvps')::boolean = true
  )
);

-- Create a public function to get sanitized guest list (names and RSVP status only, no PII)
-- This allows public guest list viewing when the host enables it, without exposing contact info
CREATE OR REPLACE FUNCTION public.get_public_guest_list(p_event_id uuid)
RETURNS TABLE (
  guest_name text,
  rsvp_status text,
  plus_one_name text,
  dietary_preferences text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    rsvps.guest_name,
    rsvps.rsvp_status,
    rsvps.plus_one_name,
    rsvps.dietary_preferences
  FROM rsvps
  JOIN events ON events.id = rsvps.event_id
  WHERE rsvps.event_id = p_event_id
    AND events.show_guest_list = true
    AND rsvps.rsvp_status IN ('attending', 'maybe')
  ORDER BY rsvps.created_at DESC;
$$;

COMMENT ON FUNCTION public.get_public_guest_list IS 'Returns sanitized guest list (no email/phone) for events where show_guest_list is enabled';