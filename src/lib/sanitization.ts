/**
 * Input Sanitization Utilities
 * Protects against XSS, injection attacks, and malicious input
 */

/**
 * Sanitize text input by removing potentially dangerous characters
 * Allows letters, numbers, spaces, and common punctuation
 */
export const sanitizeText = (input: string): string => {
  if (!input) return '';
  
  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove script-like content
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  return sanitized;
};

/**
 * Sanitize email input
 */
export const sanitizeEmail = (email: string): string => {
  if (!email) return '';
  
  // Convert to lowercase and trim
  let sanitized = email.toLowerCase().trim();
  
  // Remove any characters that aren't valid in emails
  sanitized = sanitized.replace(/[^a-z0-9@.\-_+]/g, '');
  
  return sanitized;
};

/**
 * Sanitize name input (allows letters, spaces, hyphens, apostrophes)
 */
export const sanitizeName = (name: string): string => {
  if (!name) return '';
  
  // Remove HTML and scripts
  let sanitized = name.replace(/<[^>]*>/g, '');
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Only allow letters, spaces, hyphens, apostrophes, and common international characters
  sanitized = sanitized.replace(/[^a-zA-Z\s\-'àáâäãåąčćęèéêëėįìíîïłńòóôöõøùúûüųūÿýżźñçčšžÀÁÂÄÃÅĄĆČĖĘÈÉÊËÌÍÎÏĮŁŃÒÓÔÖÕØÙÚÛÜŲŪŸÝŻŹÑßÇŒÆČŠŽ∂ð]/g, '');
  
  // Normalize multiple spaces
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Capitalize first letter of each word
  sanitized = sanitized.replace(/\b\w/g, (char) => char.toUpperCase());
  
  return sanitized;
};

/**
 * Sanitize URL input
 */
export const sanitizeUrl = (url: string): string => {
  if (!url) return '';
  
  const trimmed = url.trim();
  
  // Only allow http and https protocols
  if (!trimmed.match(/^https?:\/\//i)) {
    return '';
  }
  
  // Check for javascript: protocol and other dangerous patterns
  if (trimmed.match(/javascript:/gi) || trimmed.match(/data:/gi)) {
    return '';
  }
  
  return trimmed;
};

/**
 * Sanitize phone number input
 */
export const sanitizePhone = (phone: string): string => {
  if (!phone) return '';
  
  // Remove all non-numeric characters except + and spaces
  let sanitized = phone.replace(/[^\d+\s\-()]/g, '');
  
  // Normalize formatting
  sanitized = sanitized.trim();
  
  return sanitized;
};

/**
 * Sanitize textarea/long text input
 * More permissive than sanitizeText but still safe
 */
export const sanitizeLongText = (input: string, maxLength: number = 5000): string => {
  if (!input) return '';
  
  // Remove HTML tags
  let sanitized = input.replace(/<script[^>]*>.*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<[^>]*>/g, '');
  
  // Remove dangerous patterns
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=/gi, '');
  
  // Normalize line breaks
  sanitized = sanitized.replace(/\r\n/g, '\n');
  sanitized = sanitized.replace(/\r/g, '\n');
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized.trim();
};

/**
 * Validate and sanitize event code (alphanumeric only)
 */
export const sanitizeEventCode = (code: string): string => {
  if (!code) return '';
  
  // Only allow alphanumeric characters, convert to uppercase
  return code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
};

/**
 * General purpose input limiter
 */
export const enforceMaxLength = (input: string, maxLength: number): string => {
  if (!input) return '';
  return input.substring(0, maxLength);
};
