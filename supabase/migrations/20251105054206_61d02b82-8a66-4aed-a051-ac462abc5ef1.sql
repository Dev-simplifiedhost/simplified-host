-- Create enum for collaborator roles
CREATE TYPE public.collaborator_role AS ENUM ('owner', 'co_host', 'editor', 'viewer');

-- Create enum for collaborator status
CREATE TYPE public.collaborator_status AS ENUM ('active', 'pending', 'suspended', 'revoked');

-- Create event_collaborators table
CREATE TABLE IF NOT EXISTS public.event_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role collaborator_role NOT NULL DEFAULT 'viewer',
  status collaborator_status NOT NULL DEFAULT 'active',
  invited_by uuid REFERENCES auth.users(id),
  invited_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  expires_at timestamp with time zone,
  last_active_at timestamp with time zone,
  scope text NOT NULL DEFAULT 'event' CHECK (scope IN ('event', 'all_events')),
  permissions jsonb DEFAULT '{
    "manage_rsvps": false,
    "manage_items": false,
    "post_announcements": false,
    "send_reminders": false,
    "view_contributions": false,
    "edit_event_details": false,
    "manage_payments": false,
    "invite_others": false,
    "export_data": false,
    "delete_content": false
  }'::jsonb,
  notification_settings jsonb DEFAULT '{
    "rsvps": true,
    "items": true,
    "contributions": true,
    "announcements": true,
    "reminders": true,
    "digest_only": false
  }'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create collaborator_invites table
CREATE TABLE IF NOT EXISTS public.collaborator_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  email text NOT NULL,
  role collaborator_role NOT NULL,
  permissions jsonb NOT NULL,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  invite_token uuid NOT NULL DEFAULT gen_random_uuid(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_at timestamp with time zone,
  declined_at timestamp with time zone,
  note text,
  scope text NOT NULL DEFAULT 'event',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, email)
);

-- Create collaborator_audit_log table
CREATE TABLE IF NOT EXISTS public.collaborator_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  collaborator_id uuid REFERENCES event_collaborators(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create access_requests table
CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  collaborator_id uuid NOT NULL REFERENCES event_collaborators(id) ON DELETE CASCADE,
  requested_permissions jsonb NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_event_collaborators_event_id ON event_collaborators(event_id);
CREATE INDEX idx_event_collaborators_user_id ON event_collaborators(user_id);
CREATE INDEX idx_event_collaborators_status ON event_collaborators(status);
CREATE INDEX idx_collaborator_invites_token ON collaborator_invites(invite_token);
CREATE INDEX idx_collaborator_invites_email ON collaborator_invites(email);
CREATE INDEX idx_audit_log_event_id ON collaborator_audit_log(event_id);
CREATE INDEX idx_access_requests_event_id ON access_requests(event_id);

-- Enable RLS
ALTER TABLE event_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborator_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborator_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is event owner
CREATE OR REPLACE FUNCTION public.is_event_owner(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM events
    WHERE id = _event_id AND user_id = _user_id
  );
$$;

-- Security definer function to check if user is collaborator
CREATE OR REPLACE FUNCTION public.is_event_collaborator(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_collaborators
    WHERE event_id = _event_id 
    AND user_id = _user_id 
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Security definer function to get collaborator role
CREATE OR REPLACE FUNCTION public.get_collaborator_role(_event_id uuid, _user_id uuid)
RETURNS collaborator_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM event_collaborators
  WHERE event_id = _event_id 
  AND user_id = _user_id 
  AND status = 'active'
  AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$;

-- Security definer function to check specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_event_id uuid, _user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (permissions->>_permission)::boolean
     FROM event_collaborators
     WHERE event_id = _event_id 
     AND user_id = _user_id 
     AND status = 'active'
     AND (expires_at IS NULL OR expires_at > now())
     LIMIT 1),
    false
  );
$$;

-- RLS Policies for event_collaborators
CREATE POLICY "Users can view collaborators of events they own or are part of"
  ON event_collaborators FOR SELECT
  USING (
    public.is_event_owner(event_id, auth.uid()) OR
    user_id = auth.uid()
  );

CREATE POLICY "Event owners can insert collaborators"
  ON event_collaborators FOR INSERT
  WITH CHECK (public.is_event_owner(event_id, auth.uid()));

CREATE POLICY "Event owners can update collaborators"
  ON event_collaborators FOR UPDATE
  USING (public.is_event_owner(event_id, auth.uid()));

CREATE POLICY "Event owners can delete collaborators"
  ON event_collaborators FOR DELETE
  USING (public.is_event_owner(event_id, auth.uid()));

-- RLS Policies for collaborator_invites
CREATE POLICY "Event owners can view their invites"
  ON collaborator_invites FOR SELECT
  USING (public.is_event_owner(event_id, auth.uid()));

CREATE POLICY "Event owners can create invites"
  ON collaborator_invites FOR INSERT
  WITH CHECK (public.is_event_owner(event_id, auth.uid()));

CREATE POLICY "Event owners can update invites"
  ON collaborator_invites FOR UPDATE
  USING (public.is_event_owner(event_id, auth.uid()));

CREATE POLICY "Event owners can delete invites"
  ON collaborator_invites FOR DELETE
  USING (public.is_event_owner(event_id, auth.uid()));

-- RLS Policies for collaborator_audit_log
CREATE POLICY "Event owners and collaborators can view audit logs"
  ON collaborator_audit_log FOR SELECT
  USING (
    public.is_event_owner(event_id, auth.uid()) OR
    public.is_event_collaborator(event_id, auth.uid())
  );

CREATE POLICY "System can insert audit logs"
  ON collaborator_audit_log FOR INSERT
  WITH CHECK (true);

-- RLS Policies for access_requests
CREATE POLICY "Event owners and requesting collaborator can view access requests"
  ON access_requests FOR SELECT
  USING (
    public.is_event_owner(event_id, auth.uid()) OR
    EXISTS (
      SELECT 1 FROM event_collaborators
      WHERE id = access_requests.collaborator_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Collaborators can create access requests"
  ON access_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_collaborators
      WHERE id = collaborator_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Event owners can update access requests"
  ON access_requests FOR UPDATE
  USING (public.is_event_owner(event_id, auth.uid()));

-- Triggers
CREATE TRIGGER set_event_collaborators_updated_at
  BEFORE UPDATE ON event_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Function to log collaborator actions
CREATE OR REPLACE FUNCTION log_collaborator_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO collaborator_audit_log (
    event_id,
    collaborator_id,
    user_id,
    action,
    details
  ) VALUES (
    NEW.event_id,
    NEW.id,
    auth.uid(),
    TG_OP,
    jsonb_build_object(
      'role', NEW.role,
      'status', NEW.status,
      'permissions', NEW.permissions
    )
  );
  RETURN NEW;
END;
$$;

-- Trigger for logging collaborator changes
CREATE TRIGGER log_collaborator_changes
  AFTER INSERT OR UPDATE ON event_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION log_collaborator_action();

-- Function to auto-expire collaborators
CREATE OR REPLACE FUNCTION expire_collaborators()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE event_collaborators
  SET status = 'revoked'
  WHERE expires_at < now()
  AND status = 'active';
END;
$$;

-- Function to get default permissions for role
CREATE OR REPLACE FUNCTION get_default_permissions(_role collaborator_role)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE _role
    WHEN 'co_host' THEN '{
      "manage_rsvps": true,
      "manage_items": true,
      "post_announcements": true,
      "send_reminders": true,
      "view_contributions": true,
      "edit_event_details": true,
      "manage_payments": true,
      "invite_others": true,
      "export_data": true,
      "delete_content": true
    }'::jsonb
    WHEN 'editor' THEN '{
      "manage_rsvps": true,
      "manage_items": true,
      "post_announcements": true,
      "send_reminders": true,
      "view_contributions": false,
      "edit_event_details": true,
      "manage_payments": false,
      "invite_others": false,
      "export_data": true,
      "delete_content": false
    }'::jsonb
    WHEN 'viewer' THEN '{
      "manage_rsvps": false,
      "manage_items": false,
      "post_announcements": false,
      "send_reminders": false,
      "view_contributions": false,
      "edit_event_details": false,
      "manage_payments": false,
      "invite_others": false,
      "export_data": false,
      "delete_content": false
    }'::jsonb
    ELSE '{}'::jsonb
  END;
END;
$$;