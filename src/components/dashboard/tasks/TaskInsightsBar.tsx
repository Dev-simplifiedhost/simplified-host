import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, Lightbulb, TrendingUp } from "lucide-react";
import { differenceInDays, isPast } from "date-fns";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
}

interface TaskInsightsBarProps {
  tasks: Task[];
  eventDate: string | null;
}

export function TaskInsightsBar({ tasks, eventDate }: TaskInsightsBarProps) {
  const overdueCount = tasks.filter(
    t => t.status !== "done" && t.due_date && isPast(new Date(t.due_date))
  ).length;

  const daysUntilEvent = eventDate ? differenceInDays(new Date(eventDate), new Date()) : null;

  // Determine insight message (rule-based for free tier)
  let insight: { icon: React.ReactNode; message: string; variant: "warning" | "info" | "success" } | null = null;

  if (overdueCount > 0) {
    insight = {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      message: `${overdueCount} task${overdueCount > 1 ? 's' : ''} overdue`,
      variant: "warning"
    };
  } else if (daysUntilEvent !== null && daysUntilEvent <= 7 && daysUntilEvent >= 0) {
    const incompleteTasks = tasks.filter(t => t.status !== "done").length;
    if (incompleteTasks > 0) {
      insight = {
        icon: <Clock className="h-3.5 w-3.5" />,
        message: `Your event is ${daysUntilEvent} day${daysUntilEvent !== 1 ? 's' : ''} away—focus on logistics.`,
        variant: "info"
      };
    }
  } else if (tasks.length > 0) {
    const completionRate = tasks.filter(t => t.status === "done").length / tasks.length;
    if (completionRate >= 0.8) {
      insight = {
        icon: <TrendingUp className="h-3.5 w-3.5" />,
        message: "You're almost there! Just a few tasks left.",
        variant: "success"
      };
    } else if (completionRate >= 0.5) {
      insight = {
        icon: <Lightbulb className="h-3.5 w-3.5" />,
        message: "Good progress! Keep the momentum going.",
        variant: "info"
      };
    }
  }

  if (!insight) return null;

  const variantClasses = {
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    success: "bg-green-50 text-green-700 border-green-200"
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-md border text-xs ${variantClasses[insight.variant]}`}>
      {insight.icon}
      <span>{insight.message}</span>
    </div>
  );
}
