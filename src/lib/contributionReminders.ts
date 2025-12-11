/**
 * Contribution reminder utilities with rate limiting
 */

const REMINDER_COOLDOWN_DAYS = 3;
const STORAGE_KEY_PREFIX = 'contribution_reminder_';

interface ReminderCheckResult {
  allowed: boolean;
  daysRemaining?: number;
  lastSent?: Date;
}

/**
 * Check if a reminder can be sent for a specific contribution
 */
export function canSendReminder(claimId: string): ReminderCheckResult {
  try {
    const key = `${STORAGE_KEY_PREFIX}${claimId}`;
    const lastSentStr = localStorage.getItem(key);
    
    if (!lastSentStr) {
      return { allowed: true };
    }

    const lastSent = new Date(lastSentStr);
    const now = new Date();
    const diffMs = now.getTime() - lastSent.getTime();
    const daysSince = diffMs / (1000 * 60 * 60 * 24);

    if (daysSince >= REMINDER_COOLDOWN_DAYS) {
      return { allowed: true, lastSent };
    }

    return {
      allowed: false,
      daysRemaining: Math.ceil(REMINDER_COOLDOWN_DAYS - daysSince),
      lastSent,
    };
  } catch {
    // If localStorage fails, allow the reminder
    return { allowed: true };
  }
}

/**
 * Record that a reminder was sent
 */
export function recordReminderSent(claimId: string): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${claimId}`;
    localStorage.setItem(key, new Date().toISOString());
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Get the last reminder sent date
 */
export function getLastReminderDate(claimId: string): Date | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${claimId}`;
    const lastSentStr = localStorage.getItem(key);
    return lastSentStr ? new Date(lastSentStr) : null;
  } catch {
    return null;
  }
}

/**
 * Generate reminder message template
 */
export function getReminderTemplate(
  guestName: string,
  eventName: string,
  paymentMethod: string,
  paymentHandle: string,
  hostName: string
): string {
  return `Hi ${guestName}, just a quick reminder about the contribution for ${eventName}. You can send your payment via ${paymentMethod} to ${paymentHandle}. Thank you! – ${hostName}`;
}

/**
 * Format days remaining for display
 */
export function formatDaysRemaining(days: number): string {
  if (days <= 0) return 'now';
  if (days === 1) return '1 day';
  return `${days} days`;
}
