import { AlertCircle, Clock, TrendingUp, Package, RefreshCw, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChipData {
  label: string;
  variant: "urgent" | "warning" | "info" | "success";
}

interface EventCardChipsProps {
  chips: ChipData[];
  className?: string;
}

const variantStyles: Record<ChipData["variant"], string> = {
  urgent: "bg-destructive/10 text-destructive border-destructive/20",
  warning: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  info: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
  success: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
};

const variantIcons: Record<ChipData["variant"], React.ElementType> = {
  urgent: AlertCircle,
  warning: Clock,
  info: RefreshCw,
  success: Calendar,
};

export function EventCardChips({ chips, className }: EventCardChipsProps) {
  if (chips.length === 0) return null;
  
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {chips.map((chip, idx) => {
        const Icon = variantIcons[chip.variant];
        return (
          <span 
            key={idx}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
              variantStyles[chip.variant]
            )}
          >
            <Icon className="h-3 w-3" />
            {chip.label}
          </span>
        );
      })}
    </div>
  );
}
