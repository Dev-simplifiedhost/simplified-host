import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, AlertTriangle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EventHealthBadgeProps {
  score: number;
  className?: string;
}

export const EventHealthBadge = ({ score, className }: EventHealthBadgeProps) => {
  const getHealthConfig = (score: number) => {
    if (score >= 80) {
      return {
        label: "Excellent",
        icon: CheckCircle2,
        className: "bg-accent/10 text-accent border-accent/20",
      };
    } else if (score >= 50) {
      return {
        label: "Good",
        icon: AlertCircle,
        className: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
      };
    } else if (score >= 25) {
      return {
        label: "Needs Attention",
        icon: AlertTriangle,
        className: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
      };
    } else {
      return {
        label: "Action Required",
        icon: XCircle,
        className: "bg-destructive/10 text-destructive dark:text-red-400 border-destructive/20",
      };
    }
  };

  const config = getHealthConfig(score);
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};
