import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface EventContextTagProps {
  label: string;
  variant: 'warning' | 'error' | 'success' | 'info' | 'muted';
  className?: string;
}

const variantStyles: Record<EventContextTagProps['variant'], string> = {
  warning: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  error: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800",
  success: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800",
  info: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800",
  muted: "bg-muted text-muted-foreground border-border",
};

export function EventContextTag({ label, variant, className }: EventContextTagProps) {
  return (
    <Badge 
      variant="outline"
      className={cn(
        "text-[10px] px-1.5 py-0.5 font-medium border",
        variantStyles[variant],
        className
      )}
    >
      {label}
    </Badge>
  );
}

export default EventContextTag;
