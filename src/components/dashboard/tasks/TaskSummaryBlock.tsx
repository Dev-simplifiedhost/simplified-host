import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lock, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskSummaryBlockProps {
  completedCount: number;
  totalCount: number;
}

export function TaskSummaryBlock({ completedCount, totalCount }: TaskSummaryBlockProps) {
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-muted/30 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-foreground">Tasks</h3>
        </div>
        <Badge variant="secondary" className="text-xs gap-1 bg-muted text-muted-foreground">
          <Lock className="h-3 w-3" />
          Hidden from Guests
        </Badge>
      </div>
      
      <div className="space-y-2">
        <Progress 
          value={completionRate} 
          className={cn(
            "h-2 transition-all duration-500",
            completionRate === 100 && "bg-green-100 [&>div]:bg-green-500"
          )} 
        />
        <p className="text-xs text-muted-foreground">
          {completedCount} of {totalCount} tasks complete • {Math.round(completionRate)}%
        </p>
      </div>
    </div>
  );
}
