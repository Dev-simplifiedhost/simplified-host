-- Create secure function to handle comment posting from guests
CREATE OR REPLACE FUNCTION public.post_public_comment(
  p_event_id UUID,
  p_guest_token UUID,
  p_commenter_name TEXT,
  p_commenter_email TEXT,
  p_comment_text TEXT,
  p_guest_phone TEXT,
  p_country_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rsvp_id UUID;
  v_comment_id UUID;
BEGIN
  -- Find and validate the RSVP
  SELECT id INTO v_rsvp_id
  FROM public.rsvps
  WHERE event_id = p_event_id
    AND guest_token = p_guest_token
    AND rsvp_status IN ('attending', 'maybe')
  LIMIT 1;

  -- If no valid RSVP found, raise error
  IF v_rsvp_id IS NULL THEN
    RAISE EXCEPTION 'You must RSVP as Attending or Maybe to post comments' USING ERRCODE = 'P0001';
  END IF;

  -- Insert the comment
  INSERT INTO public.event_comments (
    event_id,
    rsvp_id,
    commenter_name,
    commenter_email,
    comment_text,
    guest_phone,
    country_code,
    status
  ) VALUES (
    p_event_id,
    v_rsvp_id,
    p_commenter_name,
    NULLIF(p_commenter_email, ''),
    p_comment_text,
    p_guest_phone,
    p_country_code,
    'pending'
  )
  RETURNING id INTO v_comment_id;

  RETURN v_comment_id;
END;
$$;