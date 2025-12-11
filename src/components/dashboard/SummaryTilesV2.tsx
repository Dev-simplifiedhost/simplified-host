import { useState } from "react";
import { 
  Calendar, 
  CalendarDays, 
  AlertTriangle, 
  AlertCircle, 
  Users, 
  Edit, 
  FileEdit, 
  X,
  PartyPopper
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useLongPress } from "@/hooks/useLongPress";
import { useIsMobile } from "@/hooks/use-mobile";

export type TileFilterType = 
  | "upcoming" 
  | "attention" 
  | "thisWeek" 
  | "atRisk" 
  | "newActivity" 
  | "updated" 
  | "draft";

interface TileConfig {
  id: TileFilterType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  ringClass: string;
  hideWhenZero?: boolean;
  dimWhenZero?: boolean;
}

interface TileGroup {
  id: string;
  label: string;
  tiles: TileConfig[];
}

const TILE_GROUPS: TileGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    tiles: [
      { 
        id: 'upcoming', 
        label: 'Active', 
        icon: Calendar, 
        tooltip: 'Published upcoming events.',
        colorClass: 'text-blue-600 dark:text-blue-400',
        bgClass: 'bg-blue-50 dark:bg-blue-950/30',
        borderClass: 'border-blue-200 dark:border-blue-800',
        ringClass: 'ring-blue-400/50',
      },
      { 
        id: 'thisWeek', 
        label: 'This Week', 
        icon: CalendarDays, 
        tooltip: 'Events happening in the next 7 days.',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
        borderClass: 'border-emerald-200 dark:border-emerald-800',
        ringClass: 'ring-emerald-400/50',
      },
    ]
  },
  {
    id: 'engagement',
    label: 'Engagement',
    tiles: [
      { 
        id: 'newActivity', 
        label: 'New Activity', 
        icon: Users, 
        tooltip: 'Guest activity since your last check-in.',
        colorClass: 'text-green-600 dark:text-green-400',
        bgClass: 'bg-green-50 dark:bg-green-950/30',
        borderClass: 'border-green-200 dark:border-green-800',
        ringClass: 'ring-green-400/50',
        dimWhenZero: true,
      },
      { 
        id: 'updated', 
        label: 'Updated', 
        icon: Edit, 
        tooltip: 'Your event edits in the last 48 hours.',
        colorClass: 'text-cyan-600 dark:text-cyan-400',
        bgClass: 'bg-cyan-50 dark:bg-cyan-950/30',
        borderClass: 'border-cyan-200 dark:border-cyan-800',
        ringClass: 'ring-cyan-400/50',
        dimWhenZero: true,
      },
    ]
  },
  {
    id: 'attention',
    label: 'Needs Attention',
    tiles: [
      { 
        id: 'atRisk', 
        label: 'Off Track',
        icon: AlertTriangle, 
        tooltip: 'Events with low progress or engagement.',
        colorClass: 'text-amber-600 dark:text-amber-400',
        bgClass: 'bg-amber-50 dark:bg-amber-950/30',
        borderClass: 'border-amber-200 dark:border-amber-800',
        ringClass: 'ring-amber-400/50',
      },
      { 
        id: 'attention', 
        label: 'Finish Setup', 
        icon: AlertCircle, 
        tooltip: 'Events missing essential setup steps.',
        colorClass: 'text-red-600 dark:text-red-400',
        bgClass: 'bg-red-50 dark:bg-red-950/30',
        borderClass: 'border-red-200 dark:border-red-800',
        ringClass: 'ring-red-400/50',
      },
    ]
  },
  {
    id: 'drafts',
    label: 'Drafts',
    tiles: [
      { 
        id: 'draft', 
        label: 'Drafts', 
        icon: FileEdit, 
        tooltip: 'Unpublished in-progress events.',
        colorClass: 'text-slate-600 dark:text-slate-400',
        bgClass: 'bg-slate-50 dark:bg-slate-950/30',
        borderClass: 'border-slate-200 dark:border-slate-700',
        ringClass: 'ring-slate-400/50',
        hideWhenZero: true,
      },
    ]
  }
];

interface SummaryTilesV2Props {
  counts: {
    active: number;
    thisWeek: number;
    atRisk: number;
    attention: number;
    newActivity: number;
    updated: number;
    draft: number;
  };
  activeFilter?: TileFilterType | null;
  onTileClick?: (filter: TileFilterType) => void;
}

function TileButton({ 
  tile, 
  count, 
  isActive, 
  onClick 
}: { 
  tile: TileConfig; 
  count: number; 
  isActive: boolean;
  onClick: () => void;
}) {
  const isMobile = useIsMobile();
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);
  
  const longPressHandlers = useLongPress(
    () => setShowMobileTooltip(true),
    { duration: 500 }
  );

  const Icon = tile.icon;
  const isDimmed = tile.dimWhenZero && count === 0;
  
  const button = (
    <button
      onClick={() => {
        setShowMobileTooltip(false);
        onClick();
      }}
      {...(isMobile ? longPressHandlers : {})}
      className={cn(
        "relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-200 min-h-[72px]",
        "hover:shadow-md active:scale-[0.98]",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50",
        isActive
          ? `${tile.bgClass} ${tile.borderClass} ring-2 ring-offset-1 ${tile.ringClass}`
          : isDimmed
            ? "bg-muted/30 border-border/50 opacity-50"
            : "bg-card border-border hover:border-muted-foreground/30"
      )}
    >
      {isActive && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-muted-foreground/80 rounded-full flex items-center justify-center shadow-sm animate-scale-in">
          <X className="h-3 w-3 text-background" />
        </span>
      )}
      <Icon className={cn("h-4 w-4 mb-1", isActive || !isDimmed ? tile.colorClass : "text-muted-foreground")} />
      <span className={cn(
        "text-xl font-bold leading-none",
        isDimmed && "text-muted-foreground"
      )}>
        {count}
      </span>
      <span className="text-[10px] text-muted-foreground font-medium mt-0.5 leading-tight">
        {tile.label}
      </span>
      
      {/* Mobile tooltip popup */}
      {isMobile && showMobileTooltip && (
        <div 
          className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg border border-border z-50 whitespace-nowrap animate-fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setShowMobileTooltip(false);
          }}
        >
          {tile.tooltip}
        </div>
      )}
    </button>
  );

  // Desktop: use Radix Tooltip
  if (!isMobile) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {button}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tile.tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

export function SummaryTilesV2({ counts, activeFilter, onTileClick }: SummaryTilesV2Props) {
  const getCount = (tileId: TileFilterType): number => {
    switch (tileId) {
      case 'upcoming': return counts.active;
      case 'thisWeek': return counts.thisWeek;
      case 'atRisk': return counts.atRisk;
      case 'attention': return counts.attention;
      case 'newActivity': return counts.newActivity;
      case 'updated': return counts.updated;
      case 'draft': return counts.draft;
      default: return 0;
    }
  };

  // Filter out tiles that should be hidden
  const visibleGroups = TILE_GROUPS.map(group => ({
    ...group,
    tiles: group.tiles.filter(tile => {
      if (tile.hideWhenZero && getCount(tile.id) === 0) return false;
      return true;
    })
  })).filter(group => group.tiles.length > 0);

  // Check if all caught up
  const isAllCaughtUp = counts.atRisk === 0 && counts.attention === 0 && counts.active > 0;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-4">
        {/* Tile Grid */}
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3">
          {visibleGroups.map((group) => (
            group.tiles.map((tile) => (
              <TileButton
                key={tile.id}
                tile={tile}
                count={getCount(tile.id)}
                isActive={activeFilter === tile.id}
                onClick={() => onTileClick?.(tile.id)}
              />
            ))
          ))}
        </div>

        {/* All Caught Up Message */}
        {isAllCaughtUp && !activeFilter && (
          <div className="text-center py-3 px-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 animate-fade-in">
            <p className="text-sm text-green-700 dark:text-green-300 flex items-center justify-center gap-2">
              <PartyPopper className="h-4 w-4" />
              You're all caught up! All events are on track.
            </p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default SummaryTilesV2;
