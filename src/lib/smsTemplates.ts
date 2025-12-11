/**
 * SMS Template Library for Free-Tier Messaging System
 * Templates follow PRD specifications with 155 character limit
 */

export type ReminderType = 
  | 'bulk_rsvp' 
  | 'rsvp' 
  | 'payment' 
  | 'event_date' 
  | 'item_claim'
  | 'bring_items'
  | 'thank_you';

export type TemplateTier = 'free' | 'pro';

export interface SmsTemplate {
  id: ReminderType;
  name: string;
  description: string;
  template: string;
  requiredLinkVariables: string[];
  tier: TemplateTier;
}

// Editable variables (purely informational - can be freely edited/removed)
export const EDITABLE_VARIABLES = ['{EventName}', '{EventDate}'] as const;

// Hard-locked link variables (CANNOT be removed/modified)
export const LOCKED_LINK_VARIABLES = [
  '{RSVPLink}',
  '{EventLink}',
  '{PaymentLink}',
  '{ItemLink}',
] as const;

export const SMS_CHARACTER_LIMIT = 155;

// Template library - ALL templates are now editable per PRD
export const SMS_TEMPLATES: Record<ReminderType, SmsTemplate> = {
  bulk_rsvp: {
    id: 'bulk_rsvp',
    name: 'Bulk RSVP Reminder',
    description: 'Send to all guests who haven\'t responded',
    template: 'Quick reminder to RSVP for {EventName} on {EventDate}. We\'re finalizing plans—please tap to respond: {RSVPLink}',
    requiredLinkVariables: ['{RSVPLink}'],
    tier: 'free',
  },
  rsvp: {
    id: 'rsvp',
    name: 'RSVP Reminder',
    description: 'Remind a single guest to RSVP',
    template: 'Please RSVP for {EventName} on {EventDate}. Your response helps the host prepare. Tap here: {RSVPLink}',
    requiredLinkVariables: ['{RSVPLink}'],
    tier: 'free',
  },
  payment: {
    id: 'payment',
    name: 'Contribution Reminder',
    description: 'Remind guest to complete their contribution',
    template: 'A reminder to complete your contribution for {EventName}. It really helps the host prepare. Pay here: {PaymentLink}',
    requiredLinkVariables: ['{PaymentLink}'],
    tier: 'free',
  },
  event_date: {
    id: 'event_date',
    name: 'Event Day Details',
    description: 'Remind guest about upcoming event',
    template: '{EventName} is coming up on {EventDate}. Looking forward to seeing you! Details: {EventLink}',
    requiredLinkVariables: ['{EventLink}'],
    tier: 'free',
  },
  item_claim: {
    id: 'item_claim',
    name: 'Item Claim Reminder',
    description: 'Remind guest to confirm what they\'re bringing',
    template: 'Please confirm or update what you\'re bringing for {EventName}. Review your items: {ItemLink}',
    requiredLinkVariables: ['{ItemLink}'],
    tier: 'free',
  },
  bring_items: {
    id: 'bring_items',
    name: 'Bring Your Items',
    description: 'Remind guests what they claimed to bring',
    template: "Don't forget what you claimed for {EventName}! Check your items: {ItemLink}",
    requiredLinkVariables: ['{ItemLink}'],
    tier: 'pro',
  },
  thank_you: {
    id: 'thank_you',
    name: 'Thank You Message',
    description: 'Send appreciation after the event',
    template: 'Thank you for being part of {EventName}! We hope you had a wonderful time. {EventLink}',
    requiredLinkVariables: ['{EventLink}'],
    tier: 'pro',
  },
};

export interface TemplateVariables {
  eventName: string;
  eventDate: string;
  eventCode: string;
  guestToken?: string;
}

/**
 * Generate all template links based on event and guest data
 */
export function generateTemplateLinks(
  eventCode: string,
  guestToken?: string
): Record<string, string> {
  const baseUrl = window.location.origin;
  const eventUrl = `${baseUrl}/event/${eventCode}`;
  
  return {
    '{RSVPLink}': guestToken ? `${eventUrl}?token=${guestToken}` : eventUrl,
    '{EventLink}': eventUrl,
    '{PaymentLink}': guestToken ? `${eventUrl}?token=${guestToken}#contribute` : `${eventUrl}#contribute`,
    '{ItemLink}': guestToken ? `${eventUrl}?token=${guestToken}#items` : `${eventUrl}#items`,
  };
}

/**
 * Substitute variables in a template string
 */
export function substituteVariables(
  template: string,
  variables: TemplateVariables
): string {
  const links = generateTemplateLinks(variables.eventCode, variables.guestToken);
  
  let result = template;
  result = result.replace(/{EventName}/g, variables.eventName);
  result = result.replace(/{EventDate}/g, variables.eventDate);
  result = result.replace(/{RSVPLink}/g, links['{RSVPLink}']);
  result = result.replace(/{EventLink}/g, links['{EventLink}']);
  result = result.replace(/{PaymentLink}/g, links['{PaymentLink}']);
  result = result.replace(/{ItemLink}/g, links['{ItemLink}']);
  
  return result;
}

/**
 * Validate that a message doesn't exceed character limit
 */
export function validateCharacterLimit(message: string): {
  valid: boolean;
  count: number;
  remaining: number;
} {
  const count = message.length;
  return {
    valid: count <= SMS_CHARACTER_LIMIT,
    count,
    remaining: SMS_CHARACTER_LIMIT - count,
  };
}

/**
 * Get list of missing required link variables for a template
 */
export function getMissingLinkVariables(
  message: string,
  templateId: ReminderType
): string[] {
  const template = SMS_TEMPLATES[templateId];
  const missingLinks: string[] = [];
  
  for (const linkVar of template.requiredLinkVariables) {
    if (!message.includes(linkVar)) {
      missingLinks.push(linkVar);
    }
  }
  
  return missingLinks;
}

/**
 * Check if all required link variables are present in the message
 */
export function validateRequiredLinks(
  message: string,
  templateId: ReminderType
): {
  valid: boolean;
  missingLinks: string[];
} {
  const missingLinks = getMissingLinkVariables(message, templateId);
  
  return {
    valid: missingLinks.length === 0,
    missingLinks,
  };
}

/**
 * Check if user has removed any required link variables
 * (Only checks LOCKED_LINK_VARIABLES, not EventName/EventDate)
 */
export function detectLinkVariableRemoval(
  originalTemplate: string,
  modifiedTemplate: string
): boolean {
  // Only check link variables
  for (const linkVar of LOCKED_LINK_VARIABLES) {
    const wasPresent = originalTemplate.includes(linkVar);
    const isPresent = modifiedTemplate.includes(linkVar);
    
    // If it was in the original and is now removed, that's a violation
    if (wasPresent && !isPresent) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get display-friendly reminder type name
 */
export function getReminderTypeName(type: ReminderType): string {
  return SMS_TEMPLATES[type]?.name || type;
}

/**
 * Format date for SMS display (short format)
 */
export function formatDateForSms(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Get user-friendly name for a link variable
 */
export function getLinkVariableDisplayName(linkVar: string): string {
  const names: Record<string, string> = {
    '{RSVPLink}': 'RSVP link',
    '{EventLink}': 'event link',
    '{PaymentLink}': 'payment link',
    '{ItemLink}': 'item link',
  };
  return names[linkVar] || linkVar;
}

/**
 * Check if a template is available for the current tier
 */
export function isTemplateAvailable(templateId: ReminderType, isProUser: boolean): boolean {
  const template = SMS_TEMPLATES[templateId];
  if (!template) return false;
  return template.tier === 'free' || isProUser;
}

/**
 * Get all templates filtered by tier
 */
export function getAvailableTemplates(isProUser: boolean): SmsTemplate[] {
  return Object.values(SMS_TEMPLATES).filter(
    template => template.tier === 'free' || isProUser
  );
}

/**
 * Get all templates with Pro badge indicators for UI display
 */
export function getAllTemplatesWithTierInfo(): (SmsTemplate & { locked: boolean })[] {
  return Object.values(SMS_TEMPLATES).map(template => ({
    ...template,
    locked: template.tier === 'pro',
  }));
}

/**
 * Get free-tier templates only
 */
export function getFreeTemplates(): SmsTemplate[] {
  return Object.values(SMS_TEMPLATES).filter(template => template.tier === 'free');
}

/**
 * Get pro-tier templates only
 */
export function getProTemplates(): SmsTemplate[] {
  return Object.values(SMS_TEMPLATES).filter(template => template.tier === 'pro');
}
