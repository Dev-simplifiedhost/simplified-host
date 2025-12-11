/**
 * Guest reminder utilities with rate limiting
 */

const REMINDER_COOLDOWN_DAYS = 3;
const RSVP_REMINDER_PREFIX = 'guest_rsvp_reminder_';
const PAYMENT_REMINDER_PREFIX = 'guest_payment_reminder_';

interface ReminderCheckResult {
  allowed: boolean;
  daysRemaining?: number;
  lastSent?: Date;
}

/**
 * Check if an RSVP reminder can be sent for a specific guest
 */
export function canSendRsvpReminder(guestId: string): ReminderCheckResult {
  return checkReminder(`${RSVP_REMINDER_PREFIX}${guestId}`);
}

/**
 * Check if a payment reminder can be sent for a specific guest
 */
export function canSendPaymentReminder(guestId: string): ReminderCheckResult {
  return checkReminder(`${PAYMENT_REMINDER_PREFIX}${guestId}`);
}

function checkReminder(key: string): ReminderCheckResult {
  try {
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
    return { allowed: true };
  }
}

/**
 * Record that an RSVP reminder was sent
 */
export function recordRsvpReminderSent(guestId: string): void {
  try {
    localStorage.setItem(`${RSVP_REMINDER_PREFIX}${guestId}`, new Date().toISOString());
  } catch {
    // Silently fail
  }
}

/**
 * Record that a payment reminder was sent
 */
export function recordPaymentReminderSent(guestId: string): void {
  try {
    localStorage.setItem(`${PAYMENT_REMINDER_PREFIX}${guestId}`, new Date().toISOString());
  } catch {
    // Silently fail
  }
}

/**
 * Get last RSVP reminder date
 */
export function getLastRsvpReminderDate(guestId: string): Date | null {
  try {
    const str = localStorage.getItem(`${RSVP_REMINDER_PREFIX}${guestId}`);
    return str ? new Date(str) : null;
  } catch {
    return null;
  }
}

/**
 * Get last payment reminder date
 */
export function getLastPaymentReminderDate(guestId: string): Date | null {
  try {
    const str = localStorage.getItem(`${PAYMENT_REMINDER_PREFIX}${guestId}`);
    return str ? new Date(str) : null;
  } catch {
    return null;
  }
}

/**
 * Check if bulk RSVP reminders can be sent
 */
export function canSendBulkRsvpReminders(guestIds: string[]): {
  allowed: string[];
  blocked: string[];
} {
  const allowed: string[] = [];
  const blocked: string[] = [];
  
  guestIds.forEach(id => {
    const result = canSendRsvpReminder(id);
    if (result.allowed) {
      allowed.push(id);
    } else {
      blocked.push(id);
    }
  });
  
  return { allowed, blocked };
}

/**
 * Format days remaining for display
 */
export function formatDaysRemaining(days: number): string {
  if (days <= 0) return 'now';
  if (days === 1) return '1 day';
  return `${days} days`;
}
