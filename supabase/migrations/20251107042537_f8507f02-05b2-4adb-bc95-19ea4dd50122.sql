-- Function to delete items suggested by a guest
CREATE OR REPLACE FUNCTION delete_my_suggested_item(
  p_item_id uuid,
  p_event_id uuid,
  p_guest_token uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted boolean := false;
BEGIN
  -- Delete the item if it was suggested by this guest
  DELETE FROM event_items ei
  USING item_suggestions s, rsvps r
  WHERE ei.id = p_item_id
    AND ei.event_id = p_event_id
    AND ei.suggestion_id = s.id
    AND s.rsvp_id = r.id
    AND r.guest_token = p_guest_token;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  IF NOT v_deleted THEN
    RAISE EXCEPTION 'Item not found or you do not have permission to delete it';
  END IF;
  
  RETURN true;
END;
$$;

-- Function to update items suggested by a guest
CREATE OR REPLACE FUNCTION update_my_suggested_item(
  p_item_id uuid,
  p_event_id uuid,
  p_guest_token uuid,
  p_name text,
  p_category text,
  p_notes text DEFAULT NULL,
  p_goal_type goal_type DEFAULT NULL,
  p_goal_quantity integer DEFAULT NULL,
  p_goal_amount numeric DEFAULT NULL,
  p_dietary_tags text[] DEFAULT NULL,
  p_dietary_other text DEFAULT NULL,
  p_serves_per_unit integer DEFAULT NULL
)
RETURNS event_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item event_items;
BEGIN
  -- Update the item if it was suggested by this guest
  UPDATE event_items ei
  SET 
    name = p_name,
    category = p_category,
    notes = p_notes,
    goal_type = COALESCE(p_goal_type, ei.goal_type),
    goal_quantity = p_goal_quantity,
    goal_amount = p_goal_amount,
    dietary_tags = COALESCE(p_dietary_tags, ei.dietary_tags),
    dietary_other = p_dietary_other,
    serves_per_unit = p_serves_per_unit,
    updated_at = now()
  FROM item_suggestions s, rsvps r
  WHERE ei.id = p_item_id
    AND ei.event_id = p_event_id
    AND ei.suggestion_id = s.id
    AND s.rsvp_id = r.id
    AND r.guest_token = p_guest_token
  RETURNING ei.* INTO v_item;
  
  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'Item not found or you do not have permission to update it';
  END IF;
  
  RETURN v_item;
END;
$$;