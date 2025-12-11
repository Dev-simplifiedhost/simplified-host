-- Create a SECURITY DEFINER helper to check if a guest (RSVP) can claim based on event settings
CREATE OR REPLACE FUNCTION public.can_guest_claim(_event_id uuid, _rsvp_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rsvps r
    JOIN public.events e ON e.id = r.event_id
    WHERE r.id = _rsvp_id
      AND r.event_id = _event_id
      AND (
        e.item_claim_eligibility = 'all_invitees'
        OR (e.item_claim_eligibility = 'attending_only' AND r.rsvp_status = 'attending')
        OR (e.item_claim_eligibility = 'attending_and_maybe' AND r.rsvp_status IN ('attending','maybe'))
      )
  );
$$;

-- Replace the INSERT policy on item_claims to use the helper (avoid cross-table RLS in policy)
DROP POLICY IF EXISTS "RSVP'd guests can claim quantity items" ON public.item_claims;
CREATE POLICY "Guests can claim quantity items"
ON public.item_claims
FOR INSERT
WITH CHECK (
  claim_type = 'quantity'
  AND rsvp_id IS NOT NULL
  AND public.can_guest_claim(event_id, rsvp_id)
);

COMMENT ON FUNCTION public.can_guest_claim IS 'RLS-safe helper for validating guest claim eligibility via SECURITY DEFINER';