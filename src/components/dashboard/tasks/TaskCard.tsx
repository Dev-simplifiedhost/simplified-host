import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Copy, FolderInput, AlertCircle, Calendar, Sparkles } from "lucide-react";
import { format, isPast, isWithinInterval, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { TaskCategory, TASK_CATEGORIES } from "./TaskCategoryPanel";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  completed_at: string | null;
  is_pwac_origin?: boolean;
  category?: TaskCategory;
}

interface TaskCardProps {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onDuplicate: (task: Task) => void;
  onMove: (task: Task, newCategory: TaskCategory) => void;
  currentCategory: TaskCategory;
}

export function TaskCard({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  onDuplicate,
  onMove,
  currentCategory
}: TaskCardProps) {
  const isCompleted = task.status === "done";
  const isOverdue = task.due_date && isPast(new Date(task.due_date)) && !isCompleted;
  const isDueSoon = task.due_date && !isOverdue && isWithinInterval(new Date(task.due_date), {
    start: new Date(),
    end: addDays(new Date(), 2)
  });

  const priorityStyles = {
    high: "bg-destructive/10 text-destructive border-destructive/30",
    medium: "bg-primary/10 text-primary border-primary/30",
    low: "bg-muted text-muted-foreground border-muted-foreground/30"
  };

  return (
    <div 
      className={cn(
        "group flex items-start gap-3 p-3 rounded-lg border bg-card transition-all",
        isCompleted && "opacity-50",
        isOverdue && "border-destructive/50 bg-destructive/5",
        task.priority === "high" && !isCompleted && !isOverdue && "border-l-2 border-l-destructive"
      )}
    >
      <Checkbox
        checked={isCompleted}
        onCheckedChange={() => onToggleComplete(task)}
        className="mt-0.5 h-5 w-5"
        aria-label={`Mark "${task.title}" as ${isCompleted ? 'incomplete' : 'complete'}`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn(
            "text-sm font-medium",
            isCompleted && "line-through text-muted-foreground"
          )}>
            {task.title}
          </span>
          
          <Badge 
            variant="outline" 
            className={cn("text-[10px] h-5 capitalize", priorityStyles[task.priority as keyof typeof priorityStyles])}
          >
            {task.priority}
          </Badge>

          {task.is_pwac_origin && (
            <Badge variant="outline" className="text-[10px] h-5 bg-primary/5 border-primary/30 text-primary">
              <Sparkles className="h-2.5 w-2.5 mr-0.5" />
              AI
            </Badge>
          )}

          {isOverdue && (
            <span className="flex items-center gap-1 text-[10px] text-destructive">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
              Overdue
            </span>
          )}
        </div>

        {task.due_date && !isCompleted && (
          <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {format(new Date(task.due_date), "MMM d")}
            {isDueSoon && !isOverdue && (
              <Badge variant="secondary" className="text-[9px] h-4 ml-1">Due Soon</Badge>
            )}
          </div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onEdit(task)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate(task)}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderInput className="h-4 w-4 mr-2" />
              Move to
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {TASK_CATEGORIES.filter(c => c.id !== currentCategory).map(cat => (
                <DropdownMenuItem key={cat.id} onClick={() => onMove(task, cat.id)}>
                  {cat.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => onDelete(task.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
