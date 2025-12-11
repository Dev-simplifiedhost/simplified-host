import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, CheckCheck, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface TaskQuickActionsBarProps {
  hasTasks: boolean;
  selectedCount: number;
  isReorderMode: boolean;
  onAddTask: () => void;
  onBulkComplete: () => void;
  onBulkDelete: () => void;
  onToggleReorder: () => void;
}

export function TaskQuickActionsBar({
  hasTasks,
  selectedCount,
  isReorderMode,
  onAddTask,
  onBulkComplete,
  onBulkDelete,
  onToggleReorder
}: TaskQuickActionsBarProps) {
  const isMobile = useIsMobile();

  if (!hasTasks) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 p-2 bg-background/95 backdrop-blur-sm border rounded-lg",
      isMobile 
        ? "fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] left-4 right-4 z-30 shadow-lg" 
        : "sticky top-0 z-20"
    )}>
      <Button size="sm" onClick={onAddTask} className="h-9">
        <Plus className="h-4 w-4 mr-1" />
        Add Task
      </Button>

      <div className="flex-1" />

      {selectedCount > 0 && (
        <>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onBulkComplete}
            className="h-9"
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            Complete ({selectedCount})
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onBulkDelete}
            className="h-9 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </>
      )}

      <Button
        size="sm"
        variant={isReorderMode ? "secondary" : "outline"}
        onClick={onToggleReorder}
        className="h-9"
      >
        <GripVertical className="h-4 w-4 mr-1" />
        Reorder
      </Button>
    </div>
  );
}
