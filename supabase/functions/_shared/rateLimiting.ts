/**
 * Server-side rate limiting utilities for edge functions
 */

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

interface RateLimitResult {
  allowed: boolean;
  message?: string;
  blockedUntil?: string;
  requestsRemaining?: number;
}

/**
 * Check and enforce rate limits on edge functions
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  identifier: string,
  endpoint: string,
  maxRequests: number = 10,
  windowMinutes: number = 1
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_minutes: windowMinutes,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // Fail open on error (allow request but log)
      return { allowed: true };
    }

    return data as RateLimitResult;
  } catch (error) {
    console.error('Rate limit exception:', error);
    // Fail open on exception
    return { allowed: true };
  }
}

/**
 * Get client IP address from request
 */
export function getClientIp(req: Request): string {
  // Try various headers that might contain the real IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a default (shouldn't happen in production)
  return 'unknown';
}

/**
 * Check if IP is blocked
 */
export async function isIpBlocked(
  supabase: SupabaseClient,
  ipAddress: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('is_ip_blocked', {
      p_ip_address: ipAddress,
    });

    if (error) {
      console.error('IP block check error:', error);
      return false; // Fail open
    }

    return data === true;
  } catch (error) {
    console.error('IP block exception:', error);
    return false; // Fail open
  }
}

/**
 * Rate limit configurations matching frontend
 */
export const RATE_LIMITS = {
  // AI operations
  GENERATE_PLAN: { maxRequests: 5, windowMinutes: 10 },
  GENERATE_GROCERY: { maxRequests: 10, windowMinutes: 10 },
  
  // reCAPTCHA verification
  VERIFY_RECAPTCHA: { maxRequests: 20, windowMinutes: 1 },
  
  // Default
  DEFAULT: { maxRequests: 60, windowMinutes: 1 },
} as const;

/**
 * Create a standardized rate limit error response
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  const retryAfter = result.blockedUntil 
    ? Math.ceil((new Date(result.blockedUntil).getTime() - Date.now()) / 1000)
    : 60;

  return new Response(
    JSON.stringify({
      error: result.message || 'Rate limit exceeded',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Remaining': (result.requestsRemaining || 0).toString(),
      },
    }
  );
}
