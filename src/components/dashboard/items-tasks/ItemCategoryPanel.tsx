import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  ChevronDown, 
  UtensilsCrossed, 
  Package, 
  Sparkles, 
  PartyPopper, 
  Wrench, 
  Settings2, 
  MoreHorizontal,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ItemTile, ItemData } from "./ItemTile";

export interface CategoryConfig {
  id: string;
  label: string;
  icon: typeof Package;
  subcategories?: string[];
}

export const ITEM_CATEGORIES: CategoryConfig[] = [
  { 
    id: 'food_drinks', 
    label: 'Food & Drinks', 
    icon: UtensilsCrossed,
    subcategories: ['Appetizers', 'Main Dishes', 'Sides', 'Desserts', 'Drinks']
  },
  { id: 'tableware', label: 'Tableware & Serving', icon: Package },
  { id: 'decor', label: 'Decor', icon: Sparkles },
  { id: 'equipment', label: 'Equipment', icon: Settings2 },
  { id: 'activities', label: 'Activities & Entertainment', icon: PartyPopper },
  { id: 'setup_cleanup', label: 'Setup & Cleanup', icon: Wrench },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
];

interface ItemCategoryPanelProps {
  category: CategoryConfig;
  items: ItemData[];
  isExpanded: boolean;
  onToggle: () => void;
  onItemClick: (item: ItemData) => void;
  onAddItem: (category: string) => void;
  selectable?: boolean;
  selectedItems?: Set<string>;
  onItemSelect?: (id: string, checked: boolean) => void;
}

const getSubcategoryForItem = (itemName: string): string => {
  const name = itemName.toLowerCase();
  
  // Appetizers
  if (name.includes('dip') || name.includes('chip') || name.includes('appetizer') || 
      name.includes('wing') || name.includes('bite') || name.includes('starter') ||
      name.includes('bruschetta') || name.includes('spring roll')) {
    return 'Appetizers';
  }
  
  // Main dishes
  if (name.includes('main') || name.includes('entree') || name.includes('roast') ||
      name.includes('chicken') || name.includes('beef') || name.includes('pork') ||
      name.includes('fish') || name.includes('lasagna') || name.includes('casserole')) {
    return 'Main Dishes';
  }
  
  // Sides
  if (name.includes('side') || name.includes('salad') || name.includes('bread') ||
      name.includes('vegetable') || name.includes('rice') || name.includes('potato')) {
    return 'Sides';
  }
  
  // Desserts
  if (name.includes('cake') || name.includes('cookie') || name.includes('dessert') ||
      name.includes('pie') || name.includes('brownie') || name.includes('ice cream') ||
      name.includes('cupcake') || name.includes('sweet')) {
    return 'Desserts';
  }
  
  // Drinks
  if (name.includes('drink') || name.includes('soda') || name.includes('juice') ||
      name.includes('water') || name.includes('wine') || name.includes('beer') ||
      name.includes('coffee') || name.includes('tea') || name.includes('beverage')) {
    return 'Drinks';
  }
  
  return 'Other';
};

export const ItemCategoryPanel = ({
  category,
  items,
  isExpanded,
  onToggle,
  onItemClick,
  onAddItem,
  selectable,
  selectedItems,
  onItemSelect,
}: ItemCategoryPanelProps) => {
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set(['Appetizers']));
  
  const CategoryIcon = category.icon;
  const fulfilledCount = items.filter(i => i.fulfillment_status === 'fulfilled').length;
  const progressPercent = items.length > 0 ? (fulfilledCount / items.length) * 100 : 0;

  const toggleSubcategory = (sub: string) => {
    setExpandedSubcategories(prev => {
      const next = new Set(prev);
      if (next.has(sub)) {
        next.delete(sub);
      } else {
        next.add(sub);
      }
      return next;
    });
  };

  // Group items by subcategory if this is Food & Drinks
  const groupedItems = category.subcategories 
    ? category.subcategories.reduce((acc, sub) => {
        acc[sub] = items.filter(item => {
          const suggestedSub = getSubcategoryForItem(item.name);
          return suggestedSub === sub;
        });
        return acc;
      }, {} as Record<string, ItemData[]>)
    : null;

  // For non-food categories, ungrouped items
  const uncategorizedItems = groupedItems 
    ? items.filter(item => !category.subcategories?.some(sub => getSubcategoryForItem(item.name) === sub))
    : items;

  if (items.length === 0) return null;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-between h-14 px-4 rounded-lg border transition-all",
            isExpanded 
              ? "bg-accent/50 border-secondary" 
              : "bg-card hover:bg-accent/30 border-border"
          )}
          aria-expanded={isExpanded}
        >
          <div className="flex items-center gap-3">
            <CategoryIcon className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{category.label}</span>
            <Badge variant="secondary" className="text-xs">
              {fulfilledCount}/{items.length}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20 hidden sm:block">
              <Progress value={progressPercent} className="h-1.5" />
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 transition-transform duration-200",
              isExpanded && "rotate-180"
            )} />
          </div>
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="animate-accordion-down">
        <div className="pt-3 pl-4 pr-2 space-y-3">
          {/* Subcategories for Food & Drinks */}
          {groupedItems && category.subcategories?.map(sub => {
            const subItems = groupedItems[sub] || [];
            if (subItems.length === 0) return null;
            
            const isSubExpanded = expandedSubcategories.has(sub);
            
            return (
              <Collapsible 
                key={sub} 
                open={isSubExpanded} 
                onOpenChange={() => toggleSubcategory(sub)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between h-10 px-3 bg-muted/50 hover:bg-muted rounded-md"
                    aria-expanded={isSubExpanded}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{sub}</span>
                      <Badge variant="outline" className="text-xs h-5">
                        {subItems.length}
                      </Badge>
                    </div>
                    <ChevronDown className={cn(
                      "h-3 w-3 transition-transform duration-150",
                      isSubExpanded && "rotate-180"
                    )} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="animate-accordion-down">
                  <div className="pt-2 pl-2 space-y-2">
                    {subItems.map(item => (
                      <ItemTile 
                        key={item.id} 
                        item={item} 
                        onClick={() => onItemClick(item)}
                        selectable={selectable}
                        selected={selectedItems?.has(item.id)}
                        onSelect={onItemSelect}
                      />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {/* Uncategorized items or non-food items */}
          {!groupedItems && items.map(item => (
            <ItemTile 
              key={item.id} 
              item={item} 
              onClick={() => onItemClick(item)}
              selectable={selectable}
              selected={selectedItems?.has(item.id)}
              onSelect={onItemSelect}
            />
          ))}

          {/* Other items in food that didn't match subcategories */}
          {groupedItems && uncategorizedItems.length > 0 && (
            <div className="space-y-2">
              {uncategorizedItems.map(item => (
                <ItemTile 
                  key={item.id} 
                  item={item} 
                  onClick={() => onItemClick(item)}
                  selectable={selectable}
                  selected={selectedItems?.has(item.id)}
                  onSelect={onItemSelect}
                />
              ))}
            </div>
          )}

          {/* Add item button */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center h-10 border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-secondary"
            onClick={() => onAddItem(category.id)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add to {category.label}
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
