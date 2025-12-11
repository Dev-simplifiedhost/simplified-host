import { useMemo } from "react";
import { isPast, isFuture, differenceInHours, differenceInDays, subHours, subDays } from "date-fns";

export interface SmartNotification {
  id: string;
  type: 
    | "rsvp_deadline_approaching"
    | "event_starting_soon"
    | "event_tomorrow"
    | "low_rsvp_warning"
    | "high_activity_burst"
    | "items_not_setup"
    | "tasks_stalled"
    | "event_recently_updated"
    | "post_event_wrapup";
  eventId: string;
  eventName: string;
  eventCode: string;
  priority: 1 | 2 | 3; // 1 = urgent, 2 = important, 3 = info
  title: string;
  message: string;
  actionLabel: string;
  actionRoute: string;
  chipLabel?: string;
  chipVariant?: "urgent" | "warning" | "info" | "success";
  createdAt: Date;
}

export type EventLifecyclePhase = "setup" | "invite" | "prep" | "dayof" | "wrapup";

interface EventData {
  id: string;
  name: string;
  event_code: string;
  event_date: string | null;
  created_at: string;
  updated_at: string | null;
  is_archived: boolean | null;
  is_draft: boolean | null;
  rsvp_deadline?: string | null;
  location: string | null;
  description: string | null;
  max_attendees?: number | null;
  rsvp_count?: number;
  item_count?: number;
  items_claimed_count?: number;
  task_count?: number;
  tasks_completed_count?: number;
}

interface ActivityData {
  created_at: string;
  activity_type: string;
}

export function getEventLifecyclePhase(event: EventData): EventLifecyclePhase {
  const now = new Date();
  
  // Wrap-up: Event ended
  if (event.event_date && isPast(new Date(event.event_date))) {
    return "wrapup";
  }
  
  // Day-of: Event within 24 hours
  if (event.event_date) {
    const hoursUntil = differenceInHours(new Date(event.event_date), now);
    if (hoursUntil >= 0 && hoursUntil <= 24) {
      return "dayof";
    }
  }
  
  // Setup: Missing critical info
  if (!event.event_date || !event.location || !event.description) {
    return "setup";
  }
  
  // Invite: Has basics but low RSVPs (less than 5)
  if ((event.rsvp_count || 0) < 5) {
    return "invite";
  }
  
  // Prep: Good progress, event within 14 days
  return "prep";
}

export function useSmartNotifications(
  events: EventData[],
  recentActivities: ActivityData[] = [],
  dismissedIds: string[] = []
): SmartNotification[] {
  return useMemo(() => {
    const notifications: SmartNotification[] = [];
    const now = new Date();
    
    for (const event of events) {
      // Skip archived or draft events
      if (event.is_archived || event.is_draft) continue;
      
      const eventDate = event.event_date ? new Date(event.event_date) : null;
      const rsvpDeadline = event.rsvp_deadline ? new Date(event.rsvp_deadline) : null;
      const createdAt = new Date(event.created_at);
      const updatedAt = event.updated_at ? new Date(event.updated_at) : null;
      
      // 1. RSVP DEADLINE APPROACHING (within 48 hours)
      if (rsvpDeadline && isFuture(rsvpDeadline)) {
        const hoursUntilDeadline = differenceInHours(rsvpDeadline, now);
        if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 48) {
          const id = `rsvp_deadline_${event.id}`;
          if (!dismissedIds.includes(id)) {
            notifications.push({
              id,
              type: "rsvp_deadline_approaching",
              eventId: event.id,
              eventName: event.name,
              eventCode: event.event_code,
              priority: 1,
              title: "RSVP Deadline Approaching",
              message: `RSVP deadline for "${event.name}" is in ${hoursUntilDeadline < 24 ? `${hoursUntilDeadline} hours` : `${Math.ceil(hoursUntilDeadline / 24)} days`}`,
              actionLabel: "Send Reminder",
              actionRoute: `/dashboard?event=${event.id}&tab=guests`,
              chipLabel: `RSVP deadline in ${hoursUntilDeadline < 24 ? `${hoursUntilDeadline}h` : `${Math.ceil(hoursUntilDeadline / 24)}d`}`,
              chipVariant: "urgent",
              createdAt: now,
            });
          }
        }
      }
      
      // 2. EVENT STARTING SOON (within 7 days)
      if (eventDate && isFuture(eventDate)) {
        const daysUntil = differenceInDays(eventDate, now);
        if (daysUntil > 1 && daysUntil <= 7) {
          const id = `event_soon_${event.id}`;
          if (!dismissedIds.includes(id)) {
            notifications.push({
              id,
              type: "event_starting_soon",
              eventId: event.id,
              eventName: event.name,
              eventCode: event.event_code,
              priority: 2,
              title: "Event Starting Soon",
              message: `"${event.name}" is ${daysUntil} days away`,
              actionLabel: "Finalize Details",
              actionRoute: `/dashboard?event=${event.id}`,
              chipLabel: `${daysUntil} days to go`,
              chipVariant: "warning",
              createdAt: now,
            });
          }
        }
        
        // 3. EVENT TOMORROW (within 24 hours)
        const hoursUntil = differenceInHours(eventDate, now);
        if (hoursUntil > 0 && hoursUntil <= 24) {
          const id = `event_tomorrow_${event.id}`;
          if (!dismissedIds.includes(id)) {
            notifications.push({
              id,
              type: "event_tomorrow",
              eventId: event.id,
              eventName: event.name,
              eventCode: event.event_code,
              priority: 1,
              title: "Event Tomorrow!",
              message: `"${event.name}" starts in ${hoursUntil} hours`,
              actionLabel: "Final Checklist",
              actionRoute: `/dashboard?event=${event.id}&tab=tasks`,
              chipLabel: "Tomorrow!",
              chipVariant: "urgent",
              createdAt: now,
            });
          }
        }
      }
      
      // 4. LOW RSVP WARNING (created >48h ago, RSVPs < 20%)
      if (eventDate && isFuture(eventDate)) {
        const hoursSinceCreated = differenceInHours(now, createdAt);
        const rsvpRate = event.max_attendees 
          ? ((event.rsvp_count || 0) / event.max_attendees) 
          : (event.rsvp_count || 0) > 0 ? 1 : 0;
        
        if (hoursSinceCreated >= 48 && rsvpRate < 0.2 && (event.rsvp_count || 0) < 5) {
          const id = `low_rsvp_${event.id}`;
          if (!dismissedIds.includes(id)) {
            notifications.push({
              id,
              type: "low_rsvp_warning",
              eventId: event.id,
              eventName: event.name,
              eventCode: event.event_code,
              priority: 2,
              title: "Low RSVPs",
              message: `Only ${event.rsvp_count || 0} RSVPs for "${event.name}" after ${Math.floor(hoursSinceCreated / 24)} days`,
              actionLabel: "Send Reminder",
              actionRoute: `/dashboard?event=${event.id}&tab=guests`,
              chipLabel: "Low RSVPs",
              chipVariant: "warning",
              createdAt: now,
            });
          }
        }
      }
      
      // 5. ITEMS NOT SETUP (created >48h ago, no items)
      if (eventDate && isFuture(eventDate)) {
        const hoursSinceCreated = differenceInHours(now, createdAt);
        if (hoursSinceCreated >= 48 && (event.item_count || 0) === 0) {
          const id = `no_items_${event.id}`;
          if (!dismissedIds.includes(id)) {
            notifications.push({
              id,
              type: "items_not_setup",
              eventId: event.id,
              eventName: event.name,
              eventCode: event.event_code,
              priority: 2,
              title: "Items Not Set Up",
              message: `"${event.name}" has no items added yet`,
              actionLabel: "Add Items",
              actionRoute: `/dashboard?event=${event.id}&tab=items`,
              chipLabel: "No items",
              chipVariant: "warning",
              createdAt: now,
            });
          }
        }
      }
      
      // 6. TASKS STALLED (tasks exist but none updated in 5 days)
      if (eventDate && isFuture(eventDate) && (event.task_count || 0) > 0) {
        const taskCompletionRate = (event.tasks_completed_count || 0) / event.task_count!;
        if (taskCompletionRate < 1 && updatedAt) {
          const daysSinceUpdate = differenceInDays(now, updatedAt);
          if (daysSinceUpdate >= 5) {
            const id = `tasks_stalled_${event.id}`;
            if (!dismissedIds.includes(id)) {
              notifications.push({
                id,
                type: "tasks_stalled",
                eventId: event.id,
                eventName: event.name,
                eventCode: event.event_code,
                priority: 3,
                title: "Tasks Need Attention",
                message: `Tasks for "${event.name}" haven't been updated in ${daysSinceUpdate} days`,
                actionLabel: "Review Tasks",
                actionRoute: `/dashboard?event=${event.id}&tab=tasks`,
                chipLabel: "Tasks stalled",
                chipVariant: "info",
                createdAt: now,
              });
            }
          }
        }
      }
      
      // 7. EVENT RECENTLY UPDATED (within 4 hours by collaborator)
      if (eventDate && isFuture(eventDate) && updatedAt) {
        const hoursSinceUpdate = differenceInHours(now, updatedAt);
        if (hoursSinceUpdate <= 4 && hoursSinceUpdate > 0) {
          const id = `recently_updated_${event.id}_${updatedAt.getTime()}`;
          if (!dismissedIds.includes(id)) {
            notifications.push({
              id,
              type: "event_recently_updated",
              eventId: event.id,
              eventName: event.name,
              eventCode: event.event_code,
              priority: 3,
              title: "Event Updated",
              message: `"${event.name}" was updated ${hoursSinceUpdate} hours ago`,
              actionLabel: "View Changes",
              actionRoute: `/dashboard?event=${event.id}`,
              chipLabel: `Updated ${hoursSinceUpdate}h ago`,
              chipVariant: "info",
              createdAt: updatedAt,
            });
          }
        }
      }
      
      // 8. POST-EVENT WRAP-UP (ended 6+ hours ago, not archived)
      if (eventDate && isPast(eventDate) && !event.is_archived) {
        const hoursSinceEnd = differenceInHours(now, eventDate);
        if (hoursSinceEnd >= 6) {
          const id = `wrapup_${event.id}`;
          if (!dismissedIds.includes(id)) {
            notifications.push({
              id,
              type: "post_event_wrapup",
              eventId: event.id,
              eventName: event.name,
              eventCode: event.event_code,
              priority: 2,
              title: "Event Ended",
              message: `"${event.name}" has ended. Archive or duplicate?`,
              actionLabel: "Archive Event",
              actionRoute: `/dashboard?event=${event.id}&action=archive`,
              createdAt: eventDate,
            });
          }
        }
      }
    }
    
    // 9. HIGH ACTIVITY BURST (3+ activities in last hour)
    const oneHourAgo = subHours(now, 1);
    const recentActivityCount = recentActivities.filter(
      a => new Date(a.created_at) > oneHourAgo
    ).length;
    
    if (recentActivityCount >= 3) {
      const id = `high_activity_${now.toISOString().slice(0, 13)}`;
      if (!dismissedIds.includes(id)) {
        notifications.push({
          id,
          type: "high_activity_burst",
          eventId: "",
          eventName: "",
          eventCode: "",
          priority: 2,
          title: "High Activity!",
          message: `${recentActivityCount} new activities in the last hour`,
          actionLabel: "View Activity",
          actionRoute: "/my-events",
          createdAt: now,
        });
      }
    }
    
    // Sort by priority (1 first) then by createdAt (newest first)
    return notifications.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }, [events, recentActivities, dismissedIds]);
}

// Get chips for a specific event
export function getEventChips(
  event: EventData,
  notifications: SmartNotification[]
): { label: string; variant: "urgent" | "warning" | "info" | "success" }[] {
  const eventNotifications = notifications.filter(n => n.eventId === event.id && n.chipLabel);
  
  return eventNotifications
    .slice(0, 2) // Max 2 chips per card
    .map(n => ({
      label: n.chipLabel!,
      variant: n.chipVariant || "info",
    }));
}
