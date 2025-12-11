import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Check } from "lucide-react";
import { 
  suggestCategory, 
  suggestDietaryTags,
  formatCategoryLabel,
  formatSubcategoryLabel,
  CategorySuggestion,
  DietarySuggestion 
} from "@/lib/itemAiAssist";
import { cn } from "@/lib/utils";

interface AiSuggestionChipsProps {
  itemName: string;
  currentCategory: string;
  currentDietaryTags: string[];
  onApplyCategory: (category: string, subcategory?: string) => void;
  onApplyDietaryTag: (tag: string) => void;
}

export const AiSuggestionChips = ({
  itemName,
  currentCategory,
  currentDietaryTags,
  onApplyCategory,
  onApplyDietaryTag,
}: AiSuggestionChipsProps) => {
  const [categorySuggestion, setCategorySuggestion] = useState<CategorySuggestion | null>(null);
  const [dietarySuggestions, setDietarySuggestions] = useState<DietarySuggestion[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (itemName.length < 3) {
      setCategorySuggestion(null);
      setDietarySuggestions([]);
      return;
    }

    const suggestion = suggestCategory(itemName);
    const dietarySugs = suggestDietaryTags(itemName);
    
    setCategorySuggestion(suggestion);
    setDietarySuggestions(dietarySugs);
    setDismissed(false);
  }, [itemName]);

  // Don't show if category already matches or no suggestions
  const showCategorySuggestion = categorySuggestion && 
    categorySuggestion.category !== currentCategory && 
    !dismissed;

  // Filter dietary suggestions to ones not already applied
  const newDietarySuggestions = dietarySuggestions.filter(
    d => !currentDietaryTags.includes(d.tag)
  );

  if (!showCategorySuggestion && newDietarySuggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 animate-fade-in" role="group" aria-label="AI suggestions">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        <span>Suggestions:</span>
      </div>
      
      {showCategorySuggestion && (
        <Badge
          variant="outline"
          className={cn(
            "cursor-pointer h-7 gap-1.5 border-primary/30 hover:bg-primary/10 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          )}
          onClick={() => {
            onApplyCategory(categorySuggestion.category, categorySuggestion.subcategory);
            setDismissed(true);
          }}
          tabIndex={0}
          role="button"
          aria-label={`Suggest category: ${formatCategoryLabel(categorySuggestion.category)}`}
        >
          <Check className="h-3 w-3" />
          {formatCategoryLabel(categorySuggestion.category)}
          {categorySuggestion.subcategory && (
            <span className="text-muted-foreground">
              → {formatSubcategoryLabel(categorySuggestion.subcategory)}
            </span>
          )}
        </Badge>
      )}

      {newDietarySuggestions.slice(0, 2).map(suggestion => (
        <Badge
          key={suggestion.tag}
          variant="outline"
          className={cn(
            "cursor-pointer h-7 gap-1.5 border-green-500/30 hover:bg-green-500/10 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          )}
          onClick={() => onApplyDietaryTag(suggestion.tag)}
          tabIndex={0}
          role="button"
          aria-label={`Add dietary tag: ${suggestion.tag}`}
        >
          <Check className="h-3 w-3 text-green-600" />
          {suggestion.tag.replace('_', '-')}
        </Badge>
      ))}
    </div>
  );
};
