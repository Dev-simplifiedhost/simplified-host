import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestedTask {
  title: string;
  priority: string;
  category: string;
}

interface TaskSuggestionCarouselProps {
  eventType?: string;
  eventDate?: string | null;
  taskCount: number;
  completionRate: number;
  onAddTask: (task: SuggestedTask) => void;
  onDismiss: () => void;
}

// Rule-based suggestions by event type
const SUGGESTIONS_BY_TYPE: Record<string, SuggestedTask[]> = {
  dinner_party: [
    { title: "Create guest list", priority: "high", category: "planning" },
    { title: "Plan menu", priority: "high", category: "planning" },
    { title: "Send invitations", priority: "high", category: "communication" },
    { title: "Buy groceries", priority: "medium", category: "logistics" },
    { title: "Set up dining area", priority: "medium", category: "day_of" }
  ],
  birthday: [
    { title: "Choose party theme", priority: "medium", category: "planning" },
    { title: "Order cake", priority: "high", category: "logistics" },
    { title: "Send invitations", priority: "high", category: "communication" },
    { title: "Plan activities/games", priority: "medium", category: "planning" },
    { title: "Set up decorations", priority: "medium", category: "day_of" }
  ],
  potluck: [
    { title: "Create sign-up sheet", priority: "high", category: "planning" },
    { title: "Assign dish categories", priority: "medium", category: "planning" },
    { title: "Remind guests of assignments", priority: "medium", category: "communication" },
    { title: "Prepare serving supplies", priority: "low", category: "logistics" },
    { title: "Set up food stations", priority: "medium", category: "day_of" }
  ],
  default: [
    { title: "Finalize guest list", priority: "high", category: "planning" },
    { title: "Send invitations", priority: "high", category: "communication" },
    { title: "Confirm venue/location", priority: "high", category: "logistics" },
    { title: "Plan food and drinks", priority: "medium", category: "planning" },
    { title: "Follow up with RSVPs", priority: "medium", category: "communication" }
  ]
};

export function TaskSuggestionCarousel({
  eventType,
  eventDate,
  taskCount,
  completionRate,
  onAddTask,
  onDismiss
}: TaskSuggestionCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [addedTasks, setAddedTasks] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);

  // Check if should show (< 3 tasks or < 20% complete)
  const shouldShow = !dismissed && (taskCount < 3 || completionRate < 20);

  useEffect(() => {
    // Check localStorage for dismissal
    const dismissedKey = `task_suggestions_dismissed_${eventType || 'default'}`;
    if (localStorage.getItem(dismissedKey)) {
      setDismissed(true);
    }
  }, [eventType]);

  if (!shouldShow) return null;

  const suggestions = SUGGESTIONS_BY_TYPE[eventType || 'default'] || SUGGESTIONS_BY_TYPE.default;
  const availableSuggestions = suggestions.filter(s => !addedTasks.has(s.title));

  if (availableSuggestions.length === 0) return null;

  const currentSuggestion = availableSuggestions[currentIndex % availableSuggestions.length];

  const handleAdd = () => {
    onAddTask(currentSuggestion);
    setAddedTasks(prev => new Set([...prev, currentSuggestion.title]));
    if (currentIndex >= availableSuggestions.length - 1) {
      setCurrentIndex(0);
    }
  };

  const handleDismiss = () => {
    const dismissedKey = `task_suggestions_dismissed_${eventType || 'default'}`;
    localStorage.setItem(dismissedKey, 'true');
    setDismissed(true);
    onDismiss();
  };

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? availableSuggestions.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % availableSuggestions.length);
  };

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary mb-1">
              Recommended Tasks
            </p>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">{currentSuggestion.title}</span>
              <Badge variant="outline" className="text-[10px] capitalize">
                {currentSuggestion.priority}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-8" onClick={handleAdd}>
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
              
              {availableSuggestions.length > 1 && (
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handlePrev}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {(currentIndex % availableSuggestions.length) + 1}/{availableSuggestions.length}
                  </span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
