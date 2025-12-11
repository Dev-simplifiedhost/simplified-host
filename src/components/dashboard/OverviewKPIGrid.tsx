import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, CheckCircle2, Package, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface OverviewKPIGridProps {
  metrics: {
    rsvpCount: number;
    rsvpConfirmed: number;
    tasksCompleted: number;
    tasksTotal: number;
    itemsClaimed: number;
    itemsTotal: number;
    contributionsTotal: number;
    contributionGoal: number;
  };
  loading: boolean;
  onTileClick?: (tab: string) => void;
}

export function OverviewKPIGrid({ metrics, loading, onTileClick }: OverviewKPIGridProps) {
  const tiles = [
    {
      id: "guests",
      label: "RSVPs",
      value: metrics.rsvpCount,
      subtext: metrics.rsvpCount > 0
        ? `${Math.round((metrics.rsvpConfirmed / metrics.rsvpCount) * 100)}% confirmed`
        : "No RSVPs yet",
      icon: Users,
      colorClass: "text-blue-600 dark:text-blue-400",
    },
    {
      id: "tasks",
      label: "Tasks Done",
      value: `${metrics.tasksCompleted}/${metrics.tasksTotal}`,
      subtext: metrics.tasksTotal > 0
        ? `${Math.round((metrics.tasksCompleted / metrics.tasksTotal) * 100)}% complete`
        : "No tasks yet",
      icon: CheckCircle2,
      colorClass: "text-green-600 dark:text-green-400",
    },
    {
      id: "items",
      label: "Items Covered",
      value: `${metrics.itemsClaimed}/${metrics.itemsTotal}`,
      subtext: metrics.itemsTotal > 0
        ? `${Math.round((metrics.itemsClaimed / metrics.itemsTotal) * 100)}% fulfilled`
        : "No items yet",
      icon: Package,
      colorClass: "text-orange-600 dark:text-orange-400",
    },
    {
      id: "contributions",
      label: "Contributions",
      value: `$${metrics.contributionsTotal.toFixed(0)}`,
      subtext: metrics.contributionGoal > 0
        ? `of $${metrics.contributionGoal} goal`
        : "No goal set",
      icon: DollarSign,
      colorClass: "text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        
        return (
          <Card
            key={tile.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md active:scale-[0.98]",
              "border border-border"
            )}
            onClick={() => onTileClick?.(tile.id === "contributions" ? "payments" : tile.id === "items" ? "items-tasks" : tile.id === "tasks" ? "items-tasks" : tile.id)}
          >
            <CardContent className="p-4">
              {loading ? (
                <>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-7 w-20 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {tile.label}
                    </span>
                    <Icon className={cn("h-4 w-4", tile.colorClass)} />
                  </div>
                  <div className="text-2xl font-bold mb-0.5">{tile.value}</div>
                  <p className="text-xs text-muted-foreground truncate">
                    {tile.subtext}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
