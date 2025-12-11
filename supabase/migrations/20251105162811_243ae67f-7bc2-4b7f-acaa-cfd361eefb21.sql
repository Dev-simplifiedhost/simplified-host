-- Create notification for item auto-unclaim events
CREATE OR REPLACE FUNCTION public.create_item_unclaim_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only create notification for item_auto_unclaimed activity type
  IF NEW.activity_type = 'item_auto_unclaimed' THEN
    INSERT INTO public.notifications (
      user_id, 
      event_id, 
      notification_type, 
      reference_id, 
      priority,
      metadata
    )
    VALUES (
      NEW.user_id,
      NEW.event_id,
      'item_released',
      NEW.id,
      2, -- High priority
      NEW.activity_data || jsonb_build_object('activity_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for item unclaim notifications
CREATE TRIGGER trigger_item_unclaim_notification
AFTER INSERT ON public.activities
FOR EACH ROW
WHEN (NEW.activity_type = 'item_auto_unclaimed')
EXECUTE FUNCTION public.create_item_unclaim_notification();