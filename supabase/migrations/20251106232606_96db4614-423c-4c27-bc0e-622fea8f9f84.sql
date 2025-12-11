-- Create secure function to handle item suggestions from guests
CREATE OR REPLACE FUNCTION public.suggest_event_item(
  p_event_id UUID,
  p_guest_token UUID,
  p_item_name TEXT,
  p_suggested_by_name TEXT,
  p_suggested_by_email TEXT,
  p_category TEXT,
  p_description TEXT DEFAULT NULL,
  p_estimated_quantity INTEGER DEFAULT NULL,
  p_estimated_value NUMERIC DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rsvp_id UUID;
  v_suggestion_id UUID;
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
    RAISE EXCEPTION 'You must RSVP as Attending or Maybe to suggest items' USING ERRCODE = 'P0001';
  END IF;

  -- Insert the suggestion
  INSERT INTO public.item_suggestions (
    event_id,
    rsvp_id,
    suggested_by_name,
    suggested_by_email,
    item_name,
    category,
    description,
    estimated_quantity,
    estimated_value,
    status
  ) VALUES (
    p_event_id,
    v_rsvp_id,
    p_suggested_by_name,
    NULLIF(p_suggested_by_email, ''),
    p_item_name,
    p_category,
    NULLIF(p_description, ''),
    p_estimated_quantity,
    p_estimated_value,
    'pending'
  )
  RETURNING id INTO v_suggestion_id;

  RETURN v_suggestion_id;
END;
$$;