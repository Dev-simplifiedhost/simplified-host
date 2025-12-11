/**
 * SMS Analytics Tracking for Free-Tier Messaging System
 * Tracks: SMS_SENT, SMS_LIMIT_SOFT_PAYWALL_SHOWN, CTA_CLICKED
 */

import { supabase } from "@/integrations/supabase/client";
import type { ReminderType } from "./smsTemplates";

export type SmsAnalyticsEventType = 'sms_sent' | 'sms_limit_paywall_shown' | 'cta_clicked';

export type PaywallTrigger = 'bulk_limit' | 'single_limit' | 'daily_guest_limit';
export type CtaButton = 'get_early_access' | 'join_pro_list';

interface SmsSentMetadata {
  type: ReminderType;
  guestId: string;
  characterCount: number;
}

interface PaywallShownMetadata {
  trigger: PaywallTrigger;
}

interface CtaClickedMetadata {
  button: CtaButton;
}

type SmsAnalyticsMetadata = SmsSentMetadata | PaywallShownMetadata | CtaClickedMetadata;

/**
 * Track an SMS analytics event
 */
export async function trackSmsAnalytics(
  eventType: SmsAnalyticsEventType,
  eventId: string | null,
  metadata: SmsAnalyticsMetadata
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('sms_analytics').insert({
      event_id: eventId,
      user_id: user.id,
      event_type: eventType,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to track SMS analytics:', error);
  }
}

/**
 * Track SMS sent event
 */
export async function trackSmsSent(
  eventId: string,
  type: ReminderType,
  guestId: string,
  characterCount: number
): Promise<void> {
  await trackSmsAnalytics('sms_sent', eventId, {
    type,
    guestId,
    characterCount,
  });
}

/**
 * Track soft paywall shown event
 */
export async function trackPaywallShown(
  eventId: string | null,
  trigger: PaywallTrigger
): Promise<void> {
  await trackSmsAnalytics('sms_limit_paywall_shown', eventId, {
    trigger,
  });
}

/**
 * Track CTA clicked event
 */
export async function trackCtaClicked(
  eventId: string | null,
  button: CtaButton
): Promise<void> {
  await trackSmsAnalytics('cta_clicked', eventId, {
    button,
  });
}
