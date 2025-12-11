import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Sparkles, X, Plus } from "lucide-react";
import { getTaskSuggestions } from "@/lib/itemAiAssist";

interface AiTaskSuggestionBannerProps {
  itemCategories: string[];
  itemCount: number;
  onAddTask: (taskTitle: string) => void;
}

const TASK_BANNER_DISMISSED_KEY = 'ai_task_suggestions_dismissed';

export const AiTaskSuggestionBanner = ({
  itemCategories,
  itemCount,
  onAddTask,
}: AiTaskSuggestionBannerProps) => {
  const [dismissed, setDismissed] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    // Check session dismissal
    try {
      const dismissedAt = sessionStorage.getItem(TASK_BANNER_DISMISSED_KEY);
      if (dismissedAt) {
        setDismissed(true);
        return;
      }
    } catch {}

    // Only show after some items added
    if (itemCount < 2) {
      setSuggestions([]);
      return;
    }

    const tasks = getTaskSuggestions(itemCategories, itemCount);
    setSuggestions(tasks);
  }, [itemCategories, itemCount]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(TASK_BANNER_DISMISSED_KEY, Date.now().toString());
    } catch {}
  };

  const handleAddTask = (task: string) => {
    onAddTask(task);
    // Remove from suggestions
    setSuggestions(prev => prev.filter(t => t !== task));
  };

  if (dismissed || suggestions.length === 0) return null;

  return (
    <Alert className="relative bg-muted/50 border-primary/20 animate-fade-in">
      <Sparkles className="h-4 w-4 text-primary" />
      <AlertDescription>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Suggested tasks:</span>
          <div className="flex flex-col gap-1.5">
            {suggestions.map(task => (
              <Button
                key={task}
                variant="ghost"
                size="sm"
                className="justify-start h-9 text-sm hover:bg-primary/10"
                onClick={() => handleAddTask(task)}
              >
                <Plus className="h-4 w-4 mr-2 text-primary" />
                {task}
              </Button>
            ))}
          </div>
        </div>
      </AlertDescription>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={handleDismiss}
        aria-label="Dismiss task suggestions"
      >
        <X className="h-3 w-3" />
      </Button>
    </Alert>
  );
};
