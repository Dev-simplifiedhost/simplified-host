-- Create host_message_replies table to store reply history
CREATE TABLE IF NOT EXISTS public.host_message_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.host_messages(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  reply_text TEXT NOT NULL CHECK (length(reply_text) > 0 AND length(reply_text) <= 1600),
  sent_via TEXT NOT NULL DEFAULT 'sms' CHECK (sent_via IN ('sms', 'email')),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  delivery_status TEXT DEFAULT 'sent' CHECK (delivery_status IN ('sent', 'delivered', 'failed', 'undelivered')),
  twilio_sid TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_replies_message ON public.host_message_replies(message_id);
CREATE INDEX IF NOT EXISTS idx_replies_event ON public.host_message_replies(event_id);

-- Enable RLS
ALTER TABLE public.host_message_replies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Event hosts can view replies" ON public.host_message_replies;
DROP POLICY IF EXISTS "Event hosts can create replies" ON public.host_message_replies;

-- Event hosts can view replies
CREATE POLICY "Event hosts can view replies"
  ON public.host_message_replies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = host_message_replies.event_id 
      AND events.user_id = auth.uid()
    )
  );

-- Event hosts can create replies
CREATE POLICY "Event hosts can create replies"
  ON public.host_message_replies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = host_message_replies.event_id 
      AND events.user_id = auth.uid()
    )
  );

-- Add reply tracking columns to host_messages only if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'host_messages' 
    AND column_name = 'replied_at'
  ) THEN
    ALTER TABLE public.host_messages ADD COLUMN replied_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'host_messages' 
    AND column_name = 'reply_count'
  ) THEN
    ALTER TABLE public.host_messages ADD COLUMN reply_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Function to update reply count
CREATE OR REPLACE FUNCTION public.update_message_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.host_messages
  SET 
    reply_count = reply_count + 1,
    replied_at = now()
  WHERE id = NEW.message_id;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_reply_count_trigger ON public.host_message_replies;

-- Trigger to auto-update reply count
CREATE TRIGGER update_reply_count_trigger
AFTER INSERT ON public.host_message_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_message_reply_count();