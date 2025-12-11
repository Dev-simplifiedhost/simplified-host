import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, MapPin, Users, Package, CheckCircle2, Eye, Edit, Share2, MoreHorizontal, Copy, Trash2, Pin, AlertCircle, ArrowRight } from "lucide-react";
import { format, isPast, isFuture, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EventCardChips } from "@/components/notifications/EventCardChips";
import { EventContextTag } from "@/components/dashboard/EventContextTag";

interface EventCardProps {
  event: {
    id: string;
    name: string;
    description: string | null;
    event_date: string | null;
    event_code: string;
    location: string | null;
    is_archived: boolean | null;
    is_draft?: boolean | null;
    start_time?: string | null;
    end_time?: string | null;
    is_all_day?: boolean | null;
    rsvp_count?: number;
    item_count?: number;
    items_claimed_count?: number;
    task_count?: number;
    tasks_completed_count?: number;
    max_attendees?: number | null;
    updated_at?: string | null;
  };
  healthScore: number;
  isPinned?: boolean;
  onView: () => void;
  onEdit: () => void;
  onShare: () => void;
  onSettings: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPin?: () => void;
  onNextAction?: (action: string) => void;
  smartChips?: { label: string; variant: "urgent" | "warning" | "info" | "success" }[];
  contextTag?: { label: string; variant: 'warning' | 'error' | 'success' | 'info' | 'muted' } | null;
}

function getStatusBadge(event: EventCardProps["event"], healthScore: number) {
  if (event.is_draft) {
    return { label: "Draft", variant: "secondary" as const };
  }
  if (event.is_archived) {
    return { label: "Archived", variant: "secondary" as const };
  }
  if (event.event_date && isPast(new Date(event.event_date))) {
    return { label: "Past", variant: "secondary" as const };
  }
  if (healthScore < 40) {
    return { label: "Needs Attention", variant: "destructive" as const };
  }
  if (healthScore < 60) {
    return { label: "At Risk", variant: "outline" as const, className: "border-orange-500 text-orange-600" };
  }
  if (event.event_date && isFuture(new Date(event.event_date))) {
    return { label: "Live", variant: "accent" as const };
  }
  return null;
}

// Front-end only logic to determine urgency indicators
function getUrgencyIndicators(event: EventCardProps["event"]): string[] {
  const indicators: string[] = [];
  
  // No RSVPs yet for upcoming event
  if (!event.rsvp_count || event.rsvp_count === 0) {
    indicators.push("No RSVPs yet");
  } else if (event.max_attendees && event.rsvp_count < event.max_attendees * 0.2) {
    indicators.push("Low RSVPs");
  }
  
  // No items added
  if (!event.item_count || event.item_count === 0) {
    indicators.push("Items not added");
  }
  
  // Tasks incomplete (< 50% for events within 7 days)
  if (event.task_count && event.task_count > 0) {
    const completionRate = (event.tasks_completed_count || 0) / event.task_count;
    if (completionRate < 0.5) {
      indicators.push("Tasks incomplete");
    }
  }
  
  // Missing essential details
  if (!event.description || !event.location) {
    indicators.push("Missing details");
  }
  
  return indicators.slice(0, 2); // Max 2 indicators
}

// Front-end only logic to suggest next best action
function getNextBestAction(event: EventCardProps["event"]): { label: string; action: string } | null {
  // Priority order of suggested actions
  
  // 1. Complete setup (missing critical info)
  if (!event.event_date || !event.location) {
    return { label: "Complete Setup", action: "edit" };
  }
  
  // 2. Add items (no items added)
  if (!event.item_count || event.item_count === 0) {
    return { label: "Add Items", action: "items" };
  }
  
  // 3. Invite guests (no RSVPs)
  if (!event.rsvp_count || event.rsvp_count === 0) {
    return { label: "Invite Guests", action: "share" };
  }
  
  // 4. Review tasks (tasks incomplete)
  if (event.task_count && event.task_count > 0) {
    const completionRate = (event.tasks_completed_count || 0) / event.task_count;
    if (completionRate < 1) {
      return { label: "Review Tasks", action: "tasks" };
    }
  }
  
  // 5. Share event (default for healthy events)
  return { label: "Share Event", action: "share" };
}

export function EventCard({ 
  event, 
  healthScore, 
  isPinned,
  onView, 
  onEdit, 
  onShare, 
  onSettings, 
  onDuplicate, 
  onDelete,
  onPin,
  onNextAction,
  smartChips = [],
  contextTag
}: EventCardProps) {
  const { toast } = useToast();

  const copyEventCode = async () => {
    try {
      await navigator.clipboard.writeText(event.event_code);
      toast({ title: "Event code copied!" });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const copyShareLink = async () => {
    const link = `${window.location.origin}/event/${event.event_code}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "Share link copied!" });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const statusBadge = getStatusBadge(event, healthScore);
  const urgencyIndicators = !event.is_archived && event.event_date && isFuture(new Date(event.event_date)) 
    ? getUrgencyIndicators(event) 
    : [];
  const nextAction = !event.is_archived && event.event_date && isFuture(new Date(event.event_date))
    ? getNextBestAction(event)
    : null;

  // Format date and time
  const formatDateTime = () => {
    if (!event.event_date) return null;
    const date = new Date(event.event_date);
    let dateStr = format(date, "MMM d, yyyy");
    
    if (!event.is_all_day && event.start_time) {
      const timeStr = format(new Date(`2000-01-01T${event.start_time}`), "h:mm a");
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace('_', ' ') || '';
      dateStr += ` · ${timeStr}`;
      if (tz) dateStr += ` ${tz}`;
    }
    
    return dateStr;
  };

  const handleNextActionClick = () => {
    if (!nextAction) return;
    
    if (nextAction.action === "share") {
      onShare();
    } else if (nextAction.action === "edit") {
      onEdit();
    } else if (nextAction.action === "items" || nextAction.action === "tasks") {
      // Navigate to dashboard with that event
      window.location.href = `/dashboard?event=${event.id}`;
    } else if (onNextAction) {
      onNextAction(nextAction.action);
    }
  };

  return (
    <Card className={cn(
      "hover:shadow-md transition-shadow",
      isPinned && "ring-2 ring-primary/30 bg-primary/5"
    )}>
      <CardContent className="p-4">
        {/* Top Row: Name + Status + Last Updated */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isPinned && <Pin className="h-3.5 w-3.5 text-primary shrink-0" />}
              <h3 className="font-semibold text-base line-clamp-1">{event.name}</h3>
            </div>
          </div>
          {statusBadge && (
            <Badge 
              variant={statusBadge.variant} 
              className={cn("shrink-0 text-xs", statusBadge.className)}
            >
              {statusBadge.label}
            </Badge>
          )}
        </div>

        {/* Last Updated */}
        {event.updated_at && (
          <p className="text-xs text-muted-foreground mb-2">
            Updated {formatDistanceToNow(new Date(event.updated_at), { addSuffix: true })}
          </p>
        )}

        {/* Details */}
        <div className="space-y-1 mb-3">
          {event.event_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs">{formatDateTime()}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs">{event.location}</span>
            </div>
          )}
        </div>

        {/* Quick Stats Row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 py-2 border-y border-border/50">
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{event.rsvp_count || 0}</span>
            <span className="hidden sm:inline">RSVPs</span>
          </div>
          <div className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">
              {event.items_claimed_count || 0}/{event.item_count || 0}
            </span>
            <span className="hidden sm:inline">Items</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">
              {event.tasks_completed_count || 0}/{event.task_count || 0}
            </span>
            <span className="hidden sm:inline">Tasks</span>
          </div>
        </div>

        {/* Context Tag (from tile filter) */}
        {contextTag && (
          <div className="mb-3">
            <EventContextTag label={contextTag.label} variant={contextTag.variant} />
          </div>
        )}

        {/* Smart Notification Chips */}
        {smartChips.length > 0 && (
          <EventCardChips chips={smartChips} className="mb-3" />
        )}

        {/* Urgency Indicators (only if no smart chips) */}
        {smartChips.length === 0 && urgencyIndicators.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {urgencyIndicators.map((indicator, idx) => (
              <span 
                key={idx}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-medium dark:bg-amber-950/50 dark:text-amber-300"
              >
                <AlertCircle className="h-3 w-3" />
                {indicator}
              </span>
            ))}
          </div>
        )}

        {/* Next Best Action + Actions Row */}
        <div className="flex items-center gap-2">
          {/* Next Best Action CTA */}
          {nextAction && (
            <Button 
              variant="secondary"
              size="sm" 
              className="h-9 text-xs gap-1"
              onClick={handleNextActionClick}
            >
              {nextAction.label}
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
          
          <Button 
            size="sm" 
            className="flex-1 h-9"
            onClick={() => window.location.href = `/dashboard?event=${event.id}`}
          >
            Manage
          </Button>
          
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onView}>
            <Eye className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onEdit}>
            <Edit className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onShare}>
            <Share2 className="h-4 w-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onPin && (
                <>
                  <DropdownMenuItem onClick={onPin}>
                    <Pin className="h-4 w-4 mr-2" />
                    {isPinned ? "Unpin Event" : "Pin Event"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Event
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyEventCode}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Event Code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyShareLink}>
                <Share2 className="h-4 w-4 mr-2" />
                Copy Share Link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
