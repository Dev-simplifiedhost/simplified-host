-- Update default notification_preferences for profiles table with host/guest separation
ALTER TABLE profiles 
ALTER COLUMN notification_preferences 
SET DEFAULT '{
  "host_rsvp_received": false,
  "host_item_claimed": false,
  "host_payment_received": true,
  "host_message_received": true,
  "guest_announcements": true,
  "guest_reminders": true,
  "guest_rsvp_confirmation": false,
  "guest_claim_confirmation": false,
  "push_notifications": true
}'::jsonb;