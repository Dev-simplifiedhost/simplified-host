import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilterDropdown, FilterType } from "./FilterDropdown";
import { Search, ArrowUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { type TileFilterType } from "./SummaryTilesV2";

const tileFilterLabels: Record<TileFilterType, string> = {
  upcoming: "Active",
  thisWeek: "This Week",
  atRisk: "At Risk",
  attention: "Attention",
  newActivity: "New Activity",
  updated: "Updated",
  draft: "Drafts",
};

interface StickyFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filterStatus: FilterType;
  onFilterChange: (status: FilterType) => void;
  sortBy: "date" | "name" | "created" | "updated";
  onSortChange: (sort: "date" | "name" | "created" | "updated") => void;
  counts: { 
    all: number; 
    upcoming: number; 
    past: number; 
    draft?: number;
  };
  activeTileFilter?: TileFilterType | null;
  onClearTileFilter?: () => void;
}

export function StickyFilterBar({
  searchTerm,
  onSearchChange,
  filterStatus,
  onFilterChange,
  sortBy,
  onSortChange,
  counts,
  activeTileFilter,
  onClearTileFilter,
}: StickyFilterBarProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-3 -mx-4 px-4 pt-2 border-b border-border/50">
      {/* Search Row */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events by name, description, or location..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-12 md:h-10"
          />
        </div>
      </div>

      {/* Filter + Sort Row */}
      <div className="flex items-center gap-2">
        <FilterDropdown
          value={filterStatus}
          onChange={onFilterChange}
          counts={{
            upcoming: counts.upcoming,
            past: counts.past,
            draft: counts.draft,
            all: counts.all,
          }}
        />
        
        <Select value={sortBy} onValueChange={(v) => onSortChange(v as "date" | "name" | "created" | "updated")}>
          <SelectTrigger className="w-[130px] h-12 md:h-10">
            <ArrowUpDown className="h-4 w-4 mr-1.5" />
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="created">Created</SelectItem>
            <SelectItem value="updated">Updated</SelectItem>
          </SelectContent>
        </Select>

        {/* Active Filter Label (when no tile is active) */}
        {!activeTileFilter && filterStatus === "upcoming" && (
          <span className="hidden sm:inline-flex items-center text-xs text-muted-foreground ml-auto">
            Showing upcoming events
          </span>
        )}
      </div>

      {/* Active Tile Filter Indicator */}
      {activeTileFilter && (
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-muted-foreground">Filtering by:</span>
          <button
            onClick={onClearTileFilter}
            className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm font-medium rounded-full hover:bg-primary/20 transition-colors"
          >
            {tileFilterLabels[activeTileFilter]}
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
