-- Add contributor_phone column to item_claims table
ALTER TABLE public.item_claims 
ADD COLUMN IF NOT EXISTS contributor_phone text,
ADD COLUMN IF NOT EXISTS country_code text DEFAULT 'US';