-- Drop the old constraint that only allows 3 notification types
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_notification_type_check;

-- Create new constraint with all required notification types
ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_notification_type_check 
CHECK (notification_type = ANY (ARRAY[
  'payment_pending'::text,
  'new_comment'::text,
  'new_message'::text,
  'item_suggestion'::text,
  'item_released'::text
]));