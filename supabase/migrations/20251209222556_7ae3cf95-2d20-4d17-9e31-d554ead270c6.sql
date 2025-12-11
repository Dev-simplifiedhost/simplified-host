-- Add item system settings to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS skip_external_link_interstitial boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS max_guest_claims_per_item integer DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.events.skip_external_link_interstitial IS 'When true, external links open directly without interstitial warning';
COMMENT ON COLUMN public.events.max_guest_claims_per_item IS 'Optional limit on how many items a single guest can claim (null = unlimited)';