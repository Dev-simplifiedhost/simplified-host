import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Share, Lightbulb, MessageSquare, HelpCircle } from "lucide-react";
import { parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { RSVPWizardDialog } from "@/components/event/RSVPWizardDialog";
import { MySuggestionsDialog } from "@/components/event/MySuggestionsDialog";
import { MessageHostDialog } from "@/components/event/MessageHostDialog";
import { ContributionDialog } from "@/components/event/ContributionDialog";
import { HostPreviewBar } from "@/components/event/HostPreviewBar";
import { Footer } from "@/components/Footer";
import { ScrollToTop } from "@/components/ui/scroll-to-top";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";

// Compact components
import { AnnouncementCompact } from "@/components/event/AnnouncementCompact";
import { EventInfoCompact } from "@/components/event/EventInfoCompact";
import { RSVPCompact } from "@/components/event/RSVPCompact";
import { ContributeCompact } from "@/components/event/ContributeCompact";
import { ItemsSectionCompact } from "@/components/event/ItemsSectionCompact";
import { ActivityFeedCompact } from "@/components/event/ActivityFeedCompact";
import { CommentsCompact } from "@/components/event/CommentsCompact";

const Event = () => {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contributeDialogOpen, setContributeDialogOpen] = useState(false);
  const [messageHostOpen, setMessageHostOpen] = useState(false);
  const [rsvpWizardOpen, setRsvpWizardOpen] = useState(false);
  const [userRsvp, setUserRsvp] = useState<any>(null);
  const [loadingUserRsvp, setLoadingUserRsvp] = useState(false);
  const [updatingRsvp, setUpdatingRsvp] = useState(false);
  const isMobile = useIsMobile();
  const [compactAnnouncements, setCompactAnnouncements] = useState<any[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<Set<string>>(new Set());
  const [mySuggestionsOpen, setMySuggestionsOpen] = useState(false);
  const [suggestionCount, setSuggestionCount] = useState(0);
  const [isHostOrCollaborator, setIsHostOrCollaborator] = useState(false);
  const [goingCount, setGoingCount] = useState(0);
  const commentsRef = useRef<{ expand: () => void } | null>(null);

  useEffect(() => {
    if (code) {
      loadEvent();
    }
  }, [code]);

  useEffect(() => {
    if (event) {
      checkHostOrCollaboratorStatus(event);
    }
  }, [user, event?.id]);

  useEffect(() => {
    if (!event?.id) return;
    loadCompactAnnouncements(event.id);
    loadDismissedAnnouncements(event.id);

    const channel = supabase
      .channel(`event-announcements-${event.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'announcements', 
        filter: `event_id=eq.${event.id}` 
      }, () => {
        loadCompactAnnouncements(event.id);
        if (!rsvpWizardOpen) {
          setDismissedAnnouncements(new Set());
          localStorage.removeItem(`dismissed_announcements_${event.id}`);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [event?.id]);

  useEffect(() => {
    if (!event?.id) return;
    const rsvpChannel = supabase
      .channel(`rsvps-${event.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps', filter: `event_id=eq.${event.id}` }, () => {
        loadUserRsvp(event.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(rsvpChannel); };
  }, [event?.id]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("events")
        .select("*")
        .eq("event_code", code?.toUpperCase())
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError("Event not found. Please check the code and try again.");
        } else {
          throw fetchError;
        }
        return;
      }

      if (data.privacy_setting === 'invite_only') {
        setError("This event requires an invite code. Please contact the host.");
        return;
      }

      setEvent(data);
      
      if (data.id) {
        loadUserRsvp(data.id);
        loadSuggestionCount(data.id);
        checkHostOrCollaboratorStatus(data);
        loadGoingCount(data.id);
      }
    } catch (error: any) {
      console.error("Error loading event:", error);
      setError("Failed to load event. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const checkHostOrCollaboratorStatus = async (eventData: any) => {
    if (!user) {
      setIsHostOrCollaborator(false);
      return;
    }

    if (eventData.user_id === user.id) {
      setIsHostOrCollaborator(true);
      return;
    }

    try {
      const { data: collaborator } = await supabase
        .from('event_collaborators')
        .select('id')
        .eq('event_id', eventData.id)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      setIsHostOrCollaborator(!!collaborator);
    } catch (error) {
      setIsHostOrCollaborator(false);
    }
  };

  const loadGoingCount = async (eventId: string) => {
    try {
      const { count } = await supabase
        .from('rsvps')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('rsvp_status', 'attending');
      
      setGoingCount(count || 0);
    } catch (error) {
      console.error('Error loading going count:', error);
    }
  };

  const loadSuggestionCount = async (eventId: string) => {
    const guestToken = localStorage.getItem(`guest_token_${eventId}`);
    if (!guestToken) return;

    try {
      const { data: rsvpData } = await supabase
        .from('rsvps')
        .select('id')
        .eq('event_id', eventId)
        .eq('guest_token', guestToken)
        .single();

      if (!rsvpData) return;

      const { count } = await supabase
        .from('item_suggestions')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', eventId)
        .eq('rsvp_id', rsvpData.id);

      setSuggestionCount(count || 0);
    } catch (error) {
      console.error('Error loading suggestion count:', error);
    }
  };

  const loadUserRsvp = async (eventId: string) => {
    const token = localStorage.getItem(`rsvp_token_${eventId}`);
    if (!token) {
      setUserRsvp(null);
      return;
    }
    
    setLoadingUserRsvp(true);
    try {
      const { data, error } = await supabase
        .rpc('get_my_rsvp_full', { p_event_id: eventId, p_guest_token: token })
        .maybeSingle();

      if (data && !error) {
        setUserRsvp(data);
        const count = Array.isArray((data as any).additional_guests) ? (data as any).additional_guests.length : 0;
        try { localStorage.setItem(`rsvp_plus_ones_${eventId}`, String(count)); } catch {}
      } else {
        setUserRsvp(null);
      }
    } catch (error) {
      console.error("Error loading user RSVP:", error);
    } finally {
      setLoadingUserRsvp(false);
    }
  };

  const loadCompactAnnouncements = async (eventId: string) => {
    try {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('event_id', eventId)
        .eq('visibility', 'public')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) {
        setCompactAnnouncements(data);
      }
    } catch (error) {
      console.error("Error loading announcements:", error);
    }
  };

  const loadDismissedAnnouncements = (eventId: string) => {
    try {
      const dismissed = localStorage.getItem(`dismissed_announcements_${eventId}`);
      if (dismissed) {
        setDismissedAnnouncements(new Set(JSON.parse(dismissed)));
      }
    } catch (error) {
      console.error("Error loading dismissed announcements:", error);
    }
  };

  const dismissAnnouncement = (announcementId: string) => {
    if (!event?.id) return;
    
    const newDismissed = new Set(dismissedAnnouncements);
    newDismissed.add(announcementId);
    setDismissedAnnouncements(newDismissed);
    
    try {
      localStorage.setItem(`dismissed_announcements_${event.id}`, JSON.stringify(Array.from(newDismissed)));
    } catch (error) {
      console.error("Error saving dismissed announcements:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading event...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Event Not Found</CardTitle>
            <CardDescription>{error || "This event doesn't exist or has been removed."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = "/"} className="w-full">Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isArchived = event.is_archived;

  return (
    <div className="min-h-screen bg-background">
      {/* Host Preview Bar */}
      {isHostOrCollaborator && event && (
        <HostPreviewBar eventId={event.id} eventName={event.name} />
      )}

      <div className={`container mx-auto px-4 py-4 max-w-2xl ${isHostOrCollaborator && isMobile ? 'pt-14' : ''}`}>
        
        {/* 1. Announcements */}
        <AnnouncementCompact
          announcements={compactAnnouncements.filter(a => !dismissedAnnouncements.has(a.id))}
          allAnnouncements={compactAnnouncements}
          onDismiss={dismissAnnouncement}
          onClearDismissals={() => {
            setDismissedAnnouncements(new Set());
            if (event?.id) {
              localStorage.removeItem(`dismissed_announcements_${event.id}`);
            }
          }}
          isArchived={isArchived}
        />

        {/* 2. Event Header */}
        <div className="pt-2 pb-3">
          <h1 className="text-[20px] font-bold text-foreground">{event.name}</h1>
          {event.host_name && (
            <p className="text-[13px] text-muted-foreground mt-0.5">Hosted by {event.host_name}</p>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => setMessageHostOpen(true)}>
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Message
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={async () => {
              const shareUrl = window.location.href;
              if (isMobile && navigator.share) {
                try {
                  await navigator.share({ title: event.name, text: `Join my event: ${event.name}`, url: shareUrl });
                } catch (err: any) {
                  if (err.name !== 'AbortError') {
                    navigator.clipboard.writeText(shareUrl);
                    toast({ title: "Link copied!" });
                  }
                }
              } else {
                navigator.clipboard.writeText(shareUrl);
                toast({ title: "Link copied!" });
              }
            }}>
              <Share className="h-3.5 w-3.5 mr-1.5" />
              Share
            </Button>
            {event.enable_comments && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-[12px]" 
                onClick={() => {
                  commentsRef.current?.expand();
                  toast({ title: "Jump to comments" });
                }}
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Comment
              </Button>
            )}
            {userRsvp && suggestionCount > 0 && (
              <Button variant="outline" size="sm" className="h-8 text-[12px]" onClick={() => setMySuggestionsOpen(true)}>
                <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
                My Suggestions
                <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">{suggestionCount}</Badge>
              </Button>
            )}
            {event.is_draft && <Badge variant="secondary" className="self-center text-[11px]">Draft</Badge>}
          </div>
        </div>

        {/* 3. Event Info */}
        <EventInfoCompact event={event} />

        {/* 4. Your RSVP */}
        <RSVPCompact
          userRsvp={userRsvp}
          isLoading={loadingUserRsvp}
          rsvpDeadline={event.rsvp_deadline}
          maxAttendees={event.max_attendees}
          onOpenRsvp={() => setRsvpWizardOpen(true)}
        />

        {/* 5. Contribute */}
        <ContributeCompact
          contributionsEnabled={event.contributions_enabled && (event.contribution_methods?.length > 0 || event.credit_card_payments_enabled)}
          contributionMessage={event.contribution_message}
          onContribute={() => setContributeDialogOpen(true)}
        />

        {/* 6. Items Section */}
        <ItemsSectionCompact
          eventId={event.id}
          sectionLabel={event.items_section_label || 'bring_something'}
          allowGuestItems={event.allow_guest_items}
          contributionMethods={event.contribution_methods || []}
          onSuggestionSubmitted={() => loadSuggestionCount(event.id)}
          eventDate={event.event_date}
          goingCount={goingCount}
          isArchived={event.is_archived}
          showNeedsMostHint={event.show_needs_most_hint ?? true}
        />

        {/* 7. Activity Feed */}
        <ActivityFeedCompact eventId={event.id} enabled={event.enable_activity_feed ?? false} />

        {/* 8. Comments & Discussion */}
        <CommentsCompact ref={commentsRef} eventId={event.id} hostName={event.host_name} enabled={event.enable_comments ?? true} />

        {/* 9. Guest Support Link */}
        <div className="text-center py-4 border-t mt-4">
          <a 
            href={`/support?t=general&eventCode=${event.event_code || ''}&s=publicEventPage`}
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Need help? Contact Support
          </a>
        </div>
      </div>

      {/* Dialogs */}
      <ContributionDialog
        open={contributeDialogOpen}
        onOpenChange={setContributeDialogOpen}
        eventId={event.id}
        contributionGoal={event.contribution_goal || 0}
        currentContributions={event.current_contributions || 0}
        showContributionGoal={event.show_contribution_goal || false}
        contributionMessage={event.contribution_message}
        contributionMethods={event.contribution_methods || []}
        creditCardPaymentsEnabled={event.credit_card_payments_enabled}
        contributionType={event.contribution_type}
        contributionPerGuest={event.contribution_per_guest}
        contributionSuggestedAmount={event.contribution_suggested_amount}
        contributionMinimumAmount={event.contribution_minimum_amount}
      />

      <MessageHostDialog 
        open={messageHostOpen}
        onOpenChange={setMessageHostOpen}
        eventId={event.id}
        requireEmail={event.require_email_for_messages ?? false}
      />

      <RSVPWizardDialog
        open={rsvpWizardOpen}
        onOpenChange={setRsvpWizardOpen}
        eventId={event.id}
        eventName={event.name}
        maxPlusOnes={event.max_plus_ones}
        allowPlusOnes={event.allow_plus_ones ?? true}
        rsvpDeadline={event.rsvp_deadline}
        maxAttendees={event.max_attendees}
        requireEmailForRsvp={(event as any).require_email_for_rsvp ?? false}
        onSuccess={(updatedRsvp) => {
          setUpdatingRsvp(true);
          setUserRsvp(updatedRsvp);
          loadEvent();
          setTimeout(() => {
            loadUserRsvp(event.id);
            setUpdatingRsvp(false);
          }, 500);
        }}
      />

      {userRsvp && (
        <MySuggestionsDialog
          eventId={event.id}
          guestToken={userRsvp.guest_token}
          open={mySuggestionsOpen}
          onOpenChange={setMySuggestionsOpen}
        />
      )}

      <ScrollToTop />
      <Footer />
    </div>
  );
};

export default Event;
