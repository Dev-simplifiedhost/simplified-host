import { supabase } from "@/integrations/supabase/client";

export type ProEventType = 
  | 'pro_hint_viewed'
  | 'pro_interest_clicked'
  | 'pro_interest_submitted'
  | 'pro_interest_dismissed'
  | 'pro_multi_collab_blocked';

interface ProEventPayload {
  userId: string;
  eventId?: string;
  tier?: string;
  email?: string;
  source?: string;
}

export const trackProEvent = async (
  eventType: ProEventType,
  payload: ProEventPayload
): Promise<void> => {
  try {
    await supabase.from('activities').insert({
      user_id: payload.userId,
      event_id: payload.eventId || null,
      activity_type: eventType,
      activity_data: {
        tier: payload.tier || 'free',
        email: payload.email,
        source: payload.source,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to track pro event:', error);
  }
};
