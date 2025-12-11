/**
 * Client-side rate limiting utilities for the item system
 * Prevents abuse by limiting actions per time window
 */

interface RateLimitState {
  timestamps: number[];
}

// Storage keys for different action types
const RATE_LIMIT_KEYS = {
  GUEST_SUGGESTIONS: 'item_rate_limit_suggestions',
  GUEST_CLAIMS: 'item_rate_limit_claims',
  HOST_ACTIONS: 'item_rate_limit_host',
  GUEST_QUICK_SUGGEST: 'item_rate_limit_quick_suggest',
} as const;

// Rate limit configurations
export const RATE_LIMIT_CONFIGS = {
  // Guest suggestions: max 3 per 5 minutes
  GUEST_SUGGESTIONS: {
    maxActions: 3,
    windowMs: 5 * 60 * 1000, // 5 minutes
    key: RATE_LIMIT_KEYS.GUEST_SUGGESTIONS,
  },
  // Guest claiming/unclaiming: max 5 per 10 seconds
  GUEST_CLAIMS: {
    maxActions: 5,
    windowMs: 10 * 1000, // 10 seconds
    key: RATE_LIMIT_KEYS.GUEST_CLAIMS,
  },
  // Host creation/editing: max 20 per 30 seconds
  HOST_ACTIONS: {
    maxActions: 20,
    windowMs: 30 * 1000, // 30 seconds
    key: RATE_LIMIT_KEYS.HOST_ACTIONS,
  },
  // Guest quick suggestions: 1 per 10 seconds
  GUEST_QUICK_SUGGEST: {
    maxActions: 1,
    windowMs: 10 * 1000, // 10 seconds
    key: RATE_LIMIT_KEYS.GUEST_QUICK_SUGGEST,
  },
} as const;

type RateLimitType = keyof typeof RATE_LIMIT_CONFIGS;

/**
 * Get rate limit state from localStorage
 */
function getRateLimitState(key: string): RateLimitState {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return { timestamps: [] };
}

/**
 * Save rate limit state to localStorage
 */
function setRateLimitState(key: string, state: RateLimitState): void {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clean up old timestamps outside the window
 */
function cleanupTimestamps(timestamps: number[], windowMs: number): number[] {
  const now = Date.now();
  return timestamps.filter(ts => now - ts < windowMs);
}

/**
 * Check if an action is allowed based on rate limits
 */
export function checkRateLimit(type: RateLimitType): {
  allowed: boolean;
  remainingActions: number;
  retryAfterMs?: number;
  message?: string;
} {
  const config = RATE_LIMIT_CONFIGS[type];
  const state = getRateLimitState(config.key);
  
  // Clean up old timestamps
  const validTimestamps = cleanupTimestamps(state.timestamps, config.windowMs);
  
  // Check if we're at the limit
  if (validTimestamps.length >= config.maxActions) {
    const oldestTimestamp = Math.min(...validTimestamps);
    const retryAfterMs = config.windowMs - (Date.now() - oldestTimestamp);
    
    return {
      allowed: false,
      remainingActions: 0,
      retryAfterMs,
      message: formatRetryMessage(type, retryAfterMs),
    };
  }
  
  return {
    allowed: true,
    remainingActions: config.maxActions - validTimestamps.length,
  };
}

/**
 * Record an action (call this after successful action)
 */
export function recordAction(type: RateLimitType): void {
  const config = RATE_LIMIT_CONFIGS[type];
  const state = getRateLimitState(config.key);
  
  // Clean up and add new timestamp
  const validTimestamps = cleanupTimestamps(state.timestamps, config.windowMs);
  validTimestamps.push(Date.now());
  
  setRateLimitState(config.key, { timestamps: validTimestamps });
}

/**
 * Reset rate limit for a specific type (useful for testing)
 */
export function resetRateLimit(type: RateLimitType): void {
  const config = RATE_LIMIT_CONFIGS[type];
  localStorage.removeItem(config.key);
}

/**
 * Format a human-readable retry message
 */
function formatRetryMessage(type: RateLimitType, retryAfterMs: number): string {
  const seconds = Math.ceil(retryAfterMs / 1000);
  const minutes = Math.ceil(retryAfterMs / 60000);
  
  const timeStr = seconds > 60 
    ? `${minutes} minute${minutes > 1 ? 's' : ''}`
    : `${seconds} second${seconds > 1 ? 's' : ''}`;
  
  switch (type) {
    case 'GUEST_SUGGESTIONS':
      return `You've reached the suggestion limit. Please wait ${timeStr}.`;
    case 'GUEST_CLAIMS':
      return `Too many claim actions. Please wait ${timeStr}.`;
    case 'HOST_ACTIONS':
      return `Too many actions. Please wait ${timeStr}.`;
    case 'GUEST_QUICK_SUGGEST':
      return `Please wait ${timeStr} before suggesting again.`;
    default:
      return `Please wait ${timeStr} before trying again.`;
  }
}

/**
 * Hook-friendly rate limit check that returns state for UI
 */
export function getRateLimitStatus(type: RateLimitType): {
  canAct: boolean;
  remaining: number;
  resetInMs?: number;
} {
  const result = checkRateLimit(type);
  return {
    canAct: result.allowed,
    remaining: result.remainingActions,
    resetInMs: result.retryAfterMs,
  };
}

/**
 * Debounce utility to prevent rapid double-clicks
 */
export function createDebouncer(delayMs: number = 500) {
  let lastActionTime = 0;
  
  return {
    canAct: (): boolean => {
      const now = Date.now();
      if (now - lastActionTime < delayMs) {
        return false;
      }
      lastActionTime = now;
      return true;
    },
    reset: () => {
      lastActionTime = 0;
    },
  };
}
