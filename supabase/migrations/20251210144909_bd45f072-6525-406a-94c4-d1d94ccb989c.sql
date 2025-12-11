-- Add default_payment_methods column to profiles table
-- Stores user's default payment methods that auto-populate for new events
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS default_payment_methods JSONB DEFAULT '[]'::jsonb;