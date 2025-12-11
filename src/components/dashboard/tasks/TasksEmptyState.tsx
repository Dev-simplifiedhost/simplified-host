import { Button } from "@/components/ui/button";
import { CheckSquare, Plus } from "lucide-react";

interface TasksEmptyStateProps {
  onAddTask: () => void;
}

export function TasksEmptyState({ onAddTask }: TasksEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        <CheckSquare className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="font-semibold text-foreground mb-1">Plan with confidence</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">
        Add tasks to stay organized. Guests won't see them.
      </p>
      <Button onClick={onAddTask}>
        <Plus className="h-4 w-4 mr-2" />
        Add Your First Task
      </Button>
    </div>
  );
}
