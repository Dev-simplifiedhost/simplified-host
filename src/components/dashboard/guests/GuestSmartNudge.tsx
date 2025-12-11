import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Package, 
  Leaf, 
  X,
  Bell,
  ChevronRight
} from "lucide-react";
import { differenceInDays } from "date-fns";

interface GuestSmartNudgeProps {
  goingCount: number;
  noResponseCount: number;
  dietaryCount: number;
  claimableItemsCount: number;
  eventDate: string | null;
  contributionsEnabled: boolean;
  onSendReminders: () => void;
  onViewItems: () => void;
  onViewDietary: () => void;
}

type NudgeType = 'items' | 'low_rsvp' | 'dietary';

interface NudgeConfig {
  id: NudgeType;
  icon: typeof Users;
  title: string;
  body: string;
  action: string;
  onClick: () => void;
  priority: number;
}

export const GuestSmartNudge = ({ 
  goingCount,
  noResponseCount,
  dietaryCount,
  claimableItemsCount,
  eventDate,
  contributionsEnabled,
  onSendReminders,
  onViewItems,
  onViewDietary
}: GuestSmartNudgeProps) => {
  const [dismissedNudge, setDismissedNudge] = useState<NudgeType | null>(() => {
    try {
      const stored = sessionStorage.getItem('guest_nudge_dismissed');
      return stored as NudgeType | null;
    } catch {
      return null;
    }
  });

  // Calculate days until event
  const daysUntilEvent = useMemo(() => {
    if (!eventDate) return null;
    const eventDateObj = new Date(eventDate);
    return differenceInDays(eventDateObj, new Date());
  }, [eventDate]);

  // Determine which nudge to show based on rules
  const activeNudge = useMemo((): NudgeConfig | null => {
    const nudges: NudgeConfig[] = [];

    // Items nudge - show when guests are going but no/few items
    // Rules: event active, contributions enabled, goingCount >= 3, claimableItems = 0 OR ratio < 0.5
    if (contributionsEnabled && goingCount >= 3) {
      const ratio = claimableItemsCount / goingCount;
      
      if (claimableItemsCount === 0) {
        nudges.push({
          id: 'items',
          icon: Package,
          title: 'Your guests are ready',
          body: `You have ${goingCount} guests Going, but no items for them to claim yet.`,
          action: 'Add Items',
          onClick: onViewItems,
          priority: 1
        });
      } else if (ratio < 0.5) {
        nudges.push({
          id: 'items',
          icon: Package,
          title: 'Give everyone something to bring',
          body: `You have ${goingCount} guests Going, but only ${claimableItemsCount} claimable items.`,
          action: 'View Items',
          onClick: onViewItems,
          priority: 2
        });
      }
    }

    // Low RSVP response nudge
    // Rules: event active, daysUntilEvent <= 7, noResponseCount >= 2
    if (daysUntilEvent !== null && daysUntilEvent > 0 && daysUntilEvent <= 7 && noResponseCount >= 2) {
      nudges.push({
        id: 'low_rsvp',
        icon: Bell,
        title: 'Waiting on a few responses',
        body: `${noResponseCount} guests haven't responded yet.`,
        action: 'Send Reminders',
        onClick: onSendReminders,
        priority: 1
      });
    }

    // Dietary insights nudge
    // Rules: event active, dietaryCount >= 1
    if (dietaryCount >= 1) {
      nudges.push({
        id: 'dietary',
        icon: Leaf,
        title: 'Check dietary needs',
        body: `${dietaryCount} guest${dietaryCount !== 1 ? 's have' : ' has'} dietary restrictions that may need attention.`,
        action: 'View Details',
        onClick: onViewDietary,
        priority: 3
      });
    }

    // Sort by priority and filter dismissed
    const availableNudges = nudges
      .filter(n => n.id !== dismissedNudge)
      .sort((a, b) => a.priority - b.priority);

    return availableNudges[0] || null;
  }, [goingCount, noResponseCount, dietaryCount, claimableItemsCount, daysUntilEvent, contributionsEnabled, dismissedNudge, onSendReminders, onViewItems, onViewDietary]);

  const handleDismiss = () => {
    if (activeNudge) {
      setDismissedNudge(activeNudge.id);
      try {
        sessionStorage.setItem('guest_nudge_dismissed', activeNudge.id);
      } catch {
        // Silently fail
      }
    }
  };

  if (!activeNudge) return null;

  const Icon = activeNudge.icon;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="py-4 px-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{activeNudge.title}</h4>
            <p className="text-sm text-muted-foreground mt-0.5">{activeNudge.body}</p>
            <Button 
              size="sm" 
              variant="outline"
              className="h-8 mt-3 text-xs"
              onClick={activeNudge.onClick}
            >
              {activeNudge.action}
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0 -mt-1 -mr-1"
            onClick={handleDismiss}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
