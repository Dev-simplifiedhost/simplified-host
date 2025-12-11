import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Plus } from "lucide-react";

interface SuggestedItemsCardProps {
  eventId: string;
  existingItems: { name: string; category: string }[];
  guestCount: number;
  eventTitle: string;
  eventLocation: string;
  onAddItem: (itemName: string) => void;
}

const DISMISSED_KEY_PREFIX = 'suggested_items_dismissed_';

/**
 * Rule-based suggestions - no LLM calls
 */
function getRuleBasedSuggestions(
  existingItems: { name: string; category: string }[],
  guestCount: number,
  eventTitle: string,
  eventLocation: string,
  limit: number = 6
): { name: string; category: string }[] {
  const suggestions: { name: string; category: string }[] = [];
  const existingNames = existingItems.map(i => i.name.toLowerCase());
  const existingCategories = new Set(existingItems.map(i => i.category?.toLowerCase() || ''));

  const alreadyExists = (name: string) =>
    existingNames.some(n => n.includes(name.toLowerCase()) || name.toLowerCase().includes(n));

  // 1. Starter Pack (few items)
  if (existingItems.length < 5) {
    const starterPack = [
      { name: "Drinks", category: "food_drinks" },
      { name: "Appetizers", category: "food_drinks" },
      { name: "Dessert", category: "food_drinks" },
      { name: "Utensils", category: "tableware" },
      { name: "Plates", category: "tableware" },
      { name: "Cups", category: "tableware" },
    ];
    starterPack.forEach(item => {
      if (!alreadyExists(item.name)) suggestions.push(item);
    });
  }

  // 2. Category Gaps
  const hasMains = existingItems.some(i =>
    ['main', 'burger', 'hot dog', 'chicken', 'pizza', 'lasagna', 'taco'].some(k =>
      i.name.toLowerCase().includes(k)
    )
  );
  const hasSides = existingItems.some(i =>
    ['side', 'salad', 'coleslaw', 'potato', 'rice', 'beans'].some(k =>
      i.name.toLowerCase().includes(k)
    )
  );
  const hasSnacks = existingItems.some(i =>
    ['chip', 'snack', 'appetizer', 'dip', 'cracker'].some(k =>
      i.name.toLowerCase().includes(k)
    )
  );
  const hasDrinks = existingItems.some(i =>
    ['drink', 'soda', 'water', 'juice', 'beer', 'wine', 'lemonade', 'tea', 'coffee'].some(k =>
      i.name.toLowerCase().includes(k)
    )
  );
  const hasDecor = existingCategories.has('decor') || existingItems.some(i =>
    ['balloon', 'banner', 'decoration', 'streamer', 'tablecloth'].some(k =>
      i.name.toLowerCase().includes(k)
    )
  );
  const hasTableware = existingCategories.has('tableware') || existingCategories.has('supplies') ||
    existingItems.some(i =>
      ['plate', 'cup', 'napkin', 'utensil', 'fork', 'spoon'].some(k =>
        i.name.toLowerCase().includes(k)
      )
    );

  if (hasMains && !hasSides && !alreadyExists("Side dishes")) {
    suggestions.push({ name: "Side dishes", category: "food_drinks" });
  }
  if (hasSnacks && !hasDrinks && !alreadyExists("Drinks")) {
    suggestions.push({ name: "Drinks", category: "food_drinks" });
  }
  if (hasDecor && !hasTableware) {
    if (!alreadyExists("Plates")) suggestions.push({ name: "Plates", category: "tableware" });
    if (!alreadyExists("Napkins")) suggestions.push({ name: "Napkins", category: "tableware" });
    if (!alreadyExists("Cups")) suggestions.push({ name: "Cups", category: "tableware" });
  }

  // 3. Guest Count Rules
  if (guestCount >= 10 && !alreadyExists("Extra ice")) {
    suggestions.push({ name: "Extra ice", category: "food_drinks" });
  }
  if (guestCount >= 20) {
    if (!alreadyExists("Serving platters")) {
      suggestions.push({ name: "Serving platters", category: "tableware" });
    }
    if (!alreadyExists("Trash bags")) {
      suggestions.push({ name: "Trash bags", category: "setup_cleanup" });
    }
  }

  // 4. Outdoor/BBQ Keywords
  const outdoorKeywords = ["backyard", "park", "bbq", "outdoor", "picnic", "garden", "patio", "cookout", "grill"];
  const combinedText = `${eventTitle} ${eventLocation}`.toLowerCase();
  const isOutdoor = outdoorKeywords.some(kw => combinedText.includes(kw));
  
  if (isOutdoor) {
    if (!alreadyExists("Cooler")) suggestions.push({ name: "Cooler", category: "equipment" });
    if (!alreadyExists("Ice")) suggestions.push({ name: "Ice", category: "food_drinks" });
    if (!alreadyExists("Bug spray")) suggestions.push({ name: "Bug spray", category: "setup_cleanup" });
    if (!alreadyExists("Sunscreen")) suggestions.push({ name: "Sunscreen", category: "setup_cleanup" });
  }

  // Deduplicate by name and limit
  const seen = new Set<string>();
  return suggestions
    .filter(s => {
      const lower = s.name.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    })
    .slice(0, limit);
}

export const SuggestedItemsCard = ({
  eventId,
  existingItems,
  guestCount,
  eventTitle,
  eventLocation,
  onAddItem,
}: SuggestedItemsCardProps) => {
  const [dismissed, setDismissed] = useState(false);
  const [suggestions, setSuggestions] = useState<{ name: string; category: string }[]>([]);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Check localStorage for permanent dismissal
    try {
      const dismissedKey = `${DISMISSED_KEY_PREFIX}${eventId}`;
      if (localStorage.getItem(dismissedKey)) {
        setDismissed(true);
        return;
      }
    } catch {}

    // Don't show if 20+ items already
    if (existingItems.length >= 20) {
      setSuggestions([]);
      return;
    }

    const newSuggestions = getRuleBasedSuggestions(
      existingItems,
      guestCount,
      eventTitle,
      eventLocation
    );
    setSuggestions(newSuggestions);
  }, [existingItems, guestCount, eventTitle, eventLocation, eventId]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      const dismissedKey = `${DISMISSED_KEY_PREFIX}${eventId}`;
      localStorage.setItem(dismissedKey, Date.now().toString());
    } catch {}
  };

  const handleAddSuggestion = (item: { name: string; category: string }) => {
    onAddItem(item.name);
    setAddedItems(prev => new Set([...prev, item.name.toLowerCase()]));
  };

  // Filter out already-added items
  const visibleSuggestions = suggestions.filter(
    s => !addedItems.has(s.name.toLowerCase())
  );

  // Auto-hide if all suggestions used or dismissed
  if (dismissed || visibleSuggestions.length === 0 || existingItems.length >= 20) {
    return null;
  }

  return (
    <div className="mt-4 rounded-lg border border-border bg-muted/40 px-3 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/5 text-primary">
            <Lightbulb className="h-3.5 w-3.5" />
          </span>
          <p className="text-xs font-medium text-foreground">Many hosts also add</p>
        </div>
        <button
          type="button"
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleDismiss}
        >
          Dismiss
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {visibleSuggestions.map(item => (
          <Badge
            key={item.name}
            variant="outline"
            className="cursor-pointer h-7 gap-1 text-[11px] hover:bg-primary/10 transition-colors"
            onClick={() => handleAddSuggestion(item)}
          >
            <Plus className="h-3 w-3" />
            {item.name}
          </Badge>
        ))}
      </div>
    </div>
  );
};
