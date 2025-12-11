import { useMemo } from "react";
import { differenceInDays, parseISO, isAfter } from "date-fns";

interface Item {
  id: string;
  name: string;
  category: string;
  goal_type: string;
  goal_quantity: number | null;
  current_quantity: number;
  fulfillment_status: string;
  is_host_provided?: boolean;
  is_suggested?: boolean;
}

interface ItemsNeededInsightProps {
  items: Item[];
  sectionPreset?: 'bring_something' | 'registry_items' | 'wishlist';
  eventDate?: string | null;
  goingCount?: number;
  isArchived?: boolean;
  showNeedsMostHint?: boolean;
  guestSuggestionsEnabled?: boolean;
  suggestedItemsCount?: number;
}

// Map categories to clean singular display labels
const getCategoryDisplayLabel = (cat: string): string | null => {
  const lower = cat.toLowerCase().trim();
  
  // Skip combined categories - return null to use fallback
  if (lower.includes('&') || lower.includes(' and ')) return null;
  
  // Map to clean singular labels
  if (['food', 'foods'].includes(lower)) return 'food item';
  if (['drink', 'drinks', 'beverage', 'beverages'].includes(lower)) return 'drink';
  if (['food_drinks', 'food & drinks', 'food and drinks'].includes(lower)) return null; // Skip combined
  if (['tableware', 'supplies', 'plates', 'utensils'].includes(lower)) return 'tableware item';
  if (['decor', 'decoration', 'decorations'].includes(lower)) return 'decor item';
  if (['equipment', 'gear', 'tools'].includes(lower)) return 'equipment item';
  if (['activities', 'activity', 'games', 'entertainment'].includes(lower)) return 'activity';
  if (['setup', 'cleanup', 'setup_cleanup', 'setup & cleanup', 'setup and cleanup'].includes(lower)) return null; // Skip combined
  if (['sides', 'side', 'side dish', 'side dishes'].includes(lower)) return 'side';
  if (['desserts', 'dessert', 'sweets'].includes(lower)) return 'dessert';
  if (['appetizers', 'appetizer', 'starters'].includes(lower)) return 'appetizer';
  if (['mains', 'main', 'main course', 'entrees', 'entree'].includes(lower)) return 'main';
  if (['snacks', 'snack'].includes(lower)) return 'snack';
  
  return null; // Other/unknown categories use generic "item"
};

// Normalize category for grouping calculations
const normalizeCategory = (cat: string | null | undefined): string => {
  if (!cat) return 'Other';
  return cat.trim();
};

export const ItemsNeededInsight = ({
  items,
  sectionPreset = 'bring_something',
  eventDate,
  goingCount = 0,
  isArchived = false,
  showNeedsMostHint = true,
  guestSuggestionsEnabled = false,
  suggestedItemsCount = 0,
}: ItemsNeededInsightProps) => {
  const insight = useMemo(() => {
    // === PRECONDITION CHECKS ===
    if (isArchived) return null;
    
    if (eventDate) {
      try {
        const eventDateParsed = parseISO(eventDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (!isAfter(eventDateParsed, now) && eventDateParsed.toDateString() !== now.toDateString()) {
          return null;
        }
      } catch {
        // If parsing fails, continue
      }
    }
    
    if (goingCount < 1) return null;
    if (!items || items.length === 0) return null;
    if (sectionPreset !== 'bring_something') return null;
    if (showNeedsMostHint === false) return null;

    // Calculate days until event
    let daysUntilEvent = 999;
    if (eventDate) {
      try {
        daysUntilEvent = differenceInDays(parseISO(eventDate), new Date());
      } catch {
        // If parsing fails, use large number
      }
    }

    // Filter out host-provided items
    const claimableItems = items.filter(item => !item.is_host_provided);
    
    // === PRIORITY 1: Category-Based Need ===
    const categoryNeeds: Record<string, { remaining: number; originalCategory: string }> = {};
    
    claimableItems.forEach(item => {
      const category = normalizeCategory(item.category);
      
      let remaining = 0;
      if (item.goal_type === 'quantity' || item.goal_type === 'both') {
        remaining = Math.max(0, (item.goal_quantity || 1) - (item.current_quantity || 0));
      } else if (item.fulfillment_status !== 'fulfilled') {
        remaining = 1;
      }
      
      if (remaining > 0) {
        if (!categoryNeeds[category]) {
          categoryNeeds[category] = { remaining: 0, originalCategory: item.category };
        }
        categoryNeeds[category].remaining += remaining;
      }
    });
    
    // Find category with highest need
    let topCategory: { name: string; remaining: number; original: string } | null = null;
    
    Object.entries(categoryNeeds).forEach(([cat, data]) => {
      if (!topCategory || data.remaining > topCategory.remaining) {
        topCategory = { name: cat, remaining: data.remaining, original: data.originalCategory };
      }
    });
    
    // Check Priority 1 conditions
    if (topCategory && topCategory.remaining > 0) {
      const displayLabel = getCategoryDisplayLabel(topCategory.original);
      
      // Only use category-specific message if we have a clean singular label
      if (displayLabel) {
        if (topCategory.remaining >= 2) {
          // Use plural form
          const plural = displayLabel.endsWith('y') 
            ? displayLabel.slice(0, -1) + 'ies'
            : displayLabel + 's';
          return { label: `${topCategory.remaining} ${plural} still needed` };
        }
        if (topCategory.remaining === 1 && daysUntilEvent <= 7) {
          return { label: `1 ${displayLabel} still needed` };
        }
      }
    }
    
    // === PRIORITY 2: General "Items Needed" Fallback ===
    const totalRemaining = Object.values(categoryNeeds).reduce((sum, data) => sum + data.remaining, 0);
    
    if (totalRemaining >= 2) {
      return { label: `${totalRemaining} items still needed` };
    }
    if (totalRemaining === 1 && daysUntilEvent <= 3) {
      return { label: `1 item still needed` };
    }
    
    // === PRIORITY 3: Suggestions Encouraged ===
    if (
      guestSuggestionsEnabled &&
      suggestedItemsCount === 0 &&
      totalRemaining === 0 &&
      daysUntilEvent <= 7
    ) {
      return { label: `Suggestions welcome — help the host by suggesting an item` };
    }
    
    return null;
  }, [items, sectionPreset, eventDate, goingCount, isArchived, showNeedsMostHint, guestSuggestionsEnabled, suggestedItemsCount]);

  if (!insight) return null;

  return (
    <span className="inline-block text-[12px] px-2.5 py-1 rounded-full bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 font-medium">
      {insight.label}
    </span>
  );
};
