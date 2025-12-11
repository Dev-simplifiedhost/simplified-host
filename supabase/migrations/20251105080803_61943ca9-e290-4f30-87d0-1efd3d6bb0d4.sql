-- Phase 4: Rate Limiting & API Protection
-- Track API requests for rate limiting and abuse detection

-- Create table to track API requests
CREATE TABLE IF NOT EXISTS public.api_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP address, user ID, or email
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_api_requests_identifier_endpoint 
ON public.api_requests(identifier, endpoint, window_start DESC);

CREATE INDEX IF NOT EXISTS idx_api_requests_blocked 
ON public.api_requests(identifier, blocked_until) 
WHERE blocked_until IS NOT NULL;

-- Enable RLS
ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table (for edge functions)
CREATE POLICY "Service role can manage api_requests"
ON public.api_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Function to check and record rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_request_count INTEGER;
  v_blocked_until TIMESTAMPTZ;
  v_is_blocked BOOLEAN := false;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Check if currently blocked
  SELECT blocked_until INTO v_blocked_until
  FROM api_requests
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND blocked_until > now()
  ORDER BY blocked_until DESC
  LIMIT 1;
  
  IF v_blocked_until IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked_until', v_blocked_until,
      'message', 'Too many requests. Please try again later.'
    );
  END IF;
  
  -- Get or create request record for current window
  SELECT request_count INTO v_request_count
  FROM api_requests
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND window_start > v_window_start
  ORDER BY window_start DESC
  LIMIT 1;
  
  IF v_request_count IS NULL THEN
    -- First request in this window
    INSERT INTO api_requests (identifier, endpoint, request_count, window_start)
    VALUES (p_identifier, p_endpoint, 1, now());
    
    RETURN jsonb_build_object(
      'allowed', true,
      'requests_remaining', p_max_requests - 1
    );
  ELSIF v_request_count >= p_max_requests THEN
    -- Rate limit exceeded - block for increasing duration based on violations
    v_blocked_until := now() + (p_window_minutes || ' minutes')::INTERVAL;
    
    UPDATE api_requests
    SET blocked_until = v_blocked_until
    WHERE identifier = p_identifier
      AND endpoint = p_endpoint
      AND window_start > v_window_start;
    
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked_until', v_blocked_until,
      'message', 'Rate limit exceeded. Please slow down.'
    );
  ELSE
    -- Increment counter
    UPDATE api_requests
    SET request_count = request_count + 1
    WHERE identifier = p_identifier
      AND endpoint = p_endpoint
      AND window_start > v_window_start;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'requests_remaining', p_max_requests - (v_request_count + 1)
    );
  END IF;
END;
$$;

-- Function to clean up old rate limit records
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete records older than 24 hours
  DELETE FROM public.api_requests
  WHERE window_start < now() - INTERVAL '24 hours'
    AND (blocked_until IS NULL OR blocked_until < now());
END;
$$;

-- Create table for IP blocking (manual or automatic)
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL UNIQUE,
  reason TEXT,
  blocked_by UUID REFERENCES auth.users(id),
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_permanent BOOLEAN NOT NULL DEFAULT false,
  violation_count INTEGER NOT NULL DEFAULT 1
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON public.blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires ON public.blocked_ips(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view (for admin purposes)
CREATE POLICY "Authenticated users can view blocked_ips"
ON public.blocked_ips
FOR SELECT
TO authenticated
USING (true);

-- Function to check if IP is blocked
CREATE OR REPLACE FUNCTION public.is_ip_blocked(p_ip_address INET)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_blocked BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM blocked_ips
    WHERE ip_address = p_ip_address
      AND (is_permanent = true OR expires_at > now())
  ) INTO v_is_blocked;
  
  RETURN COALESCE(v_is_blocked, false);
END;
$$;

-- Function to auto-block abusive IPs
CREATE OR REPLACE FUNCTION public.auto_block_abusive_ip(
  p_ip_address INET,
  p_reason TEXT DEFAULT 'Automated block due to suspicious activity'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_violations INTEGER;
BEGIN
  -- Check if already blocked
  SELECT violation_count INTO v_existing_violations
  FROM blocked_ips
  WHERE ip_address = p_ip_address;
  
  IF v_existing_violations IS NOT NULL THEN
    -- Increase violation count and extend block
    UPDATE blocked_ips
    SET violation_count = violation_count + 1,
        expires_at = CASE
          WHEN violation_count >= 3 THEN NULL -- Permanent on 3rd violation
          ELSE now() + (POWER(2, violation_count) || ' hours')::INTERVAL
        END,
        is_permanent = (violation_count >= 3)
    WHERE ip_address = p_ip_address;
  ELSE
    -- First violation - temporary block
    INSERT INTO blocked_ips (ip_address, reason, expires_at)
    VALUES (p_ip_address, p_reason, now() + INTERVAL '1 hour');
  END IF;
END;
$$;