import { isPast, isFuture, isWithinInterval, addDays, startOfDay, subHours, differenceInDays } from "date-fns";

// Activity type classifications
export const GUEST_ACTIVITY_TYPES = [
  'guest_rsvp', 
  'guest_rsvp_changed', 
  'item_claimed', 
  'item_unclaimed', 
  'guest_comment', 
  'item_suggested', 
  'contribution_made',
  'rsvp_submitted',
  'rsvp_updated'
] as const;

export const HOST_ACTIVITY_TYPES = [
  'event_updated', 
  'event_created',
  'item_added', 
  'item_edited',
  'item_deleted', 
  'task_added', 
  'task_completed',
  'task_deleted',
  'announcement_posted', 
  'reminder_sent',
  'collaborator_invited'
] as const;

export interface TileEvent {
  id: string;
  name: string;
  description: string | null;
  event_date: string | null;
  location: string | null;
  is_archived: boolean | null;
  is_draft: boolean | null;
  updated_at: string | null;
  created_at: string;
  start_time?: string | null;
  end_time?: string | null;
  welcome_announcement?: string | null;
  rsvp_count?: number;
  item_count?: number;
  items_claimed_count?: number;
  task_count?: number;
  tasks_completed_count?: number;
  max_attendees?: number | null;
  // Additional properties from full Event type for compatibility
  event_code?: string | null;
  archived_at?: string | null;
  archive_delay_days?: number | null;
  privacy_setting?: string | null;
  allow_plus_ones?: boolean | null;
  show_guest_list?: boolean | null;
  is_all_day?: boolean | null;
}

export type DraftStatus = 'draft' | 'in_progress' | 'almost_ready';

export interface TileCounts {
  active: number;
  thisWeek: number;
  atRisk: number;
  attention: number;
  newActivity: number;
  updated: number;
  draft: number;
}

// Adaptive time window based on login frequency (in hours)
export function getAdaptiveTimeWindow(loginDates: Date[] = []): number {
  if (loginDates.length < 2) return 24; // Default for new users
  
  const sortedLogins = [...loginDates].sort((a, b) => b.getTime() - a.getTime());
  const recentLogins = sortedLogins.slice(0, 7); // Last 7 logins
  
  if (recentLogins.length < 2) return 24;
  
  // Calculate average days between logins
  let totalDays = 0;
  for (let i = 0; i < recentLogins.length - 1; i++) {
    totalDays += differenceInDays(recentLogins[i], recentLogins[i + 1]);
  }
  const avgDaysBetweenLogins = totalDays / (recentLogins.length - 1);
  
  if (avgDaysBetweenLogins <= 1) return 24;  // Daily user: 24h
  if (avgDaysBetweenLogins <= 3) return 48;  // Frequent user: 48h
  return 72; // Weekly user: 72h
}

// Calculate setup health score (0-100) for "Attention" tile
export function calculateSetupScore(event: TileEvent): number {
  let score = 0;
  
  // Has description (20 points)
  if (event.description && event.description.trim().length > 0) score += 20;
  
  // Has date and time (20 points)
  if (event.event_date && event.start_time) score += 20;
  else if (event.event_date) score += 10;
  
  // Has location (20 points)
  if (event.location && event.location.trim().length > 0) score += 20;
  
  // Has items (20 points)
  if (event.item_count && event.item_count > 0) score += 20;
  
  // Has RSVPs or guests (10 points)
  if (event.rsvp_count && event.rsvp_count > 0) score += 10;
  
  // Has welcome announcement (10 points)
  if (event.welcome_announcement) score += 10;
  
  return Math.min(100, score);
}

// Check if event is "At Risk" - execution risk post-setup
export function isEventAtRisk(event: TileEvent): boolean {
  if (!event.event_date || event.is_draft || event.is_archived) return false;
  
  const eventDate = new Date(event.event_date);
  if (isPast(eventDate)) return false;
  
  const daysUntil = differenceInDays(eventDate, new Date());
  
  // Calculate item/task completion rate
  const itemCompletion = event.item_count && event.item_count > 0
    ? (event.items_claimed_count || 0) / event.item_count
    : 1; // No items = fully complete
    
  const taskCompletion = event.task_count && event.task_count > 0
    ? (event.tasks_completed_count || 0) / event.task_count
    : 1; // No tasks = fully complete
  
  const overallCompletion = (itemCompletion + taskCompletion) / 2;
  
  // <30% items/tasks completed
  if (overallCompletion < 0.3) return true;
  
  // No RSVPs within 7-10 days of event
  if (daysUntil <= 10 && (!event.rsvp_count || event.rsvp_count === 0)) return true;
  
  // Low engagement relative to date
  if (daysUntil <= 7 && overallCompletion < 0.5) return true;
  
  return false;
}

// Check if event needs "Attention" - setup issues pre-launch
export function needsAttention(event: TileEvent): boolean {
  if (event.is_archived) return false;
  
  const setupScore = calculateSetupScore(event);
  return setupScore < 50;
}

// Get draft sub-status
export function getDraftStatus(event: TileEvent): DraftStatus {
  const setupScore = calculateSetupScore(event);
  
  if (setupScore < 25) return 'draft';
  if (setupScore < 75) return 'in_progress';
  return 'almost_ready';
}

// Get draft status label for display
export function getDraftStatusLabel(status: DraftStatus): string {
  switch (status) {
    case 'draft': return 'Draft (0-25%)';
    case 'in_progress': return 'In Progress (25-75%)';
    case 'almost_ready': return 'Almost Ready (75%+)';
  }
}

// Check if host is in active editing session (suppress "Updated" tile)
export function isInActiveEditingSession(event: TileEvent): boolean {
  if (!event.updated_at) return false;
  const fifteenMinutesAgo = subHours(new Date(), 0.25); // 15 minutes
  return new Date(event.updated_at) > fifteenMinutesAgo;
}

// Filter events for "This Week" tile
export function getEventsThisWeek(events: TileEvent[]): TileEvent[] {
  const today = startOfDay(new Date());
  const weekFromNow = addDays(today, 7);
  
  return events.filter(e => {
    if (!e.event_date || e.is_archived || e.is_draft) return false;
    const eventDate = new Date(e.event_date);
    return isWithinInterval(eventDate, { start: today, end: weekFromNow });
  });
}

// Filter for active (published, non-archived, future) events
export function getActiveEvents(events: TileEvent[]): TileEvent[] {
  return events.filter(e => 
    !e.is_archived && 
    !e.is_draft && 
    e.event_date && 
    isFuture(new Date(e.event_date))
  );
}

// Filter for at-risk events
export function getAtRiskEvents(events: TileEvent[]): TileEvent[] {
  return getActiveEvents(events).filter(isEventAtRisk);
}

// Filter for events needing attention
export function getAttentionEvents(events: TileEvent[]): TileEvent[] {
  return events.filter(e => !e.is_archived && needsAttention(e));
}

// Filter for draft events
export function getDraftEvents(events: TileEvent[]): TileEvent[] {
  return events.filter(e => e.is_draft && !e.is_archived);
}

// Get context tag for why an event appears in a filtered view
export function getEventContextReason(
  event: TileEvent, 
  tileFilter: string | null
): { label: string; variant: 'warning' | 'error' | 'success' | 'info' | 'muted' } | null {
  if (!tileFilter) return null;
  
  switch (tileFilter) {
    case 'atRisk':
      if (!event.rsvp_count || event.rsvp_count === 0) {
        return { label: '0 RSVPs', variant: 'warning' };
      }
      const itemCompletion = event.item_count && event.item_count > 0
        ? (event.items_claimed_count || 0) / event.item_count
        : 1;
      const taskCompletion = event.task_count && event.task_count > 0
        ? (event.tasks_completed_count || 0) / event.task_count
        : 1;
      const overallCompletion = Math.round(((itemCompletion + taskCompletion) / 2) * 100);
      if (overallCompletion < 50) {
        return { label: `Low completion (${overallCompletion}%)`, variant: 'warning' };
      }
      return { label: 'Needs attention', variant: 'warning' };
    
    case 'attention':
      if (!event.description || event.description.trim().length === 0) {
        return { label: 'Missing description', variant: 'error' };
      }
      if (!event.location) {
        return { label: 'No location set', variant: 'error' };
      }
      if (!event.item_count || event.item_count === 0) {
        return { label: 'No items added', variant: 'error' };
      }
      return { label: 'Setup incomplete', variant: 'error' };
    
    case 'newActivity':
      return { label: 'Guests active', variant: 'success' };
    
    case 'updated':
      return { label: 'Host edits detected', variant: 'info' };
    
    case 'draft':
      const status = getDraftStatus(event);
      if (status === 'almost_ready') return { label: 'Almost ready', variant: 'success' };
      if (status === 'in_progress') return { label: 'In progress', variant: 'info' };
      return { label: 'Draft', variant: 'muted' };
    
    case 'thisWeek':
      return { label: 'This week', variant: 'info' };
    
    case 'upcoming':
      return null; // No special tag for general active
    
    default:
      return null;
  }
}

// Intelligent sorting for filtered views
export function sortByUrgency(events: TileEvent[], tileFilter: string | null): TileEvent[] {
  return [...events].sort((a, b) => {
    // 1. Urgency: closest upcoming date first
    const daysUntilA = a.event_date ? differenceInDays(new Date(a.event_date), new Date()) : Infinity;
    const daysUntilB = b.event_date ? differenceInDays(new Date(b.event_date), new Date()) : Infinity;
    if (daysUntilA !== daysUntilB) return daysUntilA - daysUntilB;
    
    // 2. Severity: lower completion % first
    const getCompletion = (e: TileEvent) => {
      const itemComp = e.item_count && e.item_count > 0 
        ? (e.items_claimed_count || 0) / e.item_count 
        : 1;
      const taskComp = e.task_count && e.task_count > 0 
        ? (e.tasks_completed_count || 0) / e.task_count 
        : 1;
      return (itemComp + taskComp) / 2;
    };
    const completionA = getCompletion(a);
    const completionB = getCompletion(b);
    if (completionA !== completionB) return completionA - completionB;
    
    // 3. Engagement level (higher RSVPs first)
    return (b.rsvp_count || 0) - (a.rsvp_count || 0);
  });
}

// Calculate all tile counts
export function calculateTileCounts(
  events: TileEvent[],
  draftEvents: TileEvent[],
  guestActivityEventIds: Set<string>,
  hostUpdatedEventIds: Set<string>
): TileCounts {
  const activeEvents = getActiveEvents(events);
  
  return {
    active: activeEvents.length,
    thisWeek: getEventsThisWeek(events).length,
    atRisk: getAtRiskEvents(events).length,
    attention: getAttentionEvents([...events, ...draftEvents]).length,
    newActivity: activeEvents.filter(e => guestActivityEventIds.has(e.id)).length,
    updated: activeEvents.filter(e => hostUpdatedEventIds.has(e.id) && !isInActiveEditingSession(e)).length,
    draft: draftEvents.length,
  };
}
