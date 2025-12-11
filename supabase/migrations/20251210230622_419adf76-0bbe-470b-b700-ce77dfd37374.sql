-- Add name column to collaborator_invites if not exists
ALTER TABLE collaborator_invites ADD COLUMN IF NOT EXISTS name text;

-- Helper function to count active collaborators + pending invites for an event
CREATE OR REPLACE FUNCTION public.get_event_collaborator_count(_event_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT (
    -- Count active collaborators
    (SELECT COUNT(*)::integer FROM event_collaborators
     WHERE event_id = _event_id 
     AND status = 'active'
     AND (expires_at IS NULL OR expires_at > now()))
    +
    -- Count pending invites
    (SELECT COUNT(*)::integer FROM collaborator_invites
     WHERE event_id = _event_id 
     AND accepted_at IS NULL 
     AND declined_at IS NULL
     AND expires_at > now())
  );
$$;

-- Function to accept a collaborator invite by token
CREATE OR REPLACE FUNCTION public.accept_collaborator_invite(_invite_token uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_invite RECORD;
  v_collaborator_id uuid;
  v_result jsonb;
BEGIN
  -- Find the invite
  SELECT * INTO v_invite
  FROM collaborator_invites
  WHERE invite_token = _invite_token
  AND accepted_at IS NULL
  AND declined_at IS NULL
  AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'invite_not_found',
      'message', 'This invitation is invalid, expired, or has already been used.'
    );
  END IF;
  
  -- Verify user email matches invite email
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = _user_id 
    AND lower(email) = lower(v_invite.email)
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'email_mismatch',
      'message', 'This invitation is for ' || v_invite.email || '. Please sign in with that email address.',
      'expected_email', v_invite.email
    );
  END IF;
  
  -- Check if user is already a collaborator
  IF EXISTS (
    SELECT 1 FROM event_collaborators
    WHERE event_id = v_invite.event_id
    AND user_id = _user_id
    AND status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'already_collaborator',
      'message', 'You are already a collaborator on this event.'
    );
  END IF;
  
  -- Create collaborator record
  INSERT INTO event_collaborators (
    event_id,
    user_id,
    role,
    status,
    permissions,
    invited_by,
    invited_at,
    accepted_at,
    scope
  ) VALUES (
    v_invite.event_id,
    _user_id,
    v_invite.role,
    'active',
    v_invite.permissions,
    v_invite.invited_by,
    v_invite.created_at,
    now(),
    v_invite.scope
  )
  RETURNING id INTO v_collaborator_id;
  
  -- Mark invite as accepted
  UPDATE collaborator_invites
  SET accepted_at = now()
  WHERE id = v_invite.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'collaborator_id', v_collaborator_id,
    'event_id', v_invite.event_id,
    'role', v_invite.role
  );
END;
$$;

-- Function to get invite details by token (for public access)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_invite_token uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT jsonb_build_object(
    'id', ci.id,
    'email', ci.email,
    'name', ci.name,
    'role', ci.role,
    'note', ci.note,
    'expires_at', ci.expires_at,
    'accepted_at', ci.accepted_at,
    'declined_at', ci.declined_at,
    'event_id', ci.event_id,
    'event_name', e.name,
    'host_name', e.host_name,
    'is_valid', (ci.accepted_at IS NULL AND ci.declined_at IS NULL AND ci.expires_at > now())
  )
  FROM collaborator_invites ci
  JOIN events e ON e.id = ci.event_id
  WHERE ci.invite_token = _invite_token;
$$;