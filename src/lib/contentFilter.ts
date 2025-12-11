/**
 * Content filtering utilities for item names, notes, and suggestions
 * Provides basic profanity filtering, personal data detection, and duplicate detection
 */

// Basic profanity blocklist (common variations)
const PROFANITY_LIST = [
  'fuck', 'shit', 'ass', 'damn', 'bitch', 'crap', 'piss', 'dick', 'cock',
  'pussy', 'asshole', 'bastard', 'slut', 'whore', 'cunt', 'nigger', 'fag',
  'retard', 'idiot', 'stupid'
];

// Patterns for personal data detection
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_PATTERN = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const SSN_PATTERN = /\d{3}[-\s]?\d{2}[-\s]?\d{4}/g;

// Malicious URL patterns
const MALICIOUS_URL_PATTERNS = [
  /^javascript:/i,
  /^data:/i,
  /^vbscript:/i,
  /^file:/i,
];

export interface ContentFilterResult {
  isClean: boolean;
  issues: string[];
  sanitizedText?: string;
}

/**
 * Check text for profanity
 */
export function containsProfanity(text: string): boolean {
  const lowerText = text.toLowerCase();
  return PROFANITY_LIST.some(word => {
    // Match whole words only
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lowerText);
  });
}

/**
 * Check text for personal data (emails, phone numbers, SSNs)
 */
export function containsPersonalData(text: string): { hasPersonalData: boolean; types: string[] } {
  const types: string[] = [];
  
  if (EMAIL_PATTERN.test(text)) {
    types.push('email address');
  }
  if (PHONE_PATTERN.test(text)) {
    types.push('phone number');
  }
  if (SSN_PATTERN.test(text)) {
    types.push('SSN');
  }
  
  return {
    hasPersonalData: types.length > 0,
    types
  };
}

/**
 * Validate and filter content for items/suggestions
 */
export function filterContent(text: string): ContentFilterResult {
  const issues: string[] = [];
  
  if (!text || text.trim().length === 0) {
    return { isClean: true, issues: [], sanitizedText: '' };
  }
  
  // Check for profanity
  if (containsProfanity(text)) {
    issues.push('Content contains inappropriate language');
  }
  
  // Check for personal data
  const personalData = containsPersonalData(text);
  if (personalData.hasPersonalData) {
    issues.push(`Content contains personal information (${personalData.types.join(', ')})`);
  }
  
  return {
    isClean: issues.length === 0,
    issues,
    sanitizedText: text.trim()
  };
}

/**
 * Validate URL for safety
 */
export function validateUrl(url: string): { isValid: boolean; error?: string } {
  if (!url || url.trim().length === 0) {
    return { isValid: true }; // Empty URL is valid (optional field)
  }
  
  const trimmedUrl = url.trim();
  
  // Check for malicious patterns
  for (const pattern of MALICIOUS_URL_PATTERNS) {
    if (pattern.test(trimmedUrl)) {
      return { isValid: false, error: 'URL contains potentially dangerous content' };
    }
  }
  
  // Require https:// prefix
  if (!trimmedUrl.startsWith('https://')) {
    if (trimmedUrl.startsWith('http://')) {
      return { isValid: false, error: 'Only secure (HTTPS) links are allowed' };
    }
    return { isValid: false, error: 'URL must start with https://' };
  }
  
  // Basic URL validation
  try {
    new URL(trimmedUrl);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * Extract domain from URL for preview
 */
export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

/**
 * Calculate word similarity between two strings (for duplicate detection)
 * Returns a value between 0 and 1 (1 = identical)
 */
export function calculateSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = text2.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) {
    return 0;
  }
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  let intersection = 0;
  set1.forEach(word => {
    if (set2.has(word)) intersection++;
  });
  
  const union = new Set([...words1, ...words2]).size;
  
  return union > 0 ? intersection / union : 0;
}

/**
 * Check if a suggestion is similar to existing items (80% threshold)
 */
export function findSimilarItem(
  newItemName: string, 
  existingItems: { name: string; id?: string }[]
): { isSimilar: boolean; matchedItem?: string } {
  const SIMILARITY_THRESHOLD = 0.8;
  
  for (const item of existingItems) {
    const similarity = calculateSimilarity(newItemName, item.name);
    if (similarity >= SIMILARITY_THRESHOLD) {
      return { isSimilar: true, matchedItem: item.name };
    }
  }
  
  return { isSimilar: false };
}

/**
 * Character limit constants
 */
export const CHAR_LIMITS = {
  ITEM_NAME: 50,
  ITEM_NOTES: 200,
  SUGGESTION_NAME: 50,
  SUGGESTION_NOTES: 200,
} as const;

/**
 * Enforce character limit on text
 */
export function enforceCharLimit(text: string, limit: number): string {
  return text.slice(0, limit);
}
