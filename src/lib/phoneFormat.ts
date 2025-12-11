import { parsePhoneNumber, isValidPhoneNumber, formatPhoneNumberIntl } from 'react-phone-number-input';

/**
 * Format a phone number for display with international support
 */
export function formatPhoneNumber(phone: string, countryCode: string = 'US'): string {
  if (!phone) return '';
  
  try {
    // Try to parse and format the phone number
    const phoneNumber = parsePhoneNumber(phone, countryCode as any);
    if (phoneNumber) {
      return phoneNumber.formatInternational();
    }
  } catch (error) {
    // If parsing fails, return the cleaned number with a plus sign
    const cleaned = phone.replace(/\D/g, '');
    return cleaned ? `+${cleaned}` : '';
  }
  
  return phone;
}

/**
 * Validate phone number for a specific country
 */
export function validatePhoneNumber(phone: string, countryCode: string = 'US'): boolean {
  if (!phone) return false;
  try {
    // If already in international format, validate directly
    if (phone.startsWith('+')) {
      return isValidPhoneNumber(phone);
    }
    // Otherwise, parse with country and validate
    const parsed = parsePhoneNumber(phone, countryCode as any);
    return parsed ? parsed.isValid() : false;
  } catch (error) {
    return false;
  }
}

/**
 * Clean phone number for storage (keep international format with +)
 */
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // If it already starts with +, keep it as-is but remove spaces and other formatting
  if (phone.startsWith('+')) {
    return phone.replace(/[^\d+]/g, '');
  }
  
  // Otherwise, just remove all non-digit characters
  return phone.replace(/\D/g, '');
}

/**
 * Get example phone number format for a country
 */
export function getExampleNumber(countryCode: string = 'US'): string {
  const examples: Record<string, string> = {
    US: '+1 (555) 123-4567',
    GB: '+44 20 7123 4567',
    IN: '+91 98765 43210',
    AU: '+61 4 1234 5678',
    CA: '+1 (555) 123-4567',
    DE: '+49 30 12345678',
    FR: '+33 1 23 45 67 89',
    JP: '+81 3-1234-5678',
    CN: '+86 138 0000 0000',
  };
  
  return examples[countryCode] || '+1 (555) 123-4567';
}
