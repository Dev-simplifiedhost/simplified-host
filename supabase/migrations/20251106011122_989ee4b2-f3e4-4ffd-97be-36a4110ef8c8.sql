-- Ensure rsvps has required columns before functions reference them
ALTER TABLE public.rsvps
  ADD COLUMN IF NOT EXISTS guest_phone TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'US';

-- Create secure functions for guest RSVP operations

-- Function to allow guests to retrieve their own RSVP using their guest token
CREATE OR REPLACE FUNCTION public.get_my_rsvp(
  p_event_id uuid,
  p_guest_token uuid
)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  guest_name text,
  guest_email text,
  guest_phone text,
  country_code text,
  rsvp_status text,
  message text,
  plus_one_name text,
  dietary_preferences text[],
  dietary_other text,
  dietary_allergy text,
  guest_token uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, event_id, guest_name, guest_email, guest_phone, 
    country_code, rsvp_status, message, plus_one_name,
    dietary_preferences, dietary_other, dietary_allergy,
    guest_token, created_at, updated_at
  FROM rsvps
  WHERE rsvps.event_id = p_event_id
    AND rsvps.guest_token = p_guest_token
  LIMIT 1;
$$;

-- Function to allow guests to find their RSVP by name and phone
CREATE OR REPLACE FUNCTION public.find_my_rsvp(
  p_event_id uuid,
  p_guest_name text,
  p_guest_phone text,
  p_country_code text
)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  guest_name text,
  guest_email text,
  guest_phone text,
  country_code text,
  rsvp_status text,
  message text,
  plus_one_name text,
  dietary_preferences text[],
  dietary_other text,
  dietary_allergy text,
  guest_token uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, event_id, guest_name, guest_email, guest_phone,
    country_code, rsvp_status, message, plus_one_name,
    dietary_preferences, dietary_other, dietary_allergy,
    guest_token, created_at, updated_at
  FROM rsvps
  WHERE rsvps.event_id = p_event_id
    AND rsvps.guest_name = p_guest_name
    AND rsvps.guest_phone = p_guest_phone
    AND rsvps.country_code = p_country_code
  LIMIT 1;
$$;

-- Function to check RSVP status for item claiming eligibility
CREATE OR REPLACE FUNCTION public.check_rsvp_status(
  p_event_id uuid,
  p_guest_token uuid
)
RETURNS TABLE (
  id uuid,
  guest_name text,
  guest_email text,
  guest_phone text,
  country_code text,
  rsvp_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, guest_name, guest_email, guest_phone, country_code, rsvp_status
  FROM rsvps
  WHERE rsvps.event_id = p_event_id
    AND rsvps.guest_token = p_guest_token
  LIMIT 1;
$$;

-- Update RLS policies to allow INSERT and UPDATE operations
-- These policies allow anyone to insert/update, but validation happens at application layer
DROP POLICY IF EXISTS "Anyone can create RSVPs" ON public.rsvps;
DROP POLICY IF EXISTS "Guests can update their own RSVPs" ON public.rsvps;

CREATE POLICY "Anyone can create RSVPs"
ON public.rsvps
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Guests can update their own RSVPs"
ON public.rsvps
FOR UPDATE
USING (true)
WITH CHECK (true);