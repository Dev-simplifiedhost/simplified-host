import { Filter, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FilterType = "upcoming" | "past" | "draft" | "all";

interface FilterDropdownProps {
  value: FilterType;
  onChange: (value: FilterType) => void;
  counts?: {
    upcoming?: number;
    past?: number;
    draft?: number;
    all?: number;
  };
  className?: string;
}

const filterLabels: Record<FilterType, string> = {
  upcoming: "Upcoming",
  past: "Past Events",
  draft: "Draft",
  all: "All Events",
};

export function FilterDropdown({ value, onChange, counts, className }: FilterDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn("h-12 md:h-10 gap-1.5", className)}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">{filterLabels[value]}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as FilterType)}>
          <DropdownMenuRadioItem value="upcoming" className="justify-between">
            <span>Upcoming</span>
            {counts?.upcoming !== undefined && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {counts.upcoming}
              </Badge>
            )}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="past" className="justify-between">
            <span>Past Events</span>
            {counts?.past !== undefined && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {counts.past}
              </Badge>
            )}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="draft" className="justify-between">
            <span>Draft</span>
            {counts?.draft !== undefined && counts.draft > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {counts.draft}
              </Badge>
            )}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="all" className="justify-between">
            <span>All Events</span>
            {counts?.all !== undefined && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {counts.all}
              </Badge>
            )}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
