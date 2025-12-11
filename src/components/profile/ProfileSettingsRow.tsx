import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileSettingsRowProps {
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: "default" | "danger";
  showChevron?: boolean;
  rightElement?: React.ReactNode;
  className?: string;
}

export function ProfileSettingsRow({
  label,
  subtitle,
  icon,
  onClick,
  variant = "default",
  showChevron = true,
  rightElement,
  className,
}: ProfileSettingsRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-4 h-14 text-left transition-colors",
        "hover:bg-muted/50 active:bg-muted focus:outline-none focus:bg-muted/50",
        className
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon && (
          <div className={cn(
            "shrink-0",
            variant === "danger" ? "text-destructive" : "text-muted-foreground"
          )}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium truncate",
            variant === "danger" && "text-destructive"
          )}>
            {label}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      {rightElement ? (
        <div className="shrink-0 ml-2">{rightElement}</div>
      ) : showChevron ? (
        <ChevronRight className={cn(
          "h-5 w-5 shrink-0",
          variant === "danger" ? "text-destructive/50" : "text-muted-foreground/50"
        )} />
      ) : null}
    </button>
  );
}
