-- Add contribution_policy_note column to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS contribution_policy_note text DEFAULT NULL;