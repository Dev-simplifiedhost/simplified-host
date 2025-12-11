import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface EventProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export const EventProgressBar = ({ value, className, showLabel = true }: EventProgressBarProps) => {
  const getProgressColor = (value: number) => {
    if (value >= 80) return "bg-green-500";
    if (value >= 50) return "bg-yellow-500";
    if (value >= 25) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progress</span>
          <span className="font-medium">{Math.round(value)}%</span>
        </div>
      )}
      <Progress value={value} className="h-2" />
    </div>
  );
};
