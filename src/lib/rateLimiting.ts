/**
 * Rate Limiting Utilities
 * Client-side rate limit tracking and enforcement
 */

interface RateLimitState {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}

const rateLimitStore: Record<string, RateLimitState> = {};

/**
 * Client-side rate limit check (optimistic)
 * This provides immediate feedback before server validation
 */
export const checkClientRateLimit = (
  endpoint: string,
  maxRequests: number = 10,
  windowMs: number = 60000 // 1 minute default
): { allowed: boolean; message?: string; retryAfter?: number } => {
  const key = endpoint;
  const now = Date.now();
  
  // Initialize if doesn't exist
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = {
      count: 0,
      windowStart: now
    };
  }
  
  const state = rateLimitStore[key];
  
  // Check if currently blocked
  if (state.blockedUntil && state.blockedUntil > now) {
    const retryAfter = Math.ceil((state.blockedUntil - now) / 1000);
    return {
      allowed: false,
      message: `Too many requests. Please wait ${retryAfter} seconds.`,
      retryAfter
    };
  }
  
  // Reset window if expired
  if (now - state.windowStart > windowMs) {
    state.count = 0;
    state.windowStart = now;
    state.blockedUntil = undefined;
  }
  
  // Check limit
  if (state.count >= maxRequests) {
    state.blockedUntil = now + windowMs;
    return {
      allowed: false,
      message: 'Rate limit exceeded. Please slow down.',
      retryAfter: Math.ceil(windowMs / 1000)
    };
  }
  
  // Increment and allow
  state.count++;
  return { allowed: true };
};

/**
 * Reset rate limit for an endpoint (useful after successful operations)
 */
export const resetRateLimit = (endpoint: string) => {
  delete rateLimitStore[endpoint];
};

/**
 * Get current rate limit status for an endpoint
 */
export const getRateLimitStatus = (endpoint: string) => {
  const state = rateLimitStore[endpoint];
  if (!state) return null;
  
  const now = Date.now();
  return {
    count: state.count,
    isBlocked: !!(state.blockedUntil && state.blockedUntil > now),
    blockedUntil: state.blockedUntil,
  };
};

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Authentication
  SIGNUP: { maxRequests: 3, windowMinutes: 60 },
  SIGNIN: { maxRequests: 5, windowMinutes: 15 },
  
  // Public forms
  RSVP_SUBMIT: { maxRequests: 10, windowMinutes: 5 },
  ITEM_CLAIM: { maxRequests: 20, windowMinutes: 5 },
  ITEM_ADD: { maxRequests: 10, windowMinutes: 5 },
  
  // AI operations
  GENERATE_PLAN: { maxRequests: 5, windowMinutes: 10 },
  GENERATE_GROCERY: { maxRequests: 10, windowMinutes: 10 },
  
  // General operations
  CREATE_EVENT: { maxRequests: 20, windowMinutes: 60 },
  UPDATE_EVENT: { maxRequests: 50, windowMinutes: 60 },
  
  // API calls
  DEFAULT: { maxRequests: 60, windowMinutes: 1 },
} as const;

/**
 * Format rate limit error message
 */
export const formatRateLimitError = (retryAfter?: number): string => {
  if (!retryAfter) return 'Too many requests. Please try again later.';
  
  if (retryAfter < 60) {
    return `Too many requests. Please wait ${retryAfter} seconds.`;
  }
  
  const minutes = Math.ceil(retryAfter / 60);
  return `Too many requests. Please wait ${minutes} minute${minutes > 1 ? 's' : ''}.`;
};
