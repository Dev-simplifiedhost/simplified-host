import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Lightbulb, X } from "lucide-react";

interface SetupHintsProps {
  eventId: string;
  itemsCount: number;
  tasksCount: number;
  rsvpCount: number;
  daysUntilEvent: number | null;
  onAddItem?: () => void;
  onAddTask?: () => void;
  onInviteGuests?: () => void;
}

interface Hint {
  id: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function SetupHints({
  eventId,
  itemsCount,
  tasksCount,
  rsvpCount,
  daysUntilEvent,
  onAddItem,
  onAddTask,
  onInviteGuests,
}: SetupHintsProps) {
  const [dismissedHints, setDismissedHints] = useState<Set<string>>(new Set());

  // Load dismissed hints from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`dismissed_hints_${eventId}`);
      if (stored) {
        setDismissedHints(new Set(JSON.parse(stored)));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [eventId]);

  const dismissHint = (hintId: string) => {
    const newDismissed = new Set(dismissedHints);
    newDismissed.add(hintId);
    setDismissedHints(newDismissed);
    
    try {
      localStorage.setItem(
        `dismissed_hints_${eventId}`,
        JSON.stringify([...newDismissed])
      );
    } catch {
      // Ignore localStorage errors
    }
  };

  // Build hints based on event state
  const allHints: Hint[] = [];

  if (itemsCount === 0) {
    allHints.push({
      id: "no_items",
      message: "No items added yet — add items so guests know what to bring.",
      action: onAddItem ? { label: "Add Item", onClick: onAddItem } : undefined,
    });
  }

  if (tasksCount === 0) {
    allHints.push({
      id: "no_tasks",
      message: "No tasks created — add tasks to stay organized.",
      action: onAddTask ? { label: "Add Task", onClick: onAddTask } : undefined,
    });
  }

  // Only show RSVP hint if event is > 3 days away
  if (rsvpCount === 0 && daysUntilEvent !== null && daysUntilEvent > 3) {
    allHints.push({
      id: "no_rsvps",
      message: "No RSVPs yet — share your event to start getting responses.",
      action: onInviteGuests ? { label: "Share Event", onClick: onInviteGuests } : undefined,
    });
  }

  // Filter out dismissed hints and limit to 2
  const visibleHints = allHints
    .filter((hint) => !dismissedHints.has(hint.id))
    .slice(0, 2);

  if (visibleHints.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleHints.map((hint) => (
        <Alert
          key={hint.id}
          className="relative py-3 pr-10 bg-muted/50 border-muted"
        >
          <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="flex items-center justify-between gap-4 ml-2">
            <span className="text-sm">{hint.message}</span>
            {hint.action && (
              <Button
                variant="link"
                size="sm"
                onClick={hint.action.onClick}
                className="shrink-0 h-auto p-0 text-primary"
              >
                {hint.action.label}
              </Button>
            )}
          </AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => dismissHint(hint.id)}
            aria-label="Dismiss hint"
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      ))}
    </div>
  );
}
