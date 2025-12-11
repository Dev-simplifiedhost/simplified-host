-- Create a SECURITY DEFINER function to safely update an RSVP by guest token
-- This avoids client-side RLS limitations while still validating the token matches the row
CREATE OR REPLACE FUNCTION public.update_my_rsvp(
  p_event_id uuid,
  p_guest_token uuid,
  p_guest_name text,
  p_guest_email text,
  p_guest_phone text,
  p_country_code text,
  p_rsvp_status text,
  p_message text,
  p_additional_guests jsonb,
  p_dietary_preferences text[],
  p_dietary_other text,
  p_dietary_allergy text
) RETURNS rsvps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rsvp rsvps;
BEGIN
  -- Update the RSVP row that matches event and guest token
  UPDATE public.rsvps r
  SET 
    guest_name = p_guest_name,
    guest_email = NULLIF(p_guest_email, '')::text,
    guest_phone = p_guest_phone,
    country_code = p_country_code,
    rsvp_status = p_rsvp_status,
    message = NULLIF(p_message, '')::text,
    additional_guests = COALESCE(p_additional_guests, '[]'::jsonb),
    dietary_preferences = COALESCE(p_dietary_preferences, '{}'),
    dietary_other = NULLIF(p_dietary_other, '')::text,
    dietary_allergy = NULLIF(p_dietary_allergy, '')::text,
    updated_at = now()
  WHERE r.event_id = p_event_id
    AND r.guest_token = p_guest_token
  RETURNING r.* INTO v_rsvp;

  IF v_rsvp.id IS NULL THEN
    RAISE EXCEPTION 'RSVP not found for provided token' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_rsvp;
END;
$$;