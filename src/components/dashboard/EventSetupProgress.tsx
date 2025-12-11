import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { Check, Circle } from "lucide-react";

interface EventSetupProgressProps {
  hasBasicInfo: boolean; // name + date
  hasLocation: boolean;
  hasGuests: boolean; // rsvpCount > 0
  hasItems: boolean; // itemsTotal > 0
  hasTasks: boolean; // tasksTotal > 0
}

interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
}

export function EventSetupProgress({
  hasBasicInfo,
  hasLocation,
  hasGuests,
  hasItems,
  hasTasks,
}: EventSetupProgressProps) {
  const checklist: ChecklistItem[] = useMemo(() => [
    { id: "basic_info", label: "Basic info (name & date)", completed: hasBasicInfo },
    { id: "location", label: "Location added", completed: hasLocation },
    { id: "guests", label: "Guests invited", completed: hasGuests },
    { id: "items", label: "Items added", completed: hasItems },
    { id: "tasks", label: "Tasks created", completed: hasTasks },
  ], [hasBasicInfo, hasLocation, hasGuests, hasItems, hasTasks]);

  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  // Don't show if everything is complete
  if (percentage === 100) return null;

  const incompleteItems = checklist.filter((item) => !item.completed);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Event Setup Progress</h3>
        <span className="text-sm text-muted-foreground">
          {completedCount} of {totalCount} complete
        </span>
      </div>
      
      <div className="space-y-1">
        <Progress value={percentage} className="h-2" />
        <p className="text-xs text-muted-foreground text-right">{percentage}%</p>
      </div>

      {incompleteItems.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Missing:</p>
          <div className="flex flex-wrap gap-2">
            {incompleteItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded"
              >
                <Circle className="h-2.5 w-2.5" />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
