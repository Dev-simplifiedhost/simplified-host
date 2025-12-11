import { useState, useCallback } from 'react';
import { checkClientRateLimit, resetRateLimit, RATE_LIMITS, formatRateLimitError } from '@/lib/rateLimiting';
import { toast } from 'sonner';

type RateLimitKey = keyof typeof RATE_LIMITS;

interface UseRateLimitOptions {
  showToast?: boolean;
}

export const useRateLimit = (endpoint: RateLimitKey, options: UseRateLimitOptions = {}) => {
  const { showToast = true } = options;
  const [isBlocked, setIsBlocked] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | undefined>();
  
  const config = RATE_LIMITS[endpoint];
  
  const checkLimit = useCallback((): boolean => {
    const result = checkClientRateLimit(
      endpoint,
      config.maxRequests,
      config.windowMinutes * 60 * 1000
    );
    
    if (!result.allowed) {
      setIsBlocked(true);
      setRetryAfter(result.retryAfter);
      
      if (showToast) {
        toast.error(formatRateLimitError(result.retryAfter));
      }
      
      // Auto-unblock after retry period
      if (result.retryAfter) {
        setTimeout(() => {
          setIsBlocked(false);
          setRetryAfter(undefined);
        }, result.retryAfter * 1000);
      }
      
      return false;
    }
    
    return true;
  }, [endpoint, config, showToast]);
  
  const reset = useCallback(() => {
    resetRateLimit(endpoint);
    setIsBlocked(false);
    setRetryAfter(undefined);
  }, [endpoint]);
  
  return {
    checkLimit,
    reset,
    isBlocked,
    retryAfter,
  };
};
