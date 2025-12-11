-- 1. Add phone tracking columns to guest_preferences
ALTER TABLE public.guest_preferences 
ADD COLUMN IF NOT EXISTS guest_phone TEXT,
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'US',
ADD COLUMN IF NOT EXISTS sms_consent_given_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP WITH TIME ZONE;

-- 2. Create global index for phone lookups (across all events)
CREATE INDEX IF NOT EXISTS idx_guest_preferences_phone_global
ON public.guest_preferences(guest_phone, country_code) 
WHERE sms_enabled = true AND guest_phone IS NOT NULL;

-- 3. Backfill existing records with phone numbers from RSVPs
UPDATE public.guest_preferences gp
SET 
  guest_phone = r.guest_phone,
  country_code = r.country_code
FROM public.rsvps r
WHERE gp.guest_token = r.guest_token
  AND gp.event_id = r.event_id
  AND gp.guest_phone IS NULL
  AND r.guest_phone IS NOT NULL;

-- 4. Helper function: Check if phone has global SMS consent
CREATE OR REPLACE FUNCTION public.check_sms_consent_global(
  p_phone TEXT,
  p_country_code TEXT DEFAULT 'US'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.guest_preferences
    WHERE guest_phone = p_phone
      AND country_code = p_country_code
      AND sms_enabled = true
      AND sms_consent_given_at IS NOT NULL
      AND (unsubscribed_at IS NULL)
  );
$$;

-- 5. Helper function: Get the most recent consent timestamp
CREATE OR REPLACE FUNCTION public.get_sms_consent_date(
  p_phone TEXT,
  p_country_code TEXT DEFAULT 'US'
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT MAX(sms_consent_given_at)
  FROM public.guest_preferences
  WHERE guest_phone = p_phone
    AND country_code = p_country_code
    AND sms_enabled = true
    AND sms_consent_given_at IS NOT NULL;
$$;

-- 6. Add index to help with phone-based queries
CREATE INDEX IF NOT EXISTS idx_guest_preferences_phone_lookup
ON public.guest_preferences(guest_phone)
WHERE guest_phone IS NOT NULL;