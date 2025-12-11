import { Button } from "@/components/ui/button";
import { Calendar, Search, Plus, MousePointerClick, TrendingUp, AlertTriangle, AlertCircle, Bell, Clock, CheckCircle2, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";
import { type TileFilterType } from "./SummaryTilesV2";

interface EventsEmptyStateProps {
  variant: "no-events" | "no-results" | "tile-filter";
  tileFilter?: TileFilterType;
  filterLabel?: string;
  onCreateEvent: () => void;
  onPlanWithClick?: () => void;
  onClearFilter?: () => void;
}

const tileEmptyStates: Record<TileFilterType, {
  icon: typeof Calendar;
  iconColor: string;
  bgColor: string;
  title: string;
  message: string;
  isPositive?: boolean;
  showCreateCta?: boolean;
}> = {
  upcoming: {
    icon: Calendar,
    iconColor: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    title: "No active events",
    message: "Create your first event to get started planning!",
    showCreateCta: true,
  },
  thisWeek: {
    icon: TrendingUp,
    iconColor: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    title: "No events this week",
    message: "You have no events scheduled in the next 7 days.",
    showCreateCta: true,
  },
  attention: {
    icon: CheckCircle2,
    iconColor: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    title: "All events are on track!",
    message: "No events need your attention right now. Great job!",
    isPositive: true,
  },
  atRisk: {
    icon: CheckCircle2,
    iconColor: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    title: "No at-risk events",
    message: "All your upcoming events have healthy progress.",
    isPositive: true,
  },
  newActivity: {
    icon: Bell,
    iconColor: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    title: "No new activity",
    message: "No new RSVPs, comments, or updates in the last 24 hours.",
  },
  updated: {
    icon: Clock,
    iconColor: "text-cyan-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/30",
    title: "No recent updates",
    message: "No events have been modified in the last 48 hours.",
  },
  draft: {
    icon: FileEdit,
    iconColor: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    title: "No drafts",
    message: "You don't have any draft events. Create a new event to get started!",
    showCreateCta: true,
  },
};

export function EventsEmptyState({ 
  variant, 
  tileFilter,
  filterLabel,
  onCreateEvent, 
  onPlanWithClick,
  onClearFilter,
}: EventsEmptyStateProps) {
  // Tile-specific empty state
  if (variant === "tile-filter" && tileFilter) {
    const config = tileEmptyStates[tileFilter];
    const Icon = config.icon;

    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mb-4",
          config.bgColor
        )}>
          <Icon className={cn("h-8 w-8", config.iconColor)} />
        </div>
        <h3 className="text-lg font-semibold mb-1">{config.title}</h3>
        <p className="text-sm text-muted-foreground mb-5 max-w-xs">
          {config.message}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          {config.showCreateCta && (
            <Button onClick={onCreateEvent} size="lg" className="h-12">
              <Plus className="h-4 w-4 mr-2" />
              Create Event
            </Button>
          )}
          {onClearFilter && (
            <Button variant="outline" onClick={onClearFilter} size="lg" className="h-12">
              Clear Filter
            </Button>
          )}
        </div>
      </div>
    );
  }

  // No events at all
  if (variant === "no-events") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-6">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">You haven't created any events yet</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Plan your first gathering with SimplifiedHost.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={onCreateEvent} size="lg" className="h-12">
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Event
          </Button>
          {onPlanWithClick && (
            <Button variant="outline" onClick={onPlanWithClick} size="lg" className="h-12">
              <MousePointerClick className="h-4 w-4 mr-2" />
              Try Plan With a Click
            </Button>
          )}
        </div>
      </div>
    );
  }

  // No results from search/filter
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <Search className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">
        {filterLabel ? `No ${filterLabel.toLowerCase()} events` : "No events found"}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Create a new event or adjust your filters.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button onClick={onCreateEvent} variant="outline" className="h-10">
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
        {onClearFilter && (
          <Button variant="ghost" onClick={onClearFilter} className="h-10">
            Clear Filter
          </Button>
        )}
      </div>
    </div>
  );
}
