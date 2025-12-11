-- Function to generate item followup reminders for unfulfilled items
CREATE OR REPLACE FUNCTION public.generate_item_followup_reminders()
RETURNS TABLE (
  event_id uuid,
  event_name text,
  host_email text,
  unfulfilled_items jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Find events happening in 2-3 days with unfulfilled items
  RETURN QUERY
  WITH upcoming_events AS (
    SELECT 
      e.id as event_id,
      e.name as event_name,
      e.user_id,
      e.event_date,
      au.email as host_email
    FROM events e
    JOIN auth.users au ON au.id = e.user_id
    WHERE e.event_date IS NOT NULL
    AND e.event_date BETWEEN (now() + INTERVAL '2 days') AND (now() + INTERVAL '3 days')
    AND e.reminders_enabled = true
  ),
  unfulfilled_items_by_event AS (
    SELECT 
      ei.event_id,
      jsonb_agg(
        jsonb_build_object(
          'name', ei.name,
          'category', ei.category,
          'goal_quantity', ei.goal_quantity,
          'current_quantity', ei.current_quantity,
          'goal_amount', ei.goal_amount,
          'current_amount', ei.current_amount,
          'remaining_quantity', COALESCE(ei.goal_quantity, 0) - ei.current_quantity,
          'remaining_amount', COALESCE(ei.goal_amount, 0) - ei.current_amount
        )
      ) as items
    FROM event_items ei
    WHERE ei.fulfillment_status IN ('unfulfilled', 'partially_fulfilled')
    GROUP BY ei.event_id
  )
  SELECT 
    ue.event_id,
    ue.event_name,
    ue.host_email,
    ui.items as unfulfilled_items
  FROM upcoming_events ue
  JOIN unfulfilled_items_by_event ui ON ui.event_id = ue.event_id
  -- Only return events where we haven't sent a reminder in the last 24 hours
  WHERE NOT EXISTS (
    SELECT 1 FROM reminders r
    WHERE r.event_id = ue.event_id
    AND r.reminder_type = 'item_followup'
    AND r.created_at > now() - INTERVAL '24 hours'
  );
END;
$$;

-- Function to create item followup reminder record
CREATE OR REPLACE FUNCTION public.create_item_reminder(
  p_event_id uuid,
  p_event_name text,
  p_host_email text,
  p_unfulfilled_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reminder_id uuid;
  v_event_user_id uuid;
  v_item_count int;
  v_message_body text;
BEGIN
  -- Get event owner
  SELECT user_id INTO v_event_user_id
  FROM events
  WHERE id = p_event_id;

  -- Count items
  v_item_count := jsonb_array_length(p_unfulfilled_items);

  -- Build message
  v_message_body := format(
    'Your event "%s" is coming up in 2 days! You still have %s unfulfilled item%s that need attention.',
    p_event_name,
    v_item_count,
    CASE WHEN v_item_count > 1 THEN 's' ELSE '' END
  );

  -- Create reminder record
  INSERT INTO reminders (
    event_id,
    reminder_type,
    scheduled_for,
    message_title,
    message_template,
    recipients,
    status,
    created_by,
    metadata
  ) VALUES (
    p_event_id,
    'item_followup',
    now() + INTERVAL '1 hour',
    format('Item Followup: %s items still needed', v_item_count),
    v_message_body,
    jsonb_build_array(
      jsonb_build_object(
        'email', p_host_email,
        'name', 'Event Host'
      )
    ),
    'pending',
    v_event_user_id,
    jsonb_build_object(
      'unfulfilled_items', p_unfulfilled_items,
      'auto_generated', true
    )
  )
  RETURNING id INTO v_reminder_id;

  RETURN v_reminder_id;
END;
$$;