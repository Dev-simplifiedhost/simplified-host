import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GuestFilterOptions {
  hasDietary: boolean;
  hasClaimedItems: boolean;
  hasContributed: boolean;
  missingRsvp: boolean;
  missingDietaryInfo: boolean;
}

interface GuestFiltersProps {
  filters: GuestFilterOptions;
  onFiltersChange: (filters: GuestFilterOptions) => void;
  hasAnyFilters: boolean;
  counts: {
    dietary: number;
    claimed: number;
    contributed: number;
    noRsvp: number;
  };
}

export const GuestFilters = ({ 
  filters, 
  onFiltersChange, 
  hasAnyFilters,
  counts 
}: GuestFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleFilter = (key: keyof GuestFilterOptions) => {
    onFiltersChange({
      ...filters,
      [key]: !filters[key]
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      hasDietary: false,
      hasClaimedItems: false,
      hasContributed: false,
      missingRsvp: false,
      missingDietaryInfo: false,
    });
  };

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "h-9 gap-2",
            activeCount > 0 && "border-primary text-primary"
          )}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {activeCount}
            </span>
          )}
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            isOpen && "rotate-180"
          )} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-3">
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Filter by</span>
            {activeCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs"
                onClick={clearFilters}
              >
                Clear all
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="filter-dietary"
                checked={filters.hasDietary}
                onCheckedChange={() => toggleFilter('hasDietary')}
              />
              <Label htmlFor="filter-dietary" className="text-sm cursor-pointer">
                Has dietary restrictions ({counts.dietary})
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="filter-claimed"
                checked={filters.hasClaimedItems}
                onCheckedChange={() => toggleFilter('hasClaimedItems')}
              />
              <Label htmlFor="filter-claimed" className="text-sm cursor-pointer">
                Has claimed items ({counts.claimed})
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="filter-contributed"
                checked={filters.hasContributed}
                onCheckedChange={() => toggleFilter('hasContributed')}
              />
              <Label htmlFor="filter-contributed" className="text-sm cursor-pointer">
                Has contributed ({counts.contributed})
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="filter-no-rsvp"
                checked={filters.missingRsvp}
                onCheckedChange={() => toggleFilter('missingRsvp')}
              />
              <Label htmlFor="filter-no-rsvp" className="text-sm cursor-pointer">
                Missing RSVP ({counts.noRsvp})
              </Label>
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const defaultFilters: GuestFilterOptions = {
  hasDietary: false,
  hasClaimedItems: false,
  hasContributed: false,
  missingRsvp: false,
  missingDietaryInfo: false,
};
