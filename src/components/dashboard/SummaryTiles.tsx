import { Calendar, TrendingUp, AlertTriangle, AlertCircle, Bell, Clock, X, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryTilesProps {
  counts: {
    active: number;
    thisWeek: number;
    atRisk: number;
    attention: number;
    newActivity?: number;
    recentlyUpdated?: number;
    draft?: number;
  };
  activeFilter?: "upcoming" | "attention" | "thisWeek" | "atRisk" | "newActivity" | "recentlyUpdated" | "draft" | null;
  onTileClick?: (filter: "upcoming" | "attention" | "thisWeek" | "atRisk" | "newActivity" | "recentlyUpdated" | "draft") => void;
}

export function SummaryTiles({ counts, activeFilter, onTileClick }: SummaryTilesProps) {
  const tiles = [
    {
      id: "upcoming" as const,
      label: "Active",
      value: counts.active,
      icon: Calendar,
      colorClass: "text-blue-600",
      bgClass: "bg-blue-50 dark:bg-blue-950/30",
      borderClass: "border-blue-200 dark:border-blue-800",
      ringClass: "ring-blue-400/50",
    },
    {
      id: "thisWeek" as const,
      label: "This Week",
      value: counts.thisWeek,
      icon: TrendingUp,
      colorClass: "text-green-600",
      bgClass: "bg-green-50 dark:bg-green-950/30",
      borderClass: "border-green-200 dark:border-green-800",
      ringClass: "ring-green-400/50",
    },
    {
      id: "atRisk" as const,
      label: "At Risk",
      value: counts.atRisk,
      icon: AlertTriangle,
      colorClass: "text-orange-600",
      bgClass: "bg-orange-50 dark:bg-orange-950/30",
      borderClass: "border-orange-200 dark:border-orange-800",
      ringClass: "ring-orange-400/50",
    },
    {
      id: "attention" as const,
      label: "Attention",
      value: counts.attention,
      icon: AlertCircle,
      colorClass: "text-red-600",
      bgClass: "bg-red-50 dark:bg-red-950/30",
      borderClass: "border-red-200 dark:border-red-800",
      ringClass: "ring-red-400/50",
    },
    {
      id: "newActivity" as const,
      label: "New Activity",
      value: counts.newActivity ?? 0,
      icon: Bell,
      colorClass: "text-purple-600",
      bgClass: "bg-purple-50 dark:bg-purple-950/30",
      borderClass: "border-purple-200 dark:border-purple-800",
      ringClass: "ring-purple-400/50",
      hidden: counts.newActivity === undefined,
    },
    {
      id: "recentlyUpdated" as const,
      label: "Updated",
      value: counts.recentlyUpdated ?? 0,
      icon: Clock,
      colorClass: "text-cyan-600",
      bgClass: "bg-cyan-50 dark:bg-cyan-950/30",
      borderClass: "border-cyan-200 dark:border-cyan-800",
      ringClass: "ring-cyan-400/50",
      hidden: counts.recentlyUpdated === undefined,
    },
    {
      id: "draft" as const,
      label: "Drafts",
      value: counts.draft ?? 0,
      icon: FileEdit,
      colorClass: "text-amber-600",
      bgClass: "bg-amber-50 dark:bg-amber-950/30",
      borderClass: "border-amber-200 dark:border-amber-800",
      ringClass: "ring-amber-400/50",
      hidden: (counts.draft ?? 0) === 0,
    },
  ].filter(tile => !tile.hidden);

  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        const isActive = activeFilter === tile.id;
        
        return (
          <button
            key={tile.id}
            onClick={() => onTileClick?.(tile.id)}
            className={cn(
              "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all min-h-[72px]",
              "hover:shadow-md active:scale-[0.98]",
              isActive
                ? `${tile.bgClass} ${tile.borderClass} ring-2 ring-offset-1 ${tile.ringClass}`
                : "bg-card border-border hover:border-muted-foreground/30"
            )}
          >
            {isActive && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-muted-foreground/80 rounded-full flex items-center justify-center shadow-sm">
                <X className="h-3 w-3 text-background" />
              </span>
            )}
            <Icon className={cn("h-4 w-4 mb-1", tile.colorClass)} />
            <span className="text-xl font-bold leading-none">{tile.value}</span>
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5 leading-tight">{tile.label}</span>
          </button>
        );
      })}
    </div>
  );
}
