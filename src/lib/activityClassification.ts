import { supabase } from "@/integrations/supabase/client";
import { subHours } from "date-fns";
import { GUEST_ACTIVITY_TYPES, HOST_ACTIVITY_TYPES } from "./dashboardTileLogic";

export interface ActivityGroup {
  eventId: string;
  activities: {
    id: string;
    activity_type: string;
    created_at: string;
  }[];
}

// Fetch guest activities for events within adaptive time window
export async function fetchGuestActivities(
  eventIds: string[], 
  hoursWindow: number = 24
): Promise<Set<string>> {
  if (eventIds.length === 0) return new Set();
  
  const since = subHours(new Date(), hoursWindow).toISOString();
  
  const { data, error } = await supabase
    .from('activities')
    .select('event_id, activity_type, created_at')
    .in('event_id', eventIds)
    .in('activity_type', [...GUEST_ACTIVITY_TYPES])
    .gte('created_at', since);
  
  if (error || !data) return new Set();
  
  // Return set of event IDs that have guest activity
  return new Set(data.map(a => a.event_id).filter(Boolean) as string[]);
}

// Fetch host-updated events in last 48 hours
export async function fetchHostUpdatedEvents(
  eventIds: string[]
): Promise<Set<string>> {
  if (eventIds.length === 0) return new Set();
  
  const fortyEightHoursAgo = subHours(new Date(), 48).toISOString();
  
  const { data, error } = await supabase
    .from('activities')
    .select('event_id, activity_type, created_at')
    .in('event_id', eventIds)
    .in('activity_type', [...HOST_ACTIVITY_TYPES])
    .gte('created_at', fortyEightHoursAgo);
  
  if (error || !data) return new Set();
  
  // Return set of event IDs that have host activity
  return new Set(data.map(a => a.event_id).filter(Boolean) as string[]);
}

// Get recent activity counts by event
export async function getActivityCountsByEvent(
  eventIds: string[],
  hoursWindow: number = 24
): Promise<Map<string, number>> {
  if (eventIds.length === 0) return new Map();
  
  const since = subHours(new Date(), hoursWindow).toISOString();
  
  const { data, error } = await supabase
    .from('activities')
    .select('event_id')
    .in('event_id', eventIds)
    .in('activity_type', [...GUEST_ACTIVITY_TYPES])
    .gte('created_at', since);
  
  if (error || !data) return new Map();
  
  // Count activities per event
  const counts = new Map<string, number>();
  data.forEach(activity => {
    if (activity.event_id) {
      counts.set(activity.event_id, (counts.get(activity.event_id) || 0) + 1);
    }
  });
  
  return counts;
}

// Determine if activity is guest-originated
export function isGuestActivity(activityType: string): boolean {
  return (GUEST_ACTIVITY_TYPES as readonly string[]).includes(activityType);
}

// Determine if activity is host-originated
export function isHostActivity(activityType: string): boolean {
  return (HOST_ACTIVITY_TYPES as readonly string[]).includes(activityType);
}
