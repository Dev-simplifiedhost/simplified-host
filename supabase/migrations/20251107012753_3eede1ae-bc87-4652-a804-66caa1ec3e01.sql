-- Fix 1: Make get_my_rsvp_full STABLE instead of VOLATILE for better performance and consistency
DROP FUNCTION IF EXISTS public.get_my_rsvp_full(uuid, uuid);
CREATE OR REPLACE FUNCTION public.get_my_rsvp_full(p_event_id uuid, p_guest_token uuid)
RETURNS rsvps
LANGUAGE sql
STABLE  -- Changed from VOLATILE to STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select r.*
  from public.rsvps r
  where r.event_id = p_event_id
    and r.guest_token = p_guest_token
  limit 1;
$$;

-- Fix 2: Add a helper function to safely get rsvp_id from guest_token
CREATE OR REPLACE FUNCTION public.get_rsvp_id_from_token(p_event_id uuid, p_guest_token uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.rsvps
  WHERE event_id = p_event_id
    AND guest_token = p_guest_token
  LIMIT 1;
$$;

-- Fix 3: Ensure the item_claims RLS policy is comprehensive
-- Drop existing policy first
DROP POLICY IF EXISTS "RSVP'd guests can claim quantity items" ON public.item_claims;

-- Recreate with better validation
CREATE POLICY "RSVP'd guests can claim quantity items"
ON public.item_claims
FOR INSERT
WITH CHECK (
  claim_type = 'quantity'
  AND rsvp_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.rsvps r
    JOIN public.events e ON e.id = r.event_id
    WHERE r.id = item_claims.rsvp_id
      AND r.event_id = item_claims.event_id
      AND (
        -- Allow based on eligibility settings
        (e.item_claim_eligibility = 'all_invitees')
        OR (e.item_claim_eligibility = 'attending_only' AND r.rsvp_status = 'attending')
        OR (e.item_claim_eligibility = 'attending_and_maybe' AND r.rsvp_status IN ('attending', 'maybe'))
      )
  )
);

-- Fix 4: Add better validation to update_my_rsvp to prevent null issues
DROP FUNCTION IF EXISTS public.update_my_rsvp(uuid, uuid, text, text, text, text, text, text, jsonb, text[], text, text);
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
)
RETURNS rsvps
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rsvp rsvps;
BEGIN
  -- Validate inputs
  IF p_guest_token IS NULL THEN
    RAISE EXCEPTION 'Guest token is required' USING ERRCODE = 'P0001';
  END IF;
  
  IF p_event_id IS NULL THEN
    RAISE EXCEPTION 'Event ID is required' USING ERRCODE = 'P0001';
  END IF;
  
  IF p_guest_name IS NULL OR trim(p_guest_name) = '' THEN
    RAISE EXCEPTION 'Guest name is required' USING ERRCODE = 'P0001';
  END IF;

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
    RAISE EXCEPTION 'RSVP not found for provided token. Please try refreshing the page.' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_rsvp;
END;
$$;

COMMENT ON FUNCTION public.get_rsvp_id_from_token IS 'Safely retrieves RSVP ID from guest token for item claiming';
COMMENT ON FUNCTION public.update_my_rsvp IS 'Updates an RSVP using guest token with comprehensive validation';