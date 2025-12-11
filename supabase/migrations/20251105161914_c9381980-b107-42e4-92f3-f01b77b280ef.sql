-- Create enum for goal types
CREATE TYPE public.goal_type AS ENUM ('quantity', 'monetary', 'both');

-- Create enum for fulfillment status
CREATE TYPE public.fulfillment_status AS ENUM ('unfulfilled', 'partially_fulfilled', 'fulfilled');

-- Extend event_items table with goal tracking
ALTER TABLE public.event_items
ADD COLUMN goal_type public.goal_type DEFAULT 'quantity',
ADD COLUMN goal_quantity integer,
ADD COLUMN goal_amount numeric(10,2),
ADD COLUMN current_quantity integer DEFAULT 0,
ADD COLUMN current_amount numeric(10,2) DEFAULT 0,
ADD COLUMN fulfillment_status public.fulfillment_status DEFAULT 'unfulfilled';

-- Add item_claim_eligibility to events
ALTER TABLE public.events
ADD COLUMN item_claim_eligibility text DEFAULT 'attending_only' CHECK (item_claim_eligibility IN ('attending_only', 'attending_and_maybe', 'all_invitees'));

-- Create item_claims table
CREATE TABLE public.item_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.event_items(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  claim_type text NOT NULL CHECK (claim_type IN ('quantity', 'monetary')),
  quantity_claimed integer,
  amount_contributed numeric(10,2),
  contributor_name text NOT NULL,
  contributor_email text,
  rsvp_id uuid REFERENCES public.rsvps(id) ON DELETE CASCADE,
  payment_verified boolean DEFAULT false,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on item_claims
ALTER TABLE public.item_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for item_claims
CREATE POLICY "Anyone can view item claims"
ON public.item_claims
FOR SELECT
USING (true);

CREATE POLICY "RSVP'd guests can claim quantity items"
ON public.item_claims
FOR INSERT
WITH CHECK (
  claim_type = 'quantity' AND
  rsvp_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.rsvps r
    JOIN public.events e ON e.id = r.event_id
    WHERE r.id = rsvp_id
    AND r.event_id = item_claims.event_id
    AND (
      (e.item_claim_eligibility = 'attending_only' AND r.rsvp_status = 'attending') OR
      (e.item_claim_eligibility = 'attending_and_maybe' AND r.rsvp_status IN ('attending', 'maybe')) OR
      (e.item_claim_eligibility = 'all_invitees')
    )
  )
);

CREATE POLICY "Anyone can contribute monetary amounts"
ON public.item_claims
FOR INSERT
WITH CHECK (claim_type = 'monetary');

CREATE POLICY "Contributors can update their own claims"
ON public.item_claims
FOR UPDATE
USING (contributor_email IS NOT NULL);

CREATE POLICY "Event hosts can update item claims"
ON public.item_claims
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = item_claims.event_id
    AND events.user_id = auth.uid()
  )
);

CREATE POLICY "Contributors can delete their own claims"
ON public.item_claims
FOR DELETE
USING (contributor_email IS NOT NULL);

CREATE POLICY "Event hosts can delete item claims"
ON public.item_claims
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = item_claims.event_id
    AND events.user_id = auth.uid()
  )
);

-- Function to update item progress
CREATE OR REPLACE FUNCTION public.update_item_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_goal_quantity integer;
  v_goal_amount numeric;
  v_goal_type public.goal_type;
  v_new_status public.fulfillment_status;
BEGIN
  -- Get item goals
  SELECT goal_quantity, goal_amount, goal_type
  INTO v_goal_quantity, v_goal_amount, v_goal_type
  FROM event_items
  WHERE id = COALESCE(NEW.item_id, OLD.item_id);

  -- Recalculate current values
  UPDATE event_items
  SET 
    current_quantity = COALESCE((
      SELECT SUM(quantity_claimed)
      FROM item_claims
      WHERE item_id = event_items.id
      AND claim_type = 'quantity'
    ), 0),
    current_amount = COALESCE((
      SELECT SUM(amount_contributed)
      FROM item_claims
      WHERE item_id = event_items.id
      AND claim_type = 'monetary'
      AND payment_verified = true
    ), 0)
  WHERE id = COALESCE(NEW.item_id, OLD.item_id);

  -- Calculate new fulfillment status
  SELECT 
    CASE
      WHEN v_goal_type = 'quantity' THEN
        CASE
          WHEN current_quantity >= v_goal_quantity THEN 'fulfilled'::public.fulfillment_status
          WHEN current_quantity > 0 THEN 'partially_fulfilled'::public.fulfillment_status
          ELSE 'unfulfilled'::public.fulfillment_status
        END
      WHEN v_goal_type = 'monetary' THEN
        CASE
          WHEN current_amount >= v_goal_amount THEN 'fulfilled'::public.fulfillment_status
          WHEN current_amount > 0 THEN 'partially_fulfilled'::public.fulfillment_status
          ELSE 'unfulfilled'::public.fulfillment_status
        END
      WHEN v_goal_type = 'both' THEN
        CASE
          WHEN current_quantity >= v_goal_quantity AND current_amount >= v_goal_amount THEN 'fulfilled'::public.fulfillment_status
          WHEN current_quantity > 0 OR current_amount > 0 THEN 'partially_fulfilled'::public.fulfillment_status
          ELSE 'unfulfilled'::public.fulfillment_status
        END
    END
  INTO v_new_status
  FROM event_items
  WHERE id = COALESCE(NEW.item_id, OLD.item_id);

  -- Update fulfillment status
  UPDATE event_items
  SET fulfillment_status = v_new_status
  WHERE id = COALESCE(NEW.item_id, OLD.item_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update item progress
CREATE TRIGGER trigger_update_item_progress
AFTER INSERT OR UPDATE OR DELETE ON public.item_claims
FOR EACH ROW
EXECUTE FUNCTION public.update_item_progress();

-- Function to auto-unclaim quantity items when RSVP changes
CREATE OR REPLACE FUNCTION public.auto_unclaim_quantity_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete quantity claims when RSVP changes to cant_go or not_responded
  IF NEW.rsvp_status IN ('cant_go', 'not_responded') AND OLD.rsvp_status != NEW.rsvp_status THEN
    DELETE FROM public.item_claims
    WHERE rsvp_id = NEW.id
    AND claim_type = 'quantity';

    -- Log activity
    INSERT INTO public.activities (user_id, event_id, activity_type, activity_data)
    SELECT 
      e.user_id,
      NEW.event_id,
      'item_auto_unclaimed',
      jsonb_build_object(
        'guest_name', NEW.guest_name,
        'rsvp_status', NEW.rsvp_status,
        'event_name', e.name
      )
    FROM events e
    WHERE e.id = NEW.event_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for auto-unclaim
CREATE TRIGGER trigger_auto_unclaim_quantity_items
AFTER UPDATE ON public.rsvps
FOR EACH ROW
EXECUTE FUNCTION public.auto_unclaim_quantity_items();

-- Backfill existing event_items data
UPDATE public.event_items
SET 
  goal_quantity = quantity,
  goal_type = 'quantity'
WHERE goal_quantity IS NULL;

-- Migrate existing claimed_by data to item_claims
INSERT INTO public.item_claims (item_id, event_id, claim_type, quantity_claimed, contributor_name, rsvp_id, created_at)
SELECT 
  ei.id,
  ei.event_id,
  'quantity',
  ei.quantity,
  ei.claimed_by_name,
  r.id,
  ei.created_at
FROM public.event_items ei
LEFT JOIN public.rsvps r ON r.event_id = ei.event_id AND r.guest_email = ei.claimed_by
WHERE ei.claimed_by IS NOT NULL
AND ei.claimed_by_name IS NOT NULL
ON CONFLICT DO NOTHING;