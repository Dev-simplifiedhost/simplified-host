-- Add reminder settings to events table
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminders_enabled boolean DEFAULT true;
ALTER TABLE events ADD COLUMN IF NOT EXISTS reminder_settings jsonb DEFAULT '{
  "rsvp_reminder_days": 3,
  "item_reminder_days": 2,
  "contribution_reminder_days": 1,
  "thank_you_delay_days": 1,
  "custom_messages": {}
}'::jsonb;

-- Create reminders table
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('rsvp', 'item', 'contribution', 'thank_you', 'custom', 'announcement')),
  scheduled_for timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
  message_title text,
  message_template text NOT NULL,
  recipients jsonb DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create reminder_logs table for tracking delivery
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_id uuid NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  recipient_identifier text NOT NULL, -- email, phone, or guest_token
  sent_at timestamp with time zone DEFAULT now(),
  opened_at timestamp with time zone,
  actioned_at timestamp with time zone,
  delivery_status text NOT NULL DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'failed', 'opened', 'actioned')),
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create guest_preferences table for notification settings
CREATE TABLE IF NOT EXISTS public.guest_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guest_token uuid NOT NULL,
  guest_email text,
  email_enabled boolean DEFAULT true,
  push_enabled boolean DEFAULT true,
  sms_enabled boolean DEFAULT false,
  unsubscribed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, guest_token)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reminders_event_id ON reminders(event_id);
CREATE INDEX IF NOT EXISTS idx_reminders_scheduled_for ON reminders(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminder_logs_reminder_id ON reminder_logs(reminder_id);
CREATE INDEX IF NOT EXISTS idx_guest_preferences_event_token ON guest_preferences(event_id, guest_token);

-- Enable RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reminders
CREATE POLICY "Event hosts can view their event reminders"
  ON reminders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = reminders.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Event hosts can create reminders"
  ON reminders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = reminders.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Event hosts can update their reminders"
  ON reminders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = reminders.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Event hosts can delete their reminders"
  ON reminders FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = reminders.event_id
      AND events.user_id = auth.uid()
    )
  );

-- RLS Policies for reminder_logs
CREATE POLICY "Event hosts can view reminder logs"
  ON reminder_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM reminders r
      JOIN events e ON e.id = r.event_id
      WHERE r.id = reminder_logs.reminder_id
      AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert reminder logs"
  ON reminder_logs FOR INSERT
  WITH CHECK (true);

-- RLS Policies for guest_preferences
CREATE POLICY "Guests can view their own preferences"
  ON guest_preferences FOR SELECT
  USING (true);

CREATE POLICY "Guests can update their own preferences"
  ON guest_preferences FOR UPDATE
  USING (true);

CREATE POLICY "System can insert guest preferences"
  ON guest_preferences FOR INSERT
  WITH CHECK (true);

-- Trigger for updated_at on reminders
CREATE TRIGGER set_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Trigger for updated_at on guest_preferences
CREATE TRIGGER set_guest_preferences_updated_at
  BEFORE UPDATE ON guest_preferences
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Function to get reminder statistics
CREATE OR REPLACE FUNCTION get_reminder_stats(p_event_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_sent', COUNT(*) FILTER (WHERE status = 'sent'),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled'),
    'by_type', jsonb_object_agg(
      reminder_type,
      jsonb_build_object(
        'sent', COUNT(*) FILTER (WHERE status = 'sent'),
        'pending', COUNT(*) FILTER (WHERE status = 'pending')
      )
    )
  )
  INTO result
  FROM reminders
  WHERE event_id = p_event_id
  GROUP BY event_id;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;