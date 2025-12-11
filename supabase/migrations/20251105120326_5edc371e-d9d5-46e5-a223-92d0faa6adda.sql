-- Add columns to support threaded replies
ALTER TABLE public.event_comments
ADD COLUMN parent_comment_id UUID REFERENCES public.event_comments(id) ON DELETE CASCADE,
ADD COLUMN is_host_reply BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN reply_count INTEGER NOT NULL DEFAULT 0;

-- Create index for faster reply queries
CREATE INDEX idx_event_comments_parent ON public.event_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- Create policy for hosts to reply to comments
CREATE POLICY "Event hosts can reply to comments"
  ON public.event_comments
  FOR INSERT
  WITH CHECK (
    is_host_reply = true
    AND parent_comment_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_comments.event_id
      AND events.user_id = auth.uid()
    )
  );

-- Function to update reply count
CREATE OR REPLACE FUNCTION public.update_comment_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_comment_id IS NOT NULL THEN
    UPDATE public.event_comments
    SET reply_count = reply_count + 1
    WHERE id = NEW.parent_comment_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to automatically update reply count
CREATE TRIGGER trigger_update_reply_count
  AFTER INSERT ON public.event_comments
  FOR EACH ROW
  WHEN (NEW.parent_comment_id IS NOT NULL)
  EXECUTE FUNCTION public.update_comment_reply_count();

-- Function to decrease reply count on delete
CREATE OR REPLACE FUNCTION public.decrease_comment_reply_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.parent_comment_id IS NOT NULL THEN
    UPDATE public.event_comments
    SET reply_count = GREATEST(reply_count - 1, 0)
    WHERE id = OLD.parent_comment_id;
  END IF;
  RETURN OLD;
END;
$$;

-- Trigger to decrease reply count on delete
CREATE TRIGGER trigger_decrease_reply_count
  AFTER DELETE ON public.event_comments
  FOR EACH ROW
  WHEN (OLD.parent_comment_id IS NOT NULL)
  EXECUTE FUNCTION public.decrease_comment_reply_count();