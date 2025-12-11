-- Add onboarding tracking fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS has_completed_host_onboarding boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_step integer DEFAULT null;