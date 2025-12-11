import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

// Dashboard components
import { EventManagementHeader } from "@/components/dashboard/EventManagementHeader";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";
import { EventSummaryCard } from "@/components/dashboard/EventSummaryCard";
import { OverviewKPIGrid } from "@/components/dashboard/OverviewKPIGrid";
import { StickyQuickActionsBar } from "@/components/dashboard/StickyQuickActionsBar";
import { SmartAlertBanner } from "@/components/dashboard/SmartAlertBanner";
import { NextBestActions } from "@/components/dashboard/NextBestActions";
import { EventSetupProgress } from "@/components/dashboard/EventSetupProgress";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";
import { PublishSuccessModal } from "@/components/dashboard/PublishSuccessModal";

// Tab content components
import { ItemsTasksTabV2 } from "@/components/dashboard/items-tasks/ItemsTasksTabV2";
import { PaymentsTab } from "@/components/dashboard/PaymentsTab";
import { GuestsTabV2 } from "@/components/dashboard/guests/GuestsTabV2";
import { AnnouncementsTab } from "@/components/dashboard/AnnouncementsTab";
import { RemindersTab } from "@/components/dashboard/RemindersTab";

// Dialogs
import { EnhancedWizardDialog } from "@/components/dashboard/EnhancedWizardDialog";
import { MobileCreateEventFlow } from "@/components/dashboard/MobileCreateEventFlow";
import { ShareEventDialog } from "@/components/dashboard/ShareEventDialog";
import { EventSettingsDialog } from "@/components/dashboard/EventSettingsDialog";
import { ContributionsCard } from "@/components/dashboard/ContributionsCard";
import { PaymentEducationModal } from "@/components/dashboard/PaymentEducationModal";
import { CollaboratorWelcomeBanner } from "@/components/dashboard/CollaboratorWelcomeBanner";
import { ScrollToTop } from "@/components/ui/scroll-to-top";

// Onboarding
import { HostOnboardingFlow } from "@/components/onboarding/HostOnboardingFlow";
import PlanWithClickDialog from "@/components/plan-with-click/PlanWithClickDialog";

import { useAuth } from "@/hooks/useAuth";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Eye,
  Wand2,
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  
  // Event state
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [collaborativeEvents, setCollaborativeEvents] = useState<any[]>([]);
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [isCollaborator, setIsCollaborator] = useState(false);
  
  // Dialog states
  const [wizardDialogOpen, setWizardDialogOpen] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [announcementsDialogOpen, setAnnouncementsDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [settingsDefaultTab, setSettingsDefaultTab] = useState<string>("general");
  const [remindersSheetOpen, setRemindersSheetOpen] = useState(false);
  const [educationModalOpen, setEducationModalOpen] = useState(false);
  const [pwacDialogOpen, setPwacDialogOpen] = useState(false);
  
  // Publish success modal state
  const [publishSuccessModalOpen, setPublishSuccessModalOpen] = useState(false);
  const [justPublishedEventId, setJustPublishedEventId] = useState<string | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState("overview");
  
  // Additional data for smart features
  const [announcementsCount, setAnnouncementsCount] = useState(0);
  
  // Tab navigation order for swipe gestures
  const tabOrder = ["overview", "items-tasks", "guests", "payments"];

  // Swipe gesture handlers
  const handleSwipeLeft = () => {
    if (!isMobile) return;
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex < tabOrder.length - 1) {
      const newTab = tabOrder[currentIndex + 1];
      handleTabChange(newTab);
    }
  };

  const handleSwipeRight = () => {
    if (!isMobile) return;
    const currentIndex = tabOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      const newTab = tabOrder[currentIndex - 1];
      handleTabChange(newTab);
    }
  };

  const swipeRef = useSwipeGesture<HTMLDivElement>({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    minSwipeDistance: 50,
  });
  
  // Metrics state
  const [metrics, setMetrics] = useState({
    rsvpCount: 0,
    rsvpConfirmed: 0,
    tasksCompleted: 0,
    tasksTotal: 0,
    itemsClaimed: 0,
    itemsTotal: 0,
    contributionsTotal: 0,
    contributionGoal: 0,
    daysUntilEvent: null as number | null,
    stripeContributions: 0,
    manualContributions: 0,
    contributorCount: 0,
  });
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Protect route
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Check for onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user || onboardingChecked) return;
      
      try {
        // Check if user has completed onboarding
        const { data: profile } = await supabase
          .from("profiles")
          .select("has_completed_host_onboarding")
          .eq("id", user.id)
          .single();
        
        // Check if user has any events
        const { count: eventCount } = await supabase
          .from("events")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);
        
        // Show onboarding if: not completed AND has 0 events
        const shouldShowOnboarding = 
          !profile?.has_completed_host_onboarding && 
          (eventCount === 0 || eventCount === null);
        
        setShowOnboarding(shouldShowOnboarding);
        setOnboardingChecked(true);
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setOnboardingChecked(true);
      }
    };
    
    if (!loading && user) {
      checkOnboarding();
    }
  }, [user, loading, onboardingChecked]);

  // Handle onboarding completion
  const handleOnboardingComplete = useCallback((openCreateEvent?: boolean) => {
    setShowOnboarding(false);
    if (openCreateEvent) {
      setWizardDialogOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadUserEvents();
  }, [user]);

  useEffect(() => {
    if (currentEvent) {
      loadEventMetrics();
      loadAnnouncementsCount();
    }
  }, [currentEvent]);

  const loadAnnouncementsCount = async () => {
    if (!currentEvent) return;
    const { count } = await supabase
      .from("announcements")
      .select("*", { count: "exact", head: true })
      .eq("event_id", currentEvent.id)
      .eq("is_published", true);
    setAnnouncementsCount(count || 0);
  };

  // Handle URL params for event and tab
  useEffect(() => {
    const eventId = searchParams.get('event');
    const tab = searchParams.get('tab');
    const openSettings = searchParams.get('openSettings');
    const openPWAC = searchParams.get('openPWAC');
    
    if (eventId && allEvents.length > 0) {
      const selected = allEvents.find(e => e.id === eventId);
      if (selected && selected.id !== currentEvent?.id) {
        setCurrentEvent(selected);
        try { localStorage.setItem('selectedEventId', selected.id); } catch {}
      }
    }
    
    if (tab && tabOrder.includes(tab)) {
      setActiveTab(tab);
    }

    // Handle openSettings query param from HostPreviewBar
    if (openSettings === 'true' && currentEvent) {
      setSettingsDialogOpen(true);
      // Remove the query param to prevent re-opening on refresh
      navigate(`/dashboard?event=${currentEvent.id}&tab=${activeTab}`, { replace: true });
    }

    // Handle openPWAC query param from onboarding
    if (openPWAC === 'true') {
      setPwacDialogOpen(true);
      // Remove the query param to prevent re-opening on refresh
      navigate(`/dashboard`, { replace: true });
    }
  }, [searchParams, allEvents, currentEvent]);

  const loadUserEvents = async () => {
    if (!user) return;
    
    // Load owned events
    const { data: ownedEvents } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_draft', false)
      .order('event_date', { ascending: false });

    // Load collaborative events
    const { data: collabRecords } = await supabase
      .from('event_collaborators')
      .select('event_id')
      .eq('user_id', user.id)
      .eq('status', 'active');

    let collabEvents: any[] = [];
    if (collabRecords && collabRecords.length > 0) {
      const collabEventIds = collabRecords.map(c => c.event_id);
      const { data: collabEventsData } = await supabase
        .from('events')
        .select('*')
        .in('id', collabEventIds)
        .eq('is_draft', false)
        .order('event_date', { ascending: false });
      
      if (collabEventsData) {
        collabEvents = collabEventsData;
      }
    }

    setCollaborativeEvents(collabEvents);

    // Combine all events (owned + collaborative)
    const allEventsData = [...(ownedEvents || []), ...collabEvents];

    if (allEventsData.length > 0) {
      setAllEvents(allEventsData);

      let nextEvent = currentEvent && allEventsData.find(e => e.id === currentEvent.id) ? currentEvent : null;

      const urlEventId = searchParams.get('event');
      if (!nextEvent && urlEventId) {
        const byUrl = allEventsData.find(e => e.id === urlEventId);
        if (byUrl) nextEvent = byUrl;
      }

      if (!nextEvent) {
        const storedId = localStorage.getItem('selectedEventId');
        if (storedId) {
          const byStored = allEventsData.find(e => e.id === storedId);
          if (byStored) nextEvent = byStored;
        }
      }

      if (!nextEvent) nextEvent = allEventsData[0];

      if (nextEvent && nextEvent.id !== currentEvent?.id) {
        setCurrentEvent(nextEvent);
        // Check if this is a collaborative event
        const isCollab = nextEvent.user_id !== user.id;
        setIsCollaborator(isCollab);
        
        const currentTab = searchParams.get('tab') || activeTab;
        navigate(`/dashboard?event=${nextEvent.id}&tab=${currentTab}`, { replace: true });
      }
    } else {
      setAllEvents([]);
      setCurrentEvent(null);
      setIsCollaborator(false);
    }
  };

  const loadEventMetrics = async () => {
    if (!currentEvent) return;
    
    setMetricsLoading(true);
    try {
      // Fetch RSVPs
      const { data: rsvps, count: totalRsvps } = await supabase
        .from('rsvps')
        .select('*', { count: 'exact' })
        .eq('event_id', currentEvent.id);

      const confirmedCount = rsvps?.filter(r => r.rsvp_status === 'attending').length || 0;

      // Fetch Tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status')
        .eq('event_id', currentEvent.id);

      const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
      const totalTasks = tasks?.length || 0;

      // Fetch Items
      const { data: items } = await supabase
        .from('event_items')
        .select('id, claimed_by, is_host_provided')
        .eq('event_id', currentEvent.id);

      const totalItems = items?.length || 0;
      const claimedItems = items?.filter(i => i.claimed_by || i.is_host_provided).length || 0;

      // Fetch Contributions
      const { data: contributions } = await supabase
        .from('contributions')
        .select('amount')
        .eq('event_id', currentEvent.id);

      const totalContributions = contributions?.reduce((sum, c) => sum + Number(c.amount || 0), 0) || 0;

      // Fetch item_claims for Stripe vs Manual breakdown
      const { data: monetaryClaims } = await supabase
        .from('item_claims')
        .select('amount_contributed, payment_method, payment_verified, contributor_email')
        .eq('event_id', currentEvent.id)
        .eq('claim_type', 'monetary')
        .eq('payment_verified', true);

      const stripeTotal = monetaryClaims?.filter(c => c.payment_method === 'card').reduce((sum, c) => sum + Number(c.amount_contributed || 0), 0) || 0;
      const manualTotal = monetaryClaims?.filter(c => c.payment_method !== 'card').reduce((sum, c) => sum + Number(c.amount_contributed || 0), 0) || 0;
      const uniqueContributors = new Set(monetaryClaims?.map(c => c.contributor_email || 'anonymous') || []).size;

      // Calculate days until event
      let daysUntil = null;
      if (currentEvent.event_date) {
        const eventDate = new Date(currentEvent.event_date);
        const today = new Date();
        const diffTime = eventDate.getTime() - today.getTime();
        daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      setMetrics({
        rsvpCount: totalRsvps || 0,
        rsvpConfirmed: confirmedCount,
        tasksCompleted: completedTasks,
        tasksTotal: totalTasks,
        itemsClaimed: claimedItems,
        itemsTotal: totalItems,
        contributionsTotal: totalContributions + stripeTotal + manualTotal,
        contributionGoal: currentEvent.contribution_goal || 0,
        daysUntilEvent: daysUntil,
        stripeContributions: stripeTotal,
        manualContributions: manualTotal,
        contributorCount: uniqueContributors,
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (currentEvent) {
      navigate(`/dashboard?event=${currentEvent.id}&tab=${tab}`, { replace: true });
    }
  };

  const handleEventChange = (event: any) => {
    setCurrentEvent(event);
    // Check if this is a collaborative event
    const isCollab = user ? event.user_id !== user.id : false;
    setIsCollaborator(isCollab);
    
    try { localStorage.setItem('selectedEventId', event.id); } catch {}
    navigate(`/dashboard?event=${event.id}&tab=${activeTab}`, { replace: true });
    toast({
      title: "Event Switched",
      description: `Now viewing ${event.name}`,
    });
  };

  const handleEventCreated = useCallback(async (eventId: string) => {
    await loadUserEvents();
    loadEventMetrics();
    
    // Check if we should show the publish success modal
    const modalShownKey = `publishModal_shown_${eventId}`;
    const alreadyShown = localStorage.getItem(modalShownKey);
    
    if (!alreadyShown) {
      setJustPublishedEventId(eventId);
      setPublishSuccessModalOpen(true);
      localStorage.setItem(modalShownKey, 'true');
    }
  }, []);
  
  // Handlers for setup checklist navigation
  const handleNavigateToContributions = () => {
    setSettingsDefaultTab("contributions");
    setSettingsDialogOpen(true);
  };
  
  const handleNavigateToReminders = async () => {
    // Enable reminders with default presets if not already enabled
    if (currentEvent && !currentEvent.reminders_enabled) {
      await supabase.from('events').update({
        reminders_enabled: true,
        reminder_settings: {
          rsvp_reminder_days: 3,
          item_reminder_days: 2,
          contribution_reminder_days: 1,
          thank_you_delay_days: 1,
        }
      }).eq('id', currentEvent.id);
      await loadUserEvents();
      toast({
        title: "Smart Reminders Enabled",
        description: "Default reminder presets have been configured.",
      });
    }
    setRemindersSheetOpen(true);
  };
  
  const handleSetupChecklistDismiss = () => {
    // Dismiss is handled internally by SetupChecklist via localStorage
  };

  if (loading || !onboardingChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Show onboarding for new hosts
  if (showOnboarding) {
    return (
      <HostOnboardingFlow 
        userId={user.id}
        onComplete={handleOnboardingComplete}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 pb-safe">
      {/* Unified Header with Event Switcher */}
      <EventManagementHeader
        currentEvent={currentEvent}
        allEvents={allEvents}
        onEventChange={handleEventChange}
        onShareClick={() => setShareDialogOpen(true)}
        onSettingsClick={() => setSettingsDialogOpen(true)}
      />

      {/* Main Content Area */}
      <div className="max-w-5xl mx-auto px-4">
        {/* Sticky Tab Navigation */}
        <DashboardTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Sticky Quick Actions Bar - only for host/collaborator on active events */}
        {currentEvent && !currentEvent.is_archived && (
          <StickyQuickActionsBar
            onAddGuest={() => setShareDialogOpen(true)}
            onAddItem={() => handleTabChange("items-tasks")}
            onAddTask={() => handleTabChange("items-tasks")}
            onShareEvent={() => setShareDialogOpen(true)}
            onPreviewPublicPage={() => {
              if (currentEvent?.event_code) {
                if (isMobile) {
                  navigate(`/event/${currentEvent.event_code}`);
                } else {
                  window.open(`/event/${currentEvent.event_code}`, '_blank');
                }
              }
            }}
            onEditEvent={() => {
              setEditEventId(currentEvent.id);
              setWizardDialogOpen(true);
            }}
          />
        )}

        {/* Content area - swipeable on mobile */}
        <div ref={swipeRef} className="py-4">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="animate-fade-in">
              {currentEvent ? (
                <>
                  {/* Collaborator Welcome Banner */}
                  {isCollaborator && (
                    <CollaboratorWelcomeBanner 
                      eventId={currentEvent.id}
                      eventName={currentEvent.name}
                    />
                  )}

                  {/* Setup Checklist - persistent until dismissed or complete (host only) */}
                  {!metricsLoading && !isCollaborator && (
                    <SetupChecklist
                      eventId={currentEvent.id}
                      eventPublishedAt={currentEvent.published_at}
                      contributionsEnabled={currentEvent.contributions_enabled || false}
                      remindersEnabled={currentEvent.reminders_enabled || false}
                      hasItemsOrTasks={metrics.itemsTotal > 0 || metrics.tasksTotal > 0}
                      hasUsedAiRefinement={false}
                      onNavigateToContributions={handleNavigateToContributions}
                      onNavigateToReminders={handleNavigateToReminders}
                      onNavigateToItemsTasks={() => handleTabChange("items-tasks")}
                      onNavigateToAiRefinement={() => handleTabChange("items-tasks")}
                      onDismiss={handleSetupChecklistDismiss}
                    />
                  )}

                  {/* Event Summary Card */}
                  <div className="mb-4 md:mb-5">
                    <EventSummaryCard
                      event={currentEvent}
                      daysUntilEvent={metrics.daysUntilEvent}
                      showQuickActions={true}
                      onAddGuest={() => setShareDialogOpen(true)}
                      onAddItem={() => handleTabChange("items-tasks")}
                      onShareEvent={() => setShareDialogOpen(true)}
                      onEditEvent={() => {
                        setEditEventId(currentEvent.id);
                        setWizardDialogOpen(true);
                      }}
                      onPreviewPublicPage={() => {
                        if (currentEvent?.event_code) {
                          if (isMobile) {
                            navigate(`/event/${currentEvent.event_code}`);
                          } else {
                            window.open(`/event/${currentEvent.event_code}`, '_blank');
                          }
                        }
                      }}
                    />
                  </div>

                  {/* Smart Alert Banner */}
                  <div className="mb-4 md:mb-5">
                    <SmartAlertBanner
                      eventId={currentEvent.id}
                      eventName={currentEvent.name}
                      eventCreatedAt={currentEvent.created_at}
                      rsvpCount={metrics.rsvpCount}
                      rsvpDeadline={currentEvent.rsvp_deadline}
                      itemsTotal={metrics.itemsTotal}
                      tasksTotal={metrics.tasksTotal}
                      tasksCompleted={metrics.tasksCompleted}
                      daysUntilEvent={metrics.daysUntilEvent}
                      onInviteGuests={() => setShareDialogOpen(true)}
                      onAddItems={() => handleTabChange("items-tasks")}
                      onReviewTasks={() => handleTabChange("items-tasks")}
                      onSendReminder={() => setRemindersSheetOpen(true)}
                    />
                  </div>

                  {/* Event Setup Progress - only show after metrics load */}
                  {!metricsLoading && (
                    <div className="mb-4 md:mb-5">
                      <EventSetupProgress
                        hasBasicInfo={!!(currentEvent.name && currentEvent.event_date)}
                        hasLocation={!!currentEvent.location}
                        hasGuests={metrics.rsvpCount > 0}
                        hasItems={metrics.itemsTotal > 0}
                        hasTasks={metrics.tasksTotal > 0}
                      />
                    </div>
                  )}

                  {/* KPI Grid */}
                  <div className="mb-5 md:mb-6">
                    <OverviewKPIGrid
                      metrics={metrics}
                      loading={metricsLoading}
                      onTileClick={handleTabChange}
                    />
                  </div>

                  {/* Contributions Card - show for hosts, read-only summary for collaborators */}
                  <div className="mb-5 md:mb-6">
                    <ContributionsCard
                      contributionsEnabled={currentEvent.contributions_enabled || false}
                      contributionGoal={currentEvent.contribution_goal || 0}
                      stripeTotal={metrics.stripeContributions}
                      manualTotal={metrics.manualContributions}
                      contributorCount={metrics.contributorCount}
                      isCollaborator={isCollaborator}
                      onEnableContributions={() => setSettingsDialogOpen(true)}
                      onViewContributions={() => handleTabChange("payments")}
                      onPreviewGuestView={() => window.open(`/event/${currentEvent.event_code}`, '_blank')}
                      onOpenEducationModal={() => setEducationModalOpen(true)}
                    />
                  </div>

                  {/* Next Best Actions */}
                  <div className="mb-6 md:mb-7">
                    <NextBestActions
                      rsvpCount={metrics.rsvpCount}
                      itemsTotal={metrics.itemsTotal}
                      tasksTotal={metrics.tasksTotal}
                      tasksCompleted={metrics.tasksCompleted}
                      daysUntilEvent={metrics.daysUntilEvent}
                      eventCreatedAt={currentEvent.created_at}
                      announcementsCount={announcementsCount}
                      onInviteGuests={() => setShareDialogOpen(true)}
                      onSendReminder={() => setRemindersSheetOpen(true)}
                      onAddItems={() => handleTabChange("items-tasks")}
                      onAddTask={() => handleTabChange("items-tasks")}
                      onPostAnnouncement={() => setAnnouncementsDialogOpen(true)}
                      onReviewGuests={() => handleTabChange("guests")}
                      onReviewItems={() => handleTabChange("items-tasks")}
                      onReviewTasks={() => handleTabChange("items-tasks")}
                    />
                  </div>

                  {/* Recent Activity Feed */}
                  <RecentActivityFeed eventId={currentEvent.id} />
                </>
              ) : (
                <Card>
                  <CardContent className="py-16 text-center">
                    <p className="text-muted-foreground mb-4">
                      No events yet. Create your first event to get started.
                    </p>
                    <Button onClick={() => setWizardDialogOpen(true)}>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Create Event
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Items & Tasks Tab */}
          {activeTab === "items-tasks" && (
            <div className="animate-fade-in">
              {currentEvent ? (
              <ItemsTasksTabV2
                  eventId={currentEvent.id}
                  eventName={currentEvent.name}
                  eventDate={currentEvent.event_date}
                  eventLocation={currentEvent.location || ""}
                  contributionsEnabled={currentEvent.contributions_enabled || false}
                  contributionGoal={currentEvent.contribution_goal || 0}
                  expectedGuestCount={currentEvent.max_attendees || metrics.rsvpCount || 0}
                />
              ) : (
                <Card>
                  <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground">Select an event to manage items and tasks</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Guests Tab */}
          {activeTab === "guests" && (
            <div className="animate-fade-in">
              {currentEvent ? (
                <GuestsTabV2
                  eventId={currentEvent.id}
                  eventName={currentEvent.name}
                  eventCode={currentEvent.event_code}
                  eventDate={currentEvent.event_date}
                  contributionsEnabled={currentEvent.contributions_enabled || false}
                  onShareInvite={() => setShareDialogOpen(true)}
                />
              ) : (
                <Card>
                  <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground">Select an event to view guests</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === "payments" && (
            <div className="space-y-6 animate-fade-in">
              {currentEvent ? (
                <PaymentsTab
                  eventId={currentEvent.id}
                  eventName={currentEvent.name}
                  contributionsEnabled={currentEvent.contributions_enabled || false}
                  contributionGoal={currentEvent.contribution_goal || 0}
                  isCollaborator={isCollaborator}
                  onOpenSettings={() => setSettingsDialogOpen(true)}
                  onShareEvent={() => setShareDialogOpen(true)}
                />
              ) : (
                <Card>
                  <CardContent className="py-10 text-center">
                    <p className="text-muted-foreground">Select an event to view payments</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Dialogs */}
      {isMobile ? (
        <MobileCreateEventFlow
          open={wizardDialogOpen}
          onOpenChange={(open) => {
            setWizardDialogOpen(open);
            if (!open) setEditEventId(null);
          }}
          onEventCreated={handleEventCreated}
          draftEventId={editEventId}
        />
      ) : (
        <EnhancedWizardDialog
          open={wizardDialogOpen}
          onOpenChange={(open) => {
            setWizardDialogOpen(open);
            if (!open) setEditEventId(null);
          }}
          onEventCreated={handleEventCreated}
          draftEventId={editEventId}
        />
      )}
      
      {currentEvent && (
        <>
          <ShareEventDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            eventId={currentEvent.id}
            eventCode={currentEvent.event_code}
          />

          <Dialog open={announcementsDialogOpen} onOpenChange={setAnnouncementsDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Announcements</DialogTitle>
              </DialogHeader>
              <AnnouncementsTab eventId={currentEvent.id} eventName={currentEvent.name} />
            </DialogContent>
          </Dialog>

          <EventSettingsDialog
            open={settingsDialogOpen}
            onOpenChange={(open) => {
              setSettingsDialogOpen(open);
              if (!open) setSettingsDefaultTab("general");
            }}
            eventId={currentEvent.id}
            eventName={currentEvent.name}
            defaultTab={settingsDefaultTab}
            isCollaborator={isCollaborator}
            currentSettings={{
              privacySetting: currentEvent.privacy_setting || 'public',
              allowPlusOnes: currentEvent.allow_plus_ones || false,
              maxPlusOnes: (currentEvent as any).max_plus_ones || null,
              showGuestList: currentEvent.show_guest_list || false,
              archiveDelay: currentEvent.archive_delay_days || 30,
              itemClaimEligibility: (currentEvent as any).item_claim_eligibility || 'attending_only',
              itemSuggestEligibility: (currentEvent as any).item_suggest_eligibility || 'attending_and_maybe',
              remindersEnabled: (currentEvent as any).reminders_enabled !== false,
              requireEmailForMessages: (currentEvent as any).require_email_for_messages || false,
              requireEmailForRsvp: (currentEvent as any).require_email_for_rsvp || false,
              reminderSettings: (currentEvent as any).reminder_settings || {
                rsvp_reminder_days: 3,
                item_reminder_days: 2,
                contribution_reminder_days: 1,
                thank_you_delay_days: 1,
              },
              skipExternalLinkInterstitial: (currentEvent as any).skip_external_link_interstitial || false,
              maxGuestClaimsPerItem: (currentEvent as any).max_guest_claims_per_item || null,
            }}
            onUpdate={loadUserEvents}
          />

          <Sheet open={remindersSheetOpen} onOpenChange={setRemindersSheetOpen}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Event Reminders</SheetTitle>
                <SheetDescription>
                  Manage automated reminders and send manual notifications
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <RemindersTab 
                  eventId={currentEvent.id}
                  eventDate={currentEvent.event_date}
                  rsvpDeadline={currentEvent.rsvp_deadline}
                  hideSettings={true}
                  onOpenSettings={() => {
                    setRemindersSheetOpen(false);
                    setSettingsDialogOpen(true);
                  }}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Payment Education Modal */}
          <PaymentEducationModal
            open={educationModalOpen}
            onOpenChange={setEducationModalOpen}
          />
        </>
      )}

      {/* Preview Public Page Button - Floating (Desktop only) */}
      {currentEvent && (
        <Button
          onClick={() => navigate(`/event/${currentEvent.event_code}`)}
          className="hidden md:flex fixed bottom-24 right-6 h-12 w-12 rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-200 z-[60] p-0"
          title="Preview Public Page"
          aria-label="Preview Public Page"
        >
          <Eye className="h-5 w-5" />
        </Button>
      )}

      {/* Publish Success Modal */}
      <PublishSuccessModal
        open={publishSuccessModalOpen}
        onOpenChange={setPublishSuccessModalOpen}
        eventName={currentEvent?.name || ''}
        onShareEvent={() => {
          setPublishSuccessModalOpen(false);
          setShareDialogOpen(true);
        }}
        onEnhanceEvent={() => {
          setPublishSuccessModalOpen(false);
          // Scroll to overview tab where checklist is
          setActiveTab("overview");
        }}
      />

      {/* Plan With a Click Dialog */}
      <PlanWithClickDialog
        open={pwacDialogOpen}
        onOpenChange={setPwacDialogOpen}
      />

      <ScrollToTop />
    </div>
  );
};

export default Dashboard;
