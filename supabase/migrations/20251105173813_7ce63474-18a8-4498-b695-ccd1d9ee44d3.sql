-- Create trigger to generate notifications for new monetary item claims
-- This replaces the old payment_verifications notification system

CREATE OR REPLACE FUNCTION public.create_item_claim_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_user_id UUID;
  v_event_name TEXT;
  v_item_name TEXT;
BEGIN
  -- Only create notifications for monetary claims
  IF NEW.claim_type = 'monetary' THEN
    -- Get event owner, event name, and item name
    SELECT 
      e.user_id,
      e.name,
      ei.name
    INTO 
      v_event_user_id,
      v_event_name,
      v_item_name
    FROM events e
    JOIN event_items ei ON ei.id = NEW.item_id
    WHERE e.id = NEW.event_id;

    -- Create notification for event host
    INSERT INTO public.notifications (
      user_id, 
      event_id, 
      notification_type, 
      reference_id, 
      priority,
      metadata
    )
    VALUES (
      v_event_user_id,
      NEW.event_id,
      'payment_pending',
      NEW.id,  -- Reference to the item_claim, not payment_verification
      1, -- Highest priority
      jsonb_build_object(
        'contributor_name', NEW.contributor_name,
        'amount', NEW.amount_contributed,
        'item_name', v_item_name,
        'event_name', v_event_name,
        'contributor_email', NEW.contributor_email
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS on_item_claim_insert ON public.item_claims;

-- Create trigger on item_claims table
CREATE TRIGGER on_item_claim_insert
  AFTER INSERT ON public.item_claims
  FOR EACH ROW
  EXECUTE FUNCTION public.create_item_claim_notification();