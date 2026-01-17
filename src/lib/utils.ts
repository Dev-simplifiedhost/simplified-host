import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get the base URL for the current environment
 * Checks VITE_APP_URL env var first, then falls back to window.location.origin
 * This ensures magic links redirect to the correct environment (staging/prod/local)
 */
export function getBaseUrl(): string {
  // Check for explicit environment variable (set in .env files)
  const envUrl = import.meta.env.VITE_APP_URL;
  if (envUrl) {
    return envUrl;
  }
  
  // Fall back to current origin (works for local dev and deployed environments)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Fallback for SSR (shouldn't happen in this app, but safe)
  return 'http://localhost:8080';
}
