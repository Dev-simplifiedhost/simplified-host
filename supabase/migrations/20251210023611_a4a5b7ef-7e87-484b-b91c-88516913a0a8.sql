-- Add Stripe Connect fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'not_connected';

-- Add contribution configuration fields to events table
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS contributions_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS contribution_type TEXT DEFAULT 'freeform',
ADD COLUMN IF NOT EXISTS contribution_per_guest NUMERIC,
ADD COLUMN IF NOT EXISTS contribution_suggested_amount NUMERIC,
ADD COLUMN IF NOT EXISTS contribution_minimum_amount NUMERIC,
ADD COLUMN IF NOT EXISTS credit_card_payments_enabled BOOLEAN DEFAULT false;

-- Add payment tracking fields to item_claims table
ALTER TABLE public.item_claims 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

-- Create stripe_payments table for detailed payment tracking
CREATE TABLE IF NOT EXISTS public.stripe_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  item_claim_id UUID REFERENCES public.item_claims(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT NOT NULL,
  amount_gross NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL,
  amount_net NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  contributor_name TEXT NOT NULL,
  contributor_email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS on stripe_payments
ALTER TABLE public.stripe_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for stripe_payments
CREATE POLICY "Event owners can view their stripe payments"
ON public.stripe_payments
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.events
  WHERE events.id = stripe_payments.event_id
  AND events.user_id = auth.uid()
));

CREATE POLICY "System can insert stripe payments"
ON public.stripe_payments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update stripe payments"
ON public.stripe_payments
FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_payments_event_id ON public.stripe_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_checkout_session ON public.stripe_payments(stripe_checkout_session_id);