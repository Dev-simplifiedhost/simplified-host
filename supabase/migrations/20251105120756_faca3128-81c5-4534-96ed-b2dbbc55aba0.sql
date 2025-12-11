-- Update notification_preferences to include granular controls
-- First, let's create a default notification preferences structure
CREATE OR REPLACE FUNCTION public.get_default_notification_preferences()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'in_app', jsonb_build_object(
      'payments', true,
      'messages', true,
      'comments', true,
      'rsvps', true,
      'items', true
    ),
    'email', jsonb_build_object(
      'payments', true,
      'messages', true,
      'comments', true,
      'rsvps', true,
      'items', true,
      'digest_frequency', 'instant'
    ),
    'sms', jsonb_build_object(
      'enabled', false,
      'phone_number', null,
      'payments', false,
      'messages', false,
      'comments', false
    )
  );
$$;

-- Update existing profiles to have the new structure
UPDATE public.profiles
SET notification_preferences = public.get_default_notification_preferences()
WHERE notification_preferences IS NULL 
   OR NOT (notification_preferences ? 'in_app');

-- Add phone number column if not exists for SMS notifications
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone_number TEXT;