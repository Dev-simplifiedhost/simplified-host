import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ShareEventDialog } from "@/components/dashboard/ShareEventDialog";
import { EventSettingsDialog } from "@/components/dashboard/EventSettingsDialog";
import { EnhancedWizardDialog } from "@/components/dashboard/EnhancedWizardDialog";
import { MobileCreateEventFlow } from "@/components/dashboard/MobileCreateEventFlow";
import { SummaryTilesV2, type TileFilterType } from "@/components/dashboard/SummaryTilesV2";
import { ContextualActionBar } from "@/components/dashboard/ContextualActionBar";
import { StickyFilterBar } from "@/components/dashboard/StickyFilterBar";
import { EventCard } from "@/components/dashboard/EventCard";
import { EventsEmptyState } from "@/components/dashboard/EventsEmptyState";
import { ActivityDialog } from "@/components/dashboard/ActivityDialog";
import { NotificationDashboard } from "@/components/dashboard/NotificationDashboard";
import { SmartBanner, SmartBannerCompact } from "@/components/notifications/SmartBanner";
import { PushPermissionPrompt, useShouldShowPushPrompt } from "@/components/notifications/PushPermissionPrompt";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useSmartNotifications, getEventChips } from "@/hooks/useSmartNotifications";
import { useNotificationDismissals } from "@/hooks/useNotificationDismissals";
import { Plus, Activity, MousePointerClick, Pin, FileEdit, ArrowRight, HelpCircle, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PlanWithClickDialog from "@/components/plan-with-click/PlanWithClickDialog";
import { isPast, isFuture, subHours, startOfDay, addDays, isWithinInterval } from "date-fns";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import type { FilterType } from "@/components/dashboard/FilterDropdown";
import { 
  calculateTileCounts,
  getEventsThisWeek,
  getActiveEvents,
  getAtRiskEvents,
  getAttentionEvents,
  sortByUrgency,
  getEventContextReason,
  type TileEvent
} from "@/lib/dashboardTileLogic";
import { fetchGuestActivities, fetchHostUpdatedEvents } from "@/lib/activityClassification";

interface Event {
  id: string;
  name: string;
  description: string | null;
  event_date: string | null;
  event_code: string;
  location: string | null;
  created_at: string;
  updated_at: string | null;
  is_archived: boolean | null;
  is_draft: boolean | null;
  archived_at: string | null;
  archive_delay_days: number | null;
  max_attendees: number | null;
  privacy_setting: string | null;
  allow_plus_ones: boolean | null;
  show_guest_list: boolean | null;
  start_time?: string | null;
  end_time?: string | null;
  is_all_day?: boolean | null;
  rsvp_count?: number;
  item_count?: number;
  items_claimed_count?: number;
  task_count?: number;
  tasks_completed_count?: number;
  welcome_announcement?: string | null;
}

export default function MyEvents() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [events, setEvents] = useState<Event[]>([]);
  const [draftEvents, setDraftEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterType>("upcoming");
  const [sortBy, setSortBy] = useState<"date" | "name" | "created" | "updated">("date");
  const [tileFilter, setTileFilter] = useState<TileFilterType | null>(null);
  const [archivedEvents, setArchivedEvents] = useState<Event[]>([]);
  const [newActivityCount, setNewActivityCount] = useState(0);
  const [guestActivityEventIds, setGuestActivityEventIds] = useState<Set<string>>(new Set());
  const [hostUpdatedEventIds, setHostUpdatedEventIds] = useState<Set<string>>(new Set());
  
  // Pinned event (stored in localStorage)
  const [pinnedEventId, setPinnedEventId] = useState<string | null>(() => {
    return localStorage.getItem('pinnedEventId');
  });
  
  // Dialog states
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [planWithClickOpen, setPlanWithClickOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  // Smart notifications
  const { getDismissedIds, dismiss } = useNotificationDismissals();
  const smartNotifications = useSmartNotifications(events, [], getDismissedIds());
  const shouldShowPushPrompt = useShouldShowPushPrompt(events.length > 0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    
    if (user) {
      loadEvents();
      loadNewActivityCount();
      loadActivityData();
    }
  }, [user, authLoading]);

  const loadActivityData = async () => {
    const eventIds = events.map(e => e.id);
    if (eventIds.length === 0) return;
    
    const [guestActivity, hostActivity] = await Promise.all([
      fetchGuestActivities(eventIds, 24),
      fetchHostUpdatedEvents(eventIds)
    ]);
    
    setGuestActivityEventIds(guestActivity);
    setHostUpdatedEventIds(hostActivity);
  };

  // Reload activity data when events change
  useEffect(() => {
    if (events.length > 0) {
      loadActivityData();
    }
  }, [events.length]);

  const loadEvents = async () => {
    setLoading(true);
    
    // Helper to add metrics to events
    const addMetricsToEvents = async (eventsList: typeof eventsData) => {
      if (!eventsList || eventsList.length === 0) return [];
      
      return Promise.all(
        eventsList.map(async (event) => {
          const [rsvps, items, tasks] = await Promise.all([
            supabase.from('rsvps').select('id', { count: 'exact', head: true }).eq('event_id', event.id),
            supabase.from('event_items').select('id, claimed_by', { count: 'exact' }).eq('event_id', event.id),
            supabase.from('tasks').select('id, status', { count: 'exact' }).eq('event_id', event.id),
          ]);

          const itemsClaimedCount = items.data?.filter(item => item.claimed_by).length || 0;
          const tasksCompletedCount = tasks.data?.filter(task => task.status === 'done').length || 0;

          return {
            ...event,
            rsvp_count: rsvps.count || 0,
            item_count: items.count || 0,
            items_claimed_count: itemsClaimedCount,
            task_count: tasks.count || 0,
            tasks_completed_count: tasksCompletedCount,
          };
        })
      );
    };
    
    // Fetch published non-archived events
    const { data: eventsData, error } = await supabase
      .from('events')
      .select('*, updated_at')
      .eq('user_id', user?.id)
      .eq('is_draft', false)
      .or('is_archived.is.null,is_archived.eq.false')
      .order('event_date', { ascending: true });

    // Fetch draft events separately
    const { data: draftsData } = await supabase
      .from('events')
      .select('*, updated_at')
      .eq('user_id', user?.id)
      .eq('is_draft', true)
      .order('created_at', { ascending: false });

    // Fetch archived events separately
    const { data: archivedData } = await supabase
      .from('events')
      .select('*, updated_at')
      .eq('user_id', user?.id)
      .eq('is_archived', true)
      .order('archived_at', { ascending: false });

    if (error || !eventsData) {
      setLoading(false);
      return;
    }

    // Load metrics for all event types in parallel
    const [eventsWithMetrics, draftsWithMetrics, archivedWithMetrics] = await Promise.all([
      addMetricsToEvents(eventsData),
      addMetricsToEvents(draftsData),
      addMetricsToEvents(archivedData),
    ]);

    setEvents(eventsWithMetrics);
    setDraftEvents(draftsWithMetrics);
    setArchivedEvents(archivedWithMetrics);
    setLoading(false);
  };

  const loadNewActivityCount = async () => {
    const twentyFourHoursAgo = subHours(new Date(), 24).toISOString();
    
    const { count } = await supabase
      .from('activities')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('is_read', false)
      .gte('created_at', twentyFourHoursAgo);
    
    setNewActivityCount(count || 0);
  };

  const togglePin = (eventId: string) => {
    if (pinnedEventId === eventId) {
      setPinnedEventId(null);
      localStorage.removeItem('pinnedEventId');
      toast({ title: "Event unpinned" });
    } else {
      setPinnedEventId(eventId);
      localStorage.setItem('pinnedEventId', eventId);
      toast({ title: "Event pinned to top" });
    }
  };

  const calculateHealthScore = (event: Event): number => {
    let score = 0;
    
    const hasDetails = event.description && event.location && event.event_date;
    score += hasDetails ? 20 : 10;
    
    const rsvpScore = event.max_attendees && event.rsvp_count
      ? (event.rsvp_count / event.max_attendees) * 30
      : event.rsvp_count && event.rsvp_count > 0 ? 30 : 0;
    score += rsvpScore;
    
    const itemsScore = event.item_count && event.item_count > 0
      ? (event.items_claimed_count! / event.item_count) * 25
      : 0;
    score += itemsScore;
    
    const tasksScore = event.task_count && event.task_count > 0
      ? (event.tasks_completed_count! / event.task_count) * 25
      : 0;
    score += tasksScore;
    
    return Math.min(100, Math.round(score));
  };

  const handleDuplicate = async (event: Event) => {
    setDuplicating(true);
    try {
      const { data: fullEventData, error: fetchError } = await supabase
        .from('events')
        .select('*')
        .eq('id', event.id)
        .single();

      if (fetchError || !fullEventData) throw fetchError;

      const { data: newEvent, error: eventError } = await supabase
        .from('events')
        .insert({
          user_id: user?.id,
          name: `${fullEventData.name} (Copy)`,
          description: fullEventData.description,
          location: fullEventData.location,
          event_date: fullEventData.event_date,
          is_draft: false,
          start_time: fullEventData.start_time,
          end_time: fullEventData.end_time,
          is_all_day: fullEventData.is_all_day,
          rsvp_deadline: fullEventData.rsvp_deadline,
          max_attendees: fullEventData.max_attendees,
          allow_plus_ones: fullEventData.allow_plus_ones,
          show_guest_list: fullEventData.show_guest_list,
          allow_guest_items: fullEventData.allow_guest_items,
          privacy_setting: fullEventData.privacy_setting,
          contribution_goal: fullEventData.contribution_goal,
          show_contribution_goal: fullEventData.show_contribution_goal,
          contribution_methods: fullEventData.contribution_methods,
          contribution_message: fullEventData.contribution_message,
          dress_code: fullEventData.dress_code,
          special_requests: fullEventData.special_requests,
          parking_instructions: fullEventData.parking_instructions,
          accessibility_info: fullEventData.accessibility_info,
          event_type: fullEventData.event_type,
          theme_color: fullEventData.theme_color,
          host_name: fullEventData.host_name,
          reminders_enabled: fullEventData.reminders_enabled,
          reminder_settings: fullEventData.reminder_settings,
          archive_delay_days: fullEventData.archive_delay_days,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      const { data: items } = await supabase
        .from('event_items')
        .select('*')
        .eq('event_id', event.id);

      if (items && items.length > 0) {
        const itemsToInsert = items.map(item => ({
          event_id: newEvent.id,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          notes: item.notes,
          is_host_provided: item.is_host_provided,
        }));

        await supabase.from('event_items').insert(itemsToInsert);
      }

      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('event_id', event.id);

      if (tasks && tasks.length > 0) {
        const tasksToInsert = tasks.map(task => ({
          event_id: newEvent.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          category_id: task.category_id,
          due_date: task.due_date,
          due_relative_days: task.due_relative_days,
          sort_order: task.sort_order,
        }));

        await supabase.from('tasks').insert(tasksToInsert);
      }

      toast({
        title: "Event duplicated!",
        description: `Copied event with ${items?.length || 0} items and ${tasks?.length || 0} tasks.`,
      });

      loadEvents();
      navigate(`/dashboard?event=${newEvent.id}`);
    } catch (error) {
      console.error('Error duplicating event:', error);
      toast({
        title: "Failed to duplicate",
        description: "There was an error duplicating your event.",
        variant: "destructive",
      });
    } finally {
      setDuplicating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedEvent) return;

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', selectedEvent.id);

      if (error) throw error;

      // Unpin if deleted event was pinned
      if (pinnedEventId === selectedEvent.id) {
        setPinnedEventId(null);
        localStorage.removeItem('pinnedEventId');
      }

      toast({
        title: "Event deleted",
        description: "Your event has been deleted successfully.",
      });

      loadEvents();
      setDeleteDialogOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Failed to delete",
        description: "There was an error deleting your event.",
        variant: "destructive",
      });
    }
  };

  // Calculate metrics
  const allEvents = [...events, ...draftEvents];
  const upcomingEvents = events.filter(e => e.event_date && isFuture(new Date(e.event_date)) && !e.is_archived);
  const pastEvents = events.filter(e => e.is_archived || (e.event_date && isPast(new Date(e.event_date))));
  const allActiveEvents = events.filter(e => !e.is_archived);
  
  const eventsThisWeek = upcomingEvents.filter(e => {
    if (!e.event_date) return false;
    const eventDate = new Date(e.event_date);
    const today = startOfDay(new Date());
    const weekFromNow = addDays(today, 7);
    return isWithinInterval(eventDate, { start: today, end: weekFromNow });
  });
  
  // Use new tile logic - cast back to Event[] since the data has all required fields
  const atRiskEvents = useMemo(() => getAtRiskEvents(events as TileEvent[]) as unknown as Event[], [events]);
  const actionRequiredEvents = useMemo(() => getAttentionEvents([...events, ...draftEvents] as TileEvent[]) as unknown as Event[], [events, draftEvents]);
  const eventsWithNewActivity = useMemo(() => 
    events.filter(e => guestActivityEventIds.has(e.id)), 
    [events, guestActivityEventIds]
  );
  const recentlyUpdatedEvents = useMemo(() => 
    events.filter(e => hostUpdatedEventIds.has(e.id)), 
    [events, hostUpdatedEventIds]
  );
  
  // Calculate tile counts using new logic
  const tileCounts = useMemo(() => calculateTileCounts(
    events as TileEvent[],
    draftEvents as TileEvent[],
    guestActivityEventIds,
    hostUpdatedEventIds
  ), [events, draftEvents, guestActivityEventIds, hostUpdatedEventIds]);

  const getFilteredAndSortedEvents = () => {
    let filtered: Event[] = events;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(event =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply tile filter if active (overrides tab filter)
    if (tileFilter) {
      switch (tileFilter) {
        case "upcoming":
          filtered = upcomingEvents;
          break;
        case "thisWeek":
          filtered = eventsThisWeek;
          break;
        case "atRisk":
          filtered = atRiskEvents;
          break;
        case "attention":
          filtered = actionRequiredEvents;
          break;
        case "newActivity":
          filtered = eventsWithNewActivity;
          break;
        case "updated":
          filtered = recentlyUpdatedEvents;
          break;
        case "draft":
          filtered = draftEvents;
          break;
      }
      // Re-apply search on tile-filtered results
      if (searchTerm) {
        filtered = filtered.filter(event =>
          event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.location?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
    } else {
      // Apply dropdown filter
      if (filterStatus === "upcoming") {
        filtered = filtered.filter(event => 
          event.event_date && isFuture(new Date(event.event_date)) && !event.is_archived
        );
      } else if (filterStatus === "past") {
        // Merge past (non-archived) + archived events into single "Past Events" filter
        const pastNonArchived = filtered.filter(event => 
          event.event_date && isPast(new Date(event.event_date)) && !event.is_archived
        );
        filtered = [...pastNonArchived, ...archivedEvents];
      } else if (filterStatus === "draft") {
        filtered = draftEvents;
      } else {
        // "all" - show everything except archived
        filtered = [...filtered, ...draftEvents].filter(event => !event.is_archived);
      }
    }

    // Sort - use intelligent urgency sorting for tile filters
    let sorted: Event[];
    if (tileFilter && ['atRisk', 'attention', 'newActivity', 'updated'].includes(tileFilter)) {
      sorted = sortByUrgency(filtered as TileEvent[], tileFilter) as Event[];
    } else {
      sorted = [...filtered].sort((a, b) => {
        switch (sortBy) {
          case "name":
            return a.name.localeCompare(b.name);
          case "created":
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case "updated":
            if (!a.updated_at) return 1;
            if (!b.updated_at) return -1;
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          case "date":
          default:
            if (!a.event_date) return 1;
            if (!b.event_date) return -1;
            return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
        }
      });
    }

    return sorted;
  };

  const filteredEvents = getFilteredAndSortedEvents();
  
  // Separate pinned event from rest
  const pinnedEvent = pinnedEventId ? filteredEvents.find(e => e.id === pinnedEventId) : null;
  const unpinnedEvents = pinnedEvent 
    ? filteredEvents.filter(e => e.id !== pinnedEventId)
    : filteredEvents;
  
  const handleTileClick = (filter: TileFilterType) => {
    if (tileFilter === filter) {
      setTileFilter(null); // Toggle off
    } else {
      setTileFilter(filter);
      // When draft tile is clicked, also switch to draft filter
      if (filter === "draft") {
        setFilterStatus("draft");
      }
    }
  };

  const handleContextAction = (action: string, eventId?: string) => {
    if (action === 'share' && eventId) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        setSelectedEvent(event);
        setShareDialogOpen(true);
      }
    } else if (action === 'preview' && eventId) {
      const event = events.find(e => e.id === eventId);
      if (event) {
        navigate(`/event/${event.event_code}`);
      }
    }
  };

  const getFilterLabel = () => {
    if (tileFilter === "thisWeek") return "This Week";
    if (tileFilter === "atRisk") return "At Risk";
    if (tileFilter === "attention") return "Needs Attention";
    if (tileFilter === "upcoming") return "Active";
    if (tileFilter === "newActivity") return "New Activity";
    if (tileFilter === "updated") return "Recently Updated";
    if (tileFilter === "draft") return "Drafts";
    if (filterStatus === "upcoming") return "Upcoming";
    if (filterStatus === "past") return "Past Events";
    if (filterStatus === "draft") return "Drafts";
    return null;
  };

  const renderEventCard = (event: Event) => {
    const chips = getEventChips(event, smartNotifications);
    const contextReason = getEventContextReason(event as TileEvent, tileFilter);
    return (
      <EventCard
        key={event.id}
        event={event}
        healthScore={calculateHealthScore(event)}
        isPinned={pinnedEventId === event.id}
        smartChips={chips}
        contextTag={contextReason}
        onView={() => navigate(`/event/${event.event_code}`)}
        onEdit={() => {
          setSelectedEvent(event);
          setEditEventOpen(true);
        }}
        onShare={() => {
          setSelectedEvent(event);
          setShareDialogOpen(true);
        }}
        onSettings={() => {
          setSelectedEvent(event);
          setSettingsDialogOpen(true);
        }}
        onDuplicate={() => handleDuplicate(event)}
        onDelete={() => {
          setSelectedEvent(event);
          setDeleteDialogOpen(true);
        }}
        onPin={() => togglePin(event.id)}
      />
    );
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hidden md:block"><Header /></div>
        <main className="container mx-auto px-4 py-8 pb-20 pb-safe">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading your events...</p>
          </div>
        </main>
      </div>
    );
  }

  // No events at all - show full empty state
  if (allEvents.length === 0) {
    return (
      <div className="min-h-screen bg-background pt-safe">
        <div className="hidden md:block"><Header /></div>
        <main className="container mx-auto px-4 py-4 md:py-8 pb-20 pb-safe max-w-4xl">
          {/* Mobile Header */}
          <div className="md:hidden flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-heading font-bold tracking-tight">Host Dashboard</h1>
              <p className="text-sm text-muted-foreground">Your hosted events at a glance</p>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between mb-8">
            <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Host Dashboard</h1>
            <p className="text-muted-foreground">Your hosted events at a glance</p>
            </div>
          </div>

          <EventsEmptyState
            variant="no-events"
            onCreateEvent={() => setCreateEventOpen(true)}
            onPlanWithClick={() => setPlanWithClickOpen(true)}
          />
        </main>

        {/* Dialogs */}
        {isMobile ? (
          <MobileCreateEventFlow
            open={createEventOpen}
            onOpenChange={setCreateEventOpen}
            onEventCreated={() => {
              setCreateEventOpen(false);
              loadEvents();
            }}
          />
        ) : (
          <EnhancedWizardDialog
            open={createEventOpen}
            onOpenChange={setCreateEventOpen}
            onEventCreated={() => {
              setCreateEventOpen(false);
              loadEvents();
            }}
          />
        )}

        <PlanWithClickDialog
          open={planWithClickOpen}
          onOpenChange={setPlanWithClickOpen}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-safe">
      {/* Desktop: Show Header */}
      <div className="hidden md:block"><Header /></div>
      
      <main className="container mx-auto px-4 py-4 md:py-8 pb-20 pb-safe max-w-7xl">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <div>
              <h1 className="text-2xl font-heading font-bold tracking-tight">Host Dashboard</h1>
              <p className="text-sm text-muted-foreground">Your hosted events at a glance</p>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setPlanWithClickOpen(true)} 
              className="h-10 px-3"
            >
              <MousePointerClick className="h-4 w-4" />
              <span className="sr-only">Plan With a Click</span>
            </Button>
            <Button size="sm" onClick={() => setCreateEventOpen(true)} className="h-10">
              <Plus className="h-4 w-4 mr-1" />
              Create
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/how-it-works")}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  How It Works
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">Host Dashboard</h1>
            <p className="text-muted-foreground">Your hosted events at a glance</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActivityDialogOpen(true)}>
              <Activity className="h-4 w-4 mr-2" />
              Activity
            </Button>
            <Button variant="outline" onClick={() => setPlanWithClickOpen(true)}>
              <MousePointerClick className="h-4 w-4 mr-2" />
              Plan With a Click
            </Button>
            <Button onClick={() => setCreateEventOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate("/how-it-works")}>
                  <HelpCircle className="h-4 w-4 mr-2" />
                  How It Works
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Smart Banner - Mobile */}
        {isMobile && smartNotifications.length > 0 && (
          <SmartBannerCompact
            notifications={smartNotifications}
            onDismiss={dismiss}
            className="mb-4"
          />
        )}

        {/* Smart Banner - Desktop */}
        {!isMobile && smartNotifications.length > 0 && (
          <SmartBanner
            notifications={smartNotifications}
            onDismiss={dismiss}
            className="mb-4"
          />
        )}

        {/* Draft Reminder Banner */}
        {draftEvents.length > 0 && filterStatus !== "draft" && tileFilter !== "draft" && (
          <Alert className="mb-4 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <FileEdit className="h-4 w-4 text-amber-600" />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-amber-800 dark:text-amber-200">
                You have {draftEvents.length} unfinished draft{draftEvents.length > 1 ? 's' : ''}. Continue where you left off!
              </span>
              <Button 
                size="sm" 
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50"
                onClick={() => {
                  setFilterStatus("draft");
                  setTileFilter("draft");
                }}
              >
                View Drafts
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Tiles */}
        <div className="mb-4">
          <SummaryTilesV2
            counts={tileCounts}
            activeFilter={tileFilter}
            onTileClick={handleTileClick}
          />
        </div>

        {/* Contextual Action Bar */}
        {tileFilter && (
          <ContextualActionBar
            tileFilter={tileFilter}
            selectedEventId={filteredEvents[0]?.id}
            onAction={handleContextAction}
            onCreateEvent={() => setCreateEventOpen(true)}
            className="mb-4"
          />
        )}

        {/* Desktop: Notification Panel */}
        <div className="hidden lg:block mb-6">
          <div className="border rounded-lg max-h-[300px] overflow-y-auto">
            <NotificationDashboard events={events} />
          </div>
        </div>

        {/* Push Permission Prompt */}
        {shouldShowPushPrompt && (
          <div className="mb-4">
            <PushPermissionPrompt onClose={() => setShowPushPrompt(false)} />
          </div>
        )}

        {/* Sticky Filter Bar */}
        <StickyFilterBar
          searchTerm={searchTerm}
          onSearchChange={(value) => {
            setSearchTerm(value);
            setTileFilter(null); // Clear tile filter when searching
          }}
          filterStatus={filterStatus}
          onFilterChange={(status) => {
            setFilterStatus(status);
            setTileFilter(null); // Clear tile filter when changing tabs
          }}
          sortBy={sortBy}
          onSortChange={setSortBy}
          counts={{
            all: allActiveEvents.length + draftEvents.length + archivedEvents.length,
            upcoming: upcomingEvents.length,
            past: pastEvents.filter(e => !e.is_archived).length + archivedEvents.length,
            draft: draftEvents.length,
          }}
          activeTileFilter={tileFilter}
          onClearTileFilter={() => setTileFilter(null)}
        />

        {/* Events List/Grid */}
        <div className="mt-4">
          {filteredEvents.length === 0 ? (
            <EventsEmptyState
              variant={tileFilter ? "tile-filter" : "no-results"}
              tileFilter={tileFilter || undefined}
              filterLabel={getFilterLabel() || undefined}
              onCreateEvent={() => setCreateEventOpen(true)}
              onClearFilter={() => setTileFilter(null)}
            />
          ) : (
            <div className="space-y-4">
              {/* Pinned Event Section */}
              {pinnedEvent && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Pin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">Pinned</span>
                  </div>
                  {renderEventCard(pinnedEvent)}
                </div>
              )}

              {/* All Events Grid */}
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {unpinnedEvents.map(renderEventCard)}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Scroll to Top Button */}
      <ScrollToTop />

      {/* Dialogs */}
      <ActivityDialog 
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
      />
      
      {isMobile ? (
        <MobileCreateEventFlow
          open={createEventOpen}
          onOpenChange={setCreateEventOpen}
          onEventCreated={() => {
            setCreateEventOpen(false);
            loadEvents();
          }}
        />
      ) : (
        <EnhancedWizardDialog
          open={createEventOpen}
          onOpenChange={setCreateEventOpen}
          onEventCreated={() => {
            setCreateEventOpen(false);
            loadEvents();
          }}
        />
      )}

      {/* Edit Event Dialog */}
      {selectedEvent && (
        isMobile ? (
          <MobileCreateEventFlow
            open={editEventOpen}
            onOpenChange={setEditEventOpen}
            draftEventId={selectedEvent.id}
            onEventCreated={() => {
              setEditEventOpen(false);
              setSelectedEvent(null);
              loadEvents();
            }}
          />
        ) : (
          <EnhancedWizardDialog
            open={editEventOpen}
            onOpenChange={setEditEventOpen}
            draftEventId={selectedEvent.id}
            onEventCreated={() => {
              setEditEventOpen(false);
              setSelectedEvent(null);
              loadEvents();
            }}
          />
        )
      )}

      {selectedEvent && (
        <>
          <ShareEventDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            eventId={selectedEvent.id}
            eventCode={selectedEvent.event_code}
          />

          <EventSettingsDialog
            open={settingsDialogOpen}
            onOpenChange={setSettingsDialogOpen}
            eventId={selectedEvent.id}
            eventName={selectedEvent.name}
            currentSettings={{
              privacySetting: selectedEvent.privacy_setting || 'public',
              allowPlusOnes: selectedEvent.allow_plus_ones || false,
              maxPlusOnes: (selectedEvent as any).max_plus_ones || null,
              showGuestList: selectedEvent.show_guest_list || false,
              archiveDelay: selectedEvent.archive_delay_days || 30,
              itemClaimEligibility: (selectedEvent as any).item_claim_eligibility || 'attending_only',
              itemSuggestEligibility: (selectedEvent as any).item_suggest_eligibility || 'attending_and_maybe',
              remindersEnabled: (selectedEvent as any).reminders_enabled !== false,
              requireEmailForMessages: (selectedEvent as any).require_email_for_messages || false,
              requireEmailForRsvp: (selectedEvent as any).require_email_for_rsvp || false,
              reminderSettings: (selectedEvent as any).reminder_settings || {
                rsvp_reminder_days: 3,
                item_reminder_days: 2,
                contribution_reminder_days: 1,
                thank_you_delay_days: 1,
              },
              skipExternalLinkInterstitial: (selectedEvent as any).skip_external_link_interstitial || false,
              maxGuestClaimsPerItem: (selectedEvent as any).max_guest_claims_per_item || null,
            }}
            onUpdate={loadEvents}
          />

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Event?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete "{selectedEvent.name}" and all associated data (RSVPs, items, tasks). This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}

      <PlanWithClickDialog
        open={planWithClickOpen}
        onOpenChange={setPlanWithClickOpen}
      />
    </div>
  );
}
