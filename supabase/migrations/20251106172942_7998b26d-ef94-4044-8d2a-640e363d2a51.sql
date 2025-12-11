-- Verify and fix RLS policies for RSVPs table

-- First, let's verify the existing INSERT policy
-- Drop and recreate to ensure it's truly permissive
DROP POLICY IF EXISTS "Anyone can create RSVPs" ON public.rsvps;

CREATE POLICY "Anyone can create RSVPs"
ON public.rsvps
FOR INSERT
TO public
WITH CHECK (true);

-- Verify the UPDATE policy uses the security definer function
DROP POLICY IF EXISTS "Guests can update RSVPs with valid token" ON public.rsvps;

CREATE POLICY "Guests can update RSVPs with valid token"
ON public.rsvps
FOR UPDATE
TO public
USING (public.can_update_rsvp(id, guest_token))
WITH CHECK (public.can_update_rsvp(id, guest_token));

-- Add an index on guest_token for better performance
CREATE INDEX IF NOT EXISTS idx_rsvps_guest_token ON public.rsvps(guest_token);

-- Add a comment for documentation
COMMENT ON POLICY "Anyone can create RSVPs" ON public.rsvps IS 
  'Allows anyone to create RSVPs. Security is handled by application-level validation.';

COMMENT ON POLICY "Guests can update RSVPs with valid token" ON public.rsvps IS 
  'Allows updates only when the correct guest_token is provided via the can_update_rsvp function.';