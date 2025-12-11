-- Create event_comments table for public comments on events
CREATE TABLE IF NOT EXISTS public.event_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  commenter_name TEXT NOT NULL,
  commenter_email TEXT,
  comment_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on event_comments
ALTER TABLE public.event_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_comments
CREATE POLICY "Anyone can view approved comments"
  ON public.event_comments
  FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Anyone can insert comments"
  ON public.event_comments
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Event owners can update comment status"
  ON public.event_comments
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_comments.event_id
    AND events.user_id = auth.uid()
  ));

CREATE POLICY "Event owners can delete comments"
  ON public.event_comments
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = event_comments.event_id
    AND events.user_id = auth.uid()
  ));

-- Create host_messages table for direct messages to hosts
CREATE TABLE IF NOT EXISTS public.host_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  message_subject TEXT,
  message_body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  replied_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on host_messages
ALTER TABLE public.host_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for host_messages
CREATE POLICY "Anyone can insert messages"
  ON public.host_messages
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Event owners can view their messages"
  ON public.host_messages
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = host_messages.event_id
    AND events.user_id = auth.uid()
  ));

CREATE POLICY "Event owners can update their messages"
  ON public.host_messages
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = host_messages.event_id
    AND events.user_id = auth.uid()
  ));

-- Create payment_verifications table
CREATE TABLE IF NOT EXISTS public.payment_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  contribution_id UUID NOT NULL REFERENCES public.contributions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  submitted_by TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on payment_verifications
ALTER TABLE public.payment_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for payment_verifications
CREATE POLICY "Event owners can view payment verifications"
  ON public.payment_verifications
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = payment_verifications.event_id
    AND events.user_id = auth.uid()
  ));

CREATE POLICY "Event owners can update payment verifications"
  ON public.payment_verifications
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = payment_verifications.event_id
    AND events.user_id = auth.uid()
  ));

CREATE POLICY "Anyone can insert payment verifications"
  ON public.payment_verifications
  FOR INSERT
  WITH CHECK (true);

-- Create notifications table for aggregated feed
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('payment_pending', 'new_comment', 'new_message')),
  reference_id UUID NOT NULL,
  priority INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Create index for faster notification queries
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_event ON public.notifications(event_id);

-- Trigger function to create notification for new host message
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id, 
    event_id, 
    notification_type, 
    reference_id, 
    priority,
    metadata
  )
  SELECT 
    e.user_id,
    NEW.event_id,
    'new_message',
    NEW.id,
    2, -- High priority
    jsonb_build_object(
      'sender_name', NEW.sender_name,
      'sender_email', NEW.sender_email,
      'subject', COALESCE(NEW.message_subject, 'No subject'),
      'preview', LEFT(NEW.message_body, 100),
      'event_name', e.name
    )
  FROM events e
  WHERE e.id = NEW.event_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for host messages
CREATE TRIGGER trigger_message_notification
  AFTER INSERT ON public.host_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_message_notification();

-- Trigger function to create notification for new comment
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id, 
    event_id, 
    notification_type, 
    reference_id, 
    priority,
    metadata
  )
  SELECT 
    e.user_id,
    NEW.event_id,
    'new_comment',
    NEW.id,
    3, -- Medium priority
    jsonb_build_object(
      'commenter_name', NEW.commenter_name,
      'preview', LEFT(NEW.comment_text, 100),
      'event_name', e.name
    )
  FROM events e
  WHERE e.id = NEW.event_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for comments
CREATE TRIGGER trigger_comment_notification
  AFTER INSERT ON public.event_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.create_comment_notification();

-- Trigger function to create notification for payment verification
CREATE OR REPLACE FUNCTION public.create_payment_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id, 
    event_id, 
    notification_type, 
    reference_id, 
    priority,
    metadata
  )
  SELECT 
    e.user_id,
    NEW.event_id,
    'payment_pending',
    NEW.id,
    1, -- Highest priority
    jsonb_build_object(
      'contributor_name', NEW.submitted_by,
      'event_name', e.name
    )
  FROM events e
  WHERE e.id = NEW.event_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for payment verifications
CREATE TRIGGER trigger_payment_notification
  AFTER INSERT ON public.payment_verifications
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.create_payment_notification();

-- Create updated_at trigger for event_comments
CREATE TRIGGER update_event_comments_updated_at
  BEFORE UPDATE ON public.event_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();