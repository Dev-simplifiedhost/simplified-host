-- Create secure function for guests to delete their own quantity claims
CREATE OR REPLACE FUNCTION public.delete_my_item_claim(
  p_claim_id uuid,
  p_event_id uuid,
  p_guest_token uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  -- Verify the claim belongs to this guest's RSVP and is a quantity claim
  SELECT EXISTS (
    SELECT 1
    FROM public.item_claims ic
    JOIN public.rsvps r ON r.id = ic.rsvp_id
    WHERE ic.id = p_claim_id
      AND ic.event_id = p_event_id
      AND ic.claim_type = 'quantity'
      AND r.guest_token = p_guest_token
  ) INTO v_ok;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = 'P0001';
  END IF;

  -- Delete the claim
  DELETE FROM public.item_claims WHERE id = p_claim_id;
  
  RETURN true;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.delete_my_item_claim(uuid, uuid, uuid) TO anon, authenticated;