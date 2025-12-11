import { useState, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, Users, Package, CheckSquare, Send } from "lucide-react";

interface SmartAlertBannerProps {
  eventId: string;
  eventName: string;
  eventCreatedAt: string | null;
  rsvpCount: number;
  rsvpDeadline: string | null;
  itemsTotal: number;
  tasksTotal: number;
  tasksCompleted: number;
  daysUntilEvent: number | null;
  onInviteGuests: () => void;
  onAddItems: () => void;
  onReviewTasks: () => void;
  onSendReminder: () => void;
}

interface AlertConfig {
  id: string;
  priority: number;
  icon: React.ReactNode;
  message: string;
  cta: string;
  action: () => void;
  variant: "default" | "destructive";
}

export function SmartAlertBanner({
  eventId,
  eventName,
  eventCreatedAt,
  rsvpCount,
  rsvpDeadline,
  itemsTotal,
  tasksTotal,
  tasksCompleted,
  daysUntilEvent,
  onInviteGuests,
  onAddItems,
  onReviewTasks,
  onSendReminder,
}: SmartAlertBannerProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    try {
      const stored = sessionStorage.getItem(`dismissed_alerts_${eventId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const dismissAlert = (alertId: string) => {
    const newDismissed = new Set(dismissedAlerts);
    newDismissed.add(alertId);
    setDismissedAlerts(newDismissed);
    try {
      sessionStorage.setItem(
        `dismissed_alerts_${eventId}`,
        JSON.stringify([...newDismissed])
      );
    } catch {}
  };

  // Calculate days since event created
  const daysSinceCreated = useMemo(() => {
    if (!eventCreatedAt) return 0;
    const created = new Date(eventCreatedAt);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }, [eventCreatedAt]);

  // Calculate days until RSVP deadline
  const daysUntilDeadline = useMemo(() => {
    if (!rsvpDeadline) return null;
    const deadline = new Date(rsvpDeadline);
    const now = new Date();
    return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [rsvpDeadline]);

  // Build alerts based on priority
  const alerts: AlertConfig[] = useMemo(() => {
    const result: AlertConfig[] = [];

    // Priority 1: Event ≤48h away AND RSVPs < 5
    if (daysUntilEvent !== null && daysUntilEvent <= 2 && daysUntilEvent >= 0 && rsvpCount < 5) {
      result.push({
        id: "low_rsvps_urgent",
        priority: 1,
        icon: <AlertTriangle className="h-4 w-4" />,
        message: `RSVPs are still low for ${eventName}. Send a reminder?`,
        cta: "Send Reminder",
        action: onSendReminder,
        variant: "destructive",
      });
    }

    // Priority 2: RSVP deadline within 2 days
    if (daysUntilDeadline !== null && daysUntilDeadline <= 2 && daysUntilDeadline > 0) {
      result.push({
        id: "rsvp_deadline_soon",
        priority: 2,
        icon: <Send className="h-4 w-4" />,
        message: `RSVP deadline is coming up in ${daysUntilDeadline} day${daysUntilDeadline === 1 ? "" : "s"}`,
        cta: "Send Reminder",
        action: onSendReminder,
        variant: "default",
      });
    }

    // Priority 3: No items added
    if (itemsTotal === 0) {
      result.push({
        id: "no_items",
        priority: 3,
        icon: <Package className="h-4 w-4" />,
        message: "No items added yet. Add items so guests know what to bring.",
        cta: "Add Items",
        action: onAddItems,
        variant: "default",
      });
    }

    // Priority 4: Tasks exist, 0 completed, event < 7 days
    if (tasksTotal > 0 && tasksCompleted === 0 && daysUntilEvent !== null && daysUntilEvent < 7 && daysUntilEvent >= 0) {
      result.push({
        id: "tasks_not_started",
        priority: 4,
        icon: <CheckSquare className="h-4 w-4" />,
        message: "Your task list hasn't been started yet.",
        cta: "Review Tasks",
        action: onReviewTasks,
        variant: "default",
      });
    }

    // Priority 5: Event created > 48h ago and no RSVPs
    if (daysSinceCreated > 2 && rsvpCount === 0) {
      result.push({
        id: "no_guests_invited",
        priority: 5,
        icon: <Users className="h-4 w-4" />,
        message: "You haven't invited guests yet.",
        cta: "Invite Guests",
        action: onInviteGuests,
        variant: "default",
      });
    }

    return result.sort((a, b) => a.priority - b.priority);
  }, [
    daysUntilEvent,
    rsvpCount,
    eventName,
    daysUntilDeadline,
    itemsTotal,
    tasksTotal,
    tasksCompleted,
    daysSinceCreated,
    onSendReminder,
    onAddItems,
    onReviewTasks,
    onInviteGuests,
  ]);

  // Get highest priority non-dismissed alert
  const activeAlert = alerts.find((alert) => !dismissedAlerts.has(alert.id));

  if (!activeAlert) return null;

  return (
    <Alert
      variant={activeAlert.variant}
      className="relative pr-10"
    >
      {activeAlert.icon}
      <AlertDescription className="flex items-center justify-between gap-4 ml-2">
        <span className="text-sm flex-1">{activeAlert.message}</span>
        <Button
          size="sm"
          variant={activeAlert.variant === "destructive" ? "outline" : "default"}
          onClick={activeAlert.action}
          className="shrink-0 h-8"
        >
          {activeAlert.cta}
        </Button>
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => dismissAlert(activeAlert.id)}
        aria-label="Dismiss alert"
      >
        <X className="h-4 w-4" />
      </Button>
    </Alert>
  );
}
