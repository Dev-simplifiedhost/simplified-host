import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Users } from "lucide-react";
import { suggestQuantity, QuantitySuggestion } from "@/lib/itemAiAssist";

interface AiQuantitySuggestionProps {
  itemName: string;
  currentQuantity: number;
  guestCount: number;
  onApply: (quantity: number) => void;
}

export const AiQuantitySuggestion = ({
  itemName,
  currentQuantity,
  guestCount,
  onApply,
}: AiQuantitySuggestionProps) => {
  const [suggestion, setSuggestion] = useState<QuantitySuggestion | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (itemName.length < 2 || guestCount <= 0) {
      setSuggestion(null);
      return;
    }

    const result = suggestQuantity(itemName, guestCount);
    setSuggestion(result);
    setDismissed(false);
  }, [itemName, guestCount]);

  // Don't show if already matches, dismissed, or no suggestion
  if (!suggestion || dismissed || currentQuantity >= suggestion.suggested) {
    return null;
  }

  return (
    <div 
      className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20 animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
      <div className="flex-1 text-sm">
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {guestCount} guests
        </span>
        <span className="text-muted-foreground ml-1">
          — suggest {suggestion.suggested}?
        </span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs"
        onClick={() => {
          onApply(suggestion.suggested);
          setDismissed(true);
        }}
      >
        Apply
      </Button>
    </div>
  );
};
