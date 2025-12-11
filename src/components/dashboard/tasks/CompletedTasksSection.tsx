import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Trash2, CheckCircle2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Task } from "./TaskCard";

interface CompletedTasksSectionProps {
  tasks: Task[];
  onToggleComplete: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

export function CompletedTasksSection({
  tasks,
  onToggleComplete,
  onDelete
}: CompletedTasksSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (tasks.length === 0) return null;

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between h-11 px-3 text-muted-foreground hover:text-foreground"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium">Completed Tasks</span>
            <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform duration-200",
            isExpanded && "rotate-180"
          )} />
        </Button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="animate-accordion-down">
        <div className="space-y-2 pt-2">
          {tasks.map(task => (
            <div 
              key={task.id}
              className="group flex items-center gap-3 p-3 rounded-lg bg-muted/30 opacity-60 hover:opacity-80 transition-opacity"
            >
              <Checkbox
                checked={true}
                onCheckedChange={() => onToggleComplete(task)}
                className="h-5 w-5"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm line-through text-muted-foreground">
                  {task.title}
                </span>
                {task.completed_at && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Completed {format(new Date(task.completed_at), "MMM d")}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(task.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
