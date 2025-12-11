import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, DollarSign, Bell, ListChecks, X, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SetupChecklistProps {
  eventId: string;
  eventPublishedAt?: string | null;
  contributionsEnabled: boolean;
  remindersEnabled: boolean;
  hasItemsOrTasks: boolean;
  hasUsedAiRefinement?: boolean;
  onNavigateToContributions: () => void;
  onNavigateToReminders: () => void;
  onNavigateToItemsTasks: () => void;
  onNavigateToAiRefinement?: () => void;
  onDismiss: () => void;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  isComplete: boolean;
  onClick: () => void;
}

interface ChecklistState {
  dismissed: boolean;
  visitCount: number;
  hasInteracted: boolean;
  lastVisit: number;
}

const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

export function SetupChecklist({
  eventId,
  eventPublishedAt,
  contributionsEnabled,
  remindersEnabled,
  hasItemsOrTasks,
  hasUsedAiRefinement = false,
  onNavigateToContributions,
  onNavigateToReminders,
  onNavigateToItemsTasks,
  onNavigateToAiRefinement,
  onDismiss,
}: SetupChecklistProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const storageKey = `setupChecklist_state_${eventId}`;

  // Get or initialize checklist state from localStorage
  const getStoredState = useCallback((): ChecklistState => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Ignore parse errors
    }
    return {
      dismissed: false,
      visitCount: 0,
      hasInteracted: false,
      lastVisit: Date.now(),
    };
  }, [storageKey]);

  const saveState = useCallback((state: ChecklistState) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Ignore storage errors
    }
  }, [storageKey]);

  // Check persistence state on mount and increment visit count
  useEffect(() => {
    const state = getStoredState();
    
    // If already dismissed, hide completely
    if (state.dismissed) {
      setIsDismissed(true);
      return;
    }

    // Increment visit count (new session detection: >5 min since last visit)
    const isNewVisit = Date.now() - state.lastVisit > 5 * 60 * 1000;
    if (isNewVisit) {
      state.visitCount += 1;
    }
    state.lastVisit = Date.now();
    saveState(state);

    // Determine if should auto-minimize
    const eventAge = eventPublishedAt 
      ? Date.now() - new Date(eventPublishedAt).getTime() 
      : 0;
    
    const isOlderThan48Hours = eventAge > FORTY_EIGHT_HOURS_MS;
    const visitedTwiceWithoutInteraction = state.visitCount >= 2 && !state.hasInteracted;
    const expiredWithoutInteraction = isOlderThan48Hours && !state.hasInteracted;

    // Auto-minimize if either condition is met
    if (visitedTwiceWithoutInteraction || expiredWithoutInteraction) {
      setIsMinimized(true);
    }
  }, [eventId, eventPublishedAt, getStoredState, saveState]);

  // Build checklist items - AI refinement only shows if items are sparse and not yet used
  const baseChecklistItems: ChecklistItem[] = [
    {
      id: 'contributions',
      label: 'Enable Contributions',
      description: "Let guests chip in for food, decor, or venue. Powered by Stripe Connect.",
      icon: <DollarSign className="h-4 w-4" />,
      isComplete: contributionsEnabled,
      onClick: onNavigateToContributions,
    },
    {
      id: 'reminders',
      label: 'Turn on Smart Reminders',
      description: "We'll remind guests before RSVP closes and on the day of your event.",
      icon: <Bell className="h-4 w-4" />,
      isComplete: remindersEnabled,
      onClick: onNavigateToReminders,
    },
    {
      id: 'items-tasks',
      label: 'Review Items & Tasks',
      description: "Add items, tasks, or use AI to auto-generate a quick starter list.",
      icon: <ListChecks className="h-4 w-4" />,
      isComplete: hasItemsOrTasks,
      onClick: onNavigateToItemsTasks,
    },
  ];

  // Add AI refinement option only if: items are sparse/incomplete AND host hasn't used AI yet
  const showAiRefinement = !hasUsedAiRefinement && hasItemsOrTasks && onNavigateToAiRefinement;
  
  const checklistItems: ChecklistItem[] = showAiRefinement 
    ? [
        ...baseChecklistItems,
        {
          id: 'ai-refinement',
          label: 'Refine Items with AI',
          description: "Use AI to enhance or expand your event items.",
          icon: <Sparkles className="h-4 w-4" />,
          isComplete: hasUsedAiRefinement,
          onClick: onNavigateToAiRefinement,
        },
      ]
    : baseChecklistItems;

  const completedCount = checklistItems.filter(item => item.isComplete).length;
  const totalCount = checklistItems.length;
  const progressPercentage = (completedCount / totalCount) * 100;
  const allComplete = completedCount === totalCount;

  // Hide completely if dismissed or all complete
  if (isDismissed || allComplete) {
    return null;
  }

  const handleDismiss = () => {
    const state = getStoredState();
    state.dismissed = true;
    saveState(state);
    setIsDismissed(true);
    onDismiss();
  };

  const handleItemClick = (item: ChecklistItem) => {
    // Mark as interacted - prevents future auto-minimize
    const state = getStoredState();
    if (!state.hasInteracted) {
      state.hasInteracted = true;
      saveState(state);
    }
    item.onClick();
  };

  const handleExpand = () => {
    // Mark as interacted when expanding from pill
    const state = getStoredState();
    if (!state.hasInteracted) {
      state.hasInteracted = true;
      saveState(state);
    }
    setIsMinimized(false);
  };

  // Minimized pill view
  if (isMinimized) {
    return (
      <button
        onClick={handleExpand}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg mb-4 md:mb-5",
          "bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors text-left"
        )}
      >
        <span className="text-sm font-medium text-foreground">
          Finish setup (Optional)
        </span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    );
  }

  // Full expanded view
  return (
    <Card className="border-primary/20 bg-primary/5 mb-4 md:mb-5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <CardTitle className="text-sm font-semibold">
              Finish your setup (Optional)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {completedCount} of {totalCount} completed
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
            onClick={handleDismiss}
            aria-label="Dismiss setup checklist"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={progressPercentage} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {checklistItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={cn(
              "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
              "hover:bg-background/60",
              item.isComplete && "opacity-60"
            )}
          >
            {/* Checkbox indicator */}
            <div
              className={cn(
                "h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
                item.isComplete
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-muted-foreground/40"
              )}
            >
              {item.isComplete && <Check className="h-3 w-3" />}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{item.icon}</span>
                <span className={cn(
                  "text-sm font-medium",
                  item.isComplete && "line-through text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
