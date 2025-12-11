-- Create table for tracking login attempts (for progressive throttling)
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- email or IP hash
  attempt_type text NOT NULL, -- 'failed' or 'successful'
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX idx_login_attempts_identifier ON public.login_attempts(identifier, attempted_at DESC);
CREATE INDEX idx_login_attempts_created_at ON public.login_attempts(created_at);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Only system can insert login attempts
CREATE POLICY "System can insert login attempts"
ON public.login_attempts
FOR INSERT
WITH CHECK (true);

-- Users cannot view login attempts (admin-only in future)
CREATE POLICY "No public access to login attempts"
ON public.login_attempts
FOR SELECT
USING (false);

-- Function to clean up old login attempts (older than 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.login_attempts
  WHERE created_at < now() - interval '24 hours';
END;
$$;

-- Function to get failed login count in last hour
CREATE OR REPLACE FUNCTION public.get_failed_login_count(
  p_identifier text,
  p_minutes integer DEFAULT 60
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM public.login_attempts
  WHERE identifier = p_identifier
    AND attempt_type = 'failed'
    AND attempted_at > now() - (p_minutes || ' minutes')::interval;
  
  RETURN COALESCE(v_count, 0);
END;
$$;

-- Function to record login attempt
CREATE OR REPLACE FUNCTION public.record_login_attempt(
  p_identifier text,
  p_attempt_type text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.login_attempts (identifier, attempt_type, ip_address, user_agent)
  VALUES (p_identifier, p_attempt_type, p_ip_address, p_user_agent);
END;
$$;