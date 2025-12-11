-- Create item_suggestions table for guest-proposed items
CREATE TABLE IF NOT EXISTS public.item_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  suggested_by_name TEXT NOT NULL,
  suggested_by_email TEXT,
  rsvp_id UUID REFERENCES public.rsvps(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  estimated_quantity INTEGER,
  estimated_value NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.item_suggestions ENABLE ROW LEVEL SECURITY;

-- Guests can view their own suggestions and all approved ones
CREATE POLICY "Guests can view their own and approved suggestions"
ON public.item_suggestions
FOR SELECT
USING (
  status = 'approved' OR 
  (suggested_by_email IS NOT NULL AND suggested_by_email = current_setting('request.jwt.claims', true)::json->>'email')
);

-- RSVP'd guests can insert suggestions
CREATE POLICY "RSVP'd guests can suggest items"
ON public.item_suggestions
FOR INSERT
WITH CHECK (
  rsvp_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.rsvps
    WHERE id = item_suggestions.rsvp_id
    AND event_id = item_suggestions.event_id
    AND rsvp_status IN ('attending', 'maybe')
  )
);

-- Guests can update their own pending suggestions
CREATE POLICY "Guests can update their pending suggestions"
ON public.item_suggestions
FOR UPDATE
USING (
  status = 'pending' AND
  suggested_by_email IS NOT NULL
);

-- Guests can delete their own pending suggestions
CREATE POLICY "Guests can delete their pending suggestions"
ON public.item_suggestions
FOR DELETE
USING (
  status = 'pending' AND
  suggested_by_email IS NOT NULL
);

-- Event hosts can view all suggestions for their events
CREATE POLICY "Event hosts can view all suggestions"
ON public.item_suggestions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE id = item_suggestions.event_id
    AND user_id = auth.uid()
  )
);

-- Event hosts can update suggestions (approve/reject)
CREATE POLICY "Event hosts can review suggestions"
ON public.item_suggestions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE id = item_suggestions.event_id
    AND user_id = auth.uid()
  )
);

-- Event hosts can delete suggestions
CREATE POLICY "Event hosts can delete suggestions"
ON public.item_suggestions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE id = item_suggestions.event_id
    AND user_id = auth.uid()
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_item_suggestions_updated_at
BEFORE UPDATE ON public.item_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Create function to handle suggestion approval
CREATE OR REPLACE FUNCTION public.approve_item_suggestion(
  p_suggestion_id UUID,
  p_host_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_suggestion RECORD;
  v_new_item_id UUID;
BEGIN
  -- Get suggestion details
  SELECT * INTO v_suggestion
  FROM item_suggestions
  WHERE id = p_suggestion_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Suggestion not found';
  END IF;
  
  -- Verify host owns the event
  IF NOT EXISTS (
    SELECT 1 FROM events
    WHERE id = v_suggestion.event_id
    AND user_id = p_host_user_id
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  
  -- Create new event item
  INSERT INTO event_items (
    event_id,
    name,
    category,
    notes,
    goal_type,
    goal_quantity,
    goal_amount,
    is_guest_added
  ) VALUES (
    v_suggestion.event_id,
    v_suggestion.item_name,
    v_suggestion.category,
    COALESCE(v_suggestion.description, '') || 
      ' (Suggested by ' || v_suggestion.suggested_by_name || ')',
    CASE 
      WHEN v_suggestion.estimated_quantity IS NOT NULL AND v_suggestion.estimated_value IS NOT NULL THEN 'both'::goal_type
      WHEN v_suggestion.estimated_value IS NOT NULL THEN 'monetary'::goal_type
      ELSE 'quantity'::goal_type
    END,
    v_suggestion.estimated_quantity,
    v_suggestion.estimated_value,
    true
  ) RETURNING id INTO v_new_item_id;
  
  -- Update suggestion status
  UPDATE item_suggestions
  SET 
    status = 'approved',
    reviewed_by = p_host_user_id,
    reviewed_at = now()
  WHERE id = p_suggestion_id;
  
  -- Create activity for host
  INSERT INTO activities (
    user_id,
    event_id,
    activity_type,
    activity_data
  ) VALUES (
    p_host_user_id,
    v_suggestion.event_id,
    'item_suggestion_approved',
    jsonb_build_object(
      'suggestion_id', p_suggestion_id,
      'item_name', v_suggestion.item_name,
      'suggested_by', v_suggestion.suggested_by_name,
      'item_id', v_new_item_id
    )
  );
  
  RETURN v_new_item_id;
END;
$$;

-- Create notification trigger for new suggestions
CREATE OR REPLACE FUNCTION public.create_suggestion_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_user_id UUID;
  v_event_name TEXT;
BEGIN
  -- Get event owner and name
  SELECT user_id, name INTO v_event_user_id, v_event_name
  FROM events
  WHERE id = NEW.event_id;
  
  -- Create notification for host when new suggestion is submitted
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notifications (
      user_id,
      event_id,
      notification_type,
      reference_id,
      priority,
      metadata
    ) VALUES (
      v_event_user_id,
      NEW.event_id,
      'item_suggestion',
      NEW.id,
      2, -- High priority
      jsonb_build_object(
        'item_name', NEW.item_name,
        'suggested_by', NEW.suggested_by_name,
        'category', NEW.category,
        'event_name', v_event_name
      )
    );
    
    -- Create activity for host
    INSERT INTO activities (
      user_id,
      event_id,
      activity_type,
      activity_data
    ) VALUES (
      v_event_user_id,
      NEW.event_id,
      'item_suggested',
      jsonb_build_object(
        'suggestion_id', NEW.id,
        'item_name', NEW.item_name,
        'suggested_by', NEW.suggested_by_name,
        'category', NEW.category,
        'event_name', v_event_name
      )
    );
  END IF;
  
  -- Create activity when suggestion is reviewed
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status != 'pending' THEN
    -- Activity record goes to host
    INSERT INTO activities (
      user_id,
      event_id,
      activity_type,
      activity_data
    ) VALUES (
      v_event_user_id,
      NEW.event_id,
      CASE 
        WHEN NEW.status = 'approved' THEN 'item_suggestion_approved'
        ELSE 'item_suggestion_rejected'
      END,
      jsonb_build_object(
        'suggestion_id', NEW.id,
        'item_name', NEW.item_name,
        'suggested_by', NEW.suggested_by_name,
        'status', NEW.status,
        'rejection_reason', NEW.rejection_reason,
        'event_name', v_event_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER item_suggestion_notification_trigger
AFTER INSERT OR UPDATE ON public.item_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.create_suggestion_notification();

-- Add index for performance
CREATE INDEX idx_item_suggestions_event_id ON public.item_suggestions(event_id);
CREATE INDEX idx_item_suggestions_status ON public.item_suggestions(status);
CREATE INDEX idx_item_suggestions_rsvp_id ON public.item_suggestions(rsvp_id);