-- Create user_consents table for tracking legal consent
CREATE TABLE public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('terms_of_service', 'privacy_policy')),
  consent_given BOOLEAN NOT NULL DEFAULT true,
  consent_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  policy_version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, consent_type)
);

-- Enable RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Users can only read their own consent records
CREATE POLICY "Users can view their own consent records"
ON public.user_consents
FOR SELECT
USING (auth.uid() = user_id);

-- Only authenticated users can insert consent records
CREATE POLICY "Authenticated users can insert consent records"
ON public.user_consents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- No updates or deletes allowed (consent is immutable)
-- This ensures legal compliance and audit trail

-- Create index for faster lookups
CREATE INDEX idx_user_consents_user_id ON public.user_consents(user_id);
CREATE INDEX idx_user_consents_type ON public.user_consents(user_id, consent_type);