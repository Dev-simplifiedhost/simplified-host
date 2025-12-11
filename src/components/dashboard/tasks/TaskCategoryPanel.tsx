import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TaskCard, Task } from "./TaskCard";
import { cn } from "@/lib/utils";

export type TaskCategory = "planning" | "logistics" | "communication" | "day_of" | "wrap_up";

export const TASK_CATEGORIES: { id: TaskCategory; label: string; keywords: string[] }[] = [
  { 
    id: "planning", 
    label: "Planning",
    keywords: ["plan", "decide", "choose", "research", "budget", "guest list", "theme", "date", "schedule"]
  },
  { 
    id: "logistics", 
    label: "Logistics",
    keywords: ["venue", "rental", "order", "book", "reserve", "supplies", "equipment", "setup", "transport", "delivery"]
  },
  { 
    id: "communication", 
    label: "Communication",
    keywords: ["invite", "rsvp", "remind", "email", "text", "call", "announce", "notify", "confirm", "follow up"]
  },
  { 
    id: "day_of", 
    label: "Day-Of Execution",
    keywords: ["set up", "decorate", "cook", "prepare", "welcome", "greet", "serve", "coordinate", "manage"]
  },
  { 
    id: "wrap_up", 
    label: "Wrap-Up",
    keywords: ["clean", "return", "thank", "send", "pack", "discard", "store", "review", "feedback"]
  }
];

export function categorizeTask(title: string): TaskCategory {
  const lowerTitle = title.toLowerCase();
  
  for (const category of TASK_CATEGORIES) {
    if (category.keywords.some(keyword => lowerTitle.includes(keyword))) {
      return category.id;
    }
  }
  
  return "planning"; // Default
}

interface TaskCategoryPanelProps {
  category: TaskCategory;
  tasks: Task[];
  isExpanded: boolean;
  onToggle: () => void;
  onQuickAdd: (title: string) => void;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (task: Task) => void;
  onMove: (task: Task, newCategory: TaskCategory) => void;
}

export function TaskCategoryPanel({
  category,
  tasks,
  isExpanded,
  onToggle,
  onQuickAdd,
  onToggleComplete,
  onEdit,
  onDelete,
  onDuplicate,
  onMove
}: TaskCategoryPanelProps) {
  const [quickAddValue, setQuickAddValue] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const quickAddRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const categoryLabel = TASK_CATEGORIES.find(c => c.id === category)?.label || category;
  const completedCount = tasks.filter(t => t.status === "done").length;
  const totalCount = tasks.length;
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  useEffect(() => {
    if (showQuickAdd && quickAddRef.current) {
      quickAddRef.current.focus();
    }
  }, [showQuickAdd]);

  const handleQuickAdd = () => {
    if (quickAddValue.trim()) {
      onQuickAdd(quickAddValue.trim());
      setQuickAddValue("");
      setShowQuickAdd(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleQuickAdd();
    } else if (e.key === "Escape") {
      setQuickAddValue("");
      setShowQuickAdd(false);
    }
  };

  // Only show incomplete tasks in category panels
  const incompleteTasks = tasks.filter(t => t.status !== "done");

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div 
        ref={headerRef}
        className={cn(
          "sticky top-0 z-10 bg-background transition-shadow",
          isExpanded && "shadow-sm"
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
              <span className="font-medium text-sm">{categoryLabel}</span>
              <Badge variant="outline" className="text-xs">
                {completedCount}/{totalCount}
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={completionRate} className="w-16 h-1.5" />
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                isExpanded && "rotate-180"
              )} />
            </div>
          </button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="animate-accordion-down">
        <div className="pl-2 pr-1 pb-3 space-y-2">
          {incompleteTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No tasks in this category yet.
            </p>
          ) : (
            incompleteTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={onToggleComplete}
                onEdit={onEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onMove={onMove}
                currentCategory={category}
              />
            ))
          )}

          {/* Quick Add */}
          {showQuickAdd ? (
            <div className="flex items-center gap-2 pt-1">
              <Input
                ref={quickAddRef}
                placeholder="Task title... (Enter to save)"
                value={quickAddValue}
                onChange={(e) => setQuickAddValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  if (!quickAddValue.trim()) {
                    setShowQuickAdd(false);
                  }
                }}
                className="h-10 text-sm"
              />
              <Button size="sm" variant="ghost" onClick={handleQuickAdd} disabled={!quickAddValue.trim()}>
                Add
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground hover:text-foreground h-9"
              onClick={() => setShowQuickAdd(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add task
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
