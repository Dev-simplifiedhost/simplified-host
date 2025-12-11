import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { filterContent } from "@/lib/contentFilter";
import { checkRateLimit, recordAction, RATE_LIMIT_CONFIGS } from "@/lib/itemRateLimiter";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { suggestCategory } from "@/lib/itemAiAssist";

const MAX_SUGGESTION_LENGTH = 60;
const OFFLINE_QUEUE_KEY = 'pending_item_suggestions';

interface QuickSuggestInputProps {
  eventId: string;
  guestName: string;
  existingItems: Array<{ id: string; name: string }>;
  onSuccess: (itemId: string, itemName: string) => void;
  disabled?: boolean;
}

export const QuickSuggestInput = ({
  eventId,
  guestName,
  existingItems,
  onSuccess,
  disabled = false,
}: QuickSuggestInputProps) => {
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  // Get first name for display
  const getFirstName = (fullName: string): string => {
    return fullName.trim().split(' ')[0] || 'Guest';
  };

  const handleSubmit = async () => {
    const trimmedValue = value.trim();
    
    if (!trimmedValue) return;
    if (loading) return;

    // Validate length
    if (trimmedValue.length > MAX_SUGGESTION_LENGTH) {
      toast({
        title: "Item name too long",
        description: `Maximum ${MAX_SUGGESTION_LENGTH} characters allowed`,
        variant: "destructive",
      });
      return;
    }

    // Content filter (profanity check)
    const contentCheck = filterContent(trimmedValue);
    if (!contentCheck.isClean) {
      toast({
        title: "Invalid content",
        description: contentCheck.issues[0],
        variant: "destructive",
      });
      return;
    }

    // Rate limit check - 10 seconds between suggestions
    const rateCheck = checkRateLimit('GUEST_QUICK_SUGGEST');
    if (!rateCheck.allowed) {
      toast({
        title: "Please wait",
        description: rateCheck.message,
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate in existing items (case-insensitive)
    const normalizedInput = trimmedValue.toLowerCase();
    const existingItem = existingItems.find(
      item => item.name.toLowerCase() === normalizedInput
    );

    if (existingItem) {
      // Item already exists - check if it's a suggested item and merge
      const { data: itemData } = await supabase
        .from('event_items')
        .select('id, is_suggested, suggested_count, suggested_by')
        .eq('id', existingItem.id)
        .single();

      if (itemData?.is_suggested) {
        // Merge: increment count and add guest name
        const currentSuggestedBy = (itemData.suggested_by as string[]) || [];
        const guestFirstName = getFirstName(guestName);
        
        // Don't add duplicate names
        if (!currentSuggestedBy.includes(guestFirstName)) {
          await supabase
            .from('event_items')
            .update({
              suggested_count: (itemData.suggested_count || 1) + 1,
              suggested_by: [...currentSuggestedBy, guestFirstName],
            })
            .eq('id', existingItem.id);
          
          toast({ title: "This item is already on the list." });
          setValue("");
          recordAction('GUEST_QUICK_SUGGEST');
          return;
        }
      }

      toast({ title: "This item is already on the list." });
      setValue("");
      return;
    }

    // Handle offline mode
    if (!isOnline) {
      queueOfflineSuggestion(trimmedValue);
      toast({ title: "Saved offline — will sync when connected." });
      setValue("");
      return;
    }

    setLoading(true);

    try {
      // Auto-detect category
      const categorySuggestion = suggestCategory(trimmedValue);
      const categoryMap: Record<string, string> = {
        'food_drinks': 'drink',
        'tableware': 'supplies',
        'decor': 'misc',
        'equipment': 'supplies',
        'activities': 'misc',
        'setup_cleanup': 'misc',
        'other': 'misc'
      };
      const suggestedCat = categorySuggestion?.category || 'other';
      const dbCategory = categoryMap[suggestedCat] || 'misc';

      const guestFirstName = getFirstName(guestName);

      // Insert directly into event_items
      const { data, error } = await supabase
        .from('event_items')
        .insert({
          event_id: eventId,
          name: trimmedValue,
          category: dbCategory,
          goal_type: 'quantity',
          goal_quantity: 1,
          quantity: 1,
          current_quantity: 0,
          fulfillment_status: 'unfulfilled',
          is_suggested: true,
          is_guest_added: true,
          suggested_count: 1,
          suggested_by: [guestFirstName],
        })
        .select()
        .single();

      if (error) {
        console.error('Suggestion error:', error);
        toast({
          title: "Error",
          description: "Could not add suggestion. Please try again.",
          variant: "destructive",
        });
      } else {
        recordAction('GUEST_QUICK_SUGGEST');
        toast({ title: "Thanks for your suggestion!" });
        setValue("");
        onSuccess(data.id, data.name);
      }
    } catch (err) {
      console.error('Suggestion failed:', err);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const queueOfflineSuggestion = (itemName: string) => {
    try {
      const queue = JSON.parse(localStorage.getItem(`${OFFLINE_QUEUE_KEY}_${eventId}`) || '[]');
      queue.push({
        name: itemName,
        guestName,
        timestamp: Date.now(),
      });
      localStorage.setItem(`${OFFLINE_QUEUE_KEY}_${eventId}`, JSON.stringify(queue));
    } catch {
      // Ignore storage errors
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MAX_SUGGESTION_LENGTH))}
        onKeyDown={handleKeyDown}
        placeholder="Suggest an item…"
        className="h-10 flex-1"
        maxLength={MAX_SUGGESTION_LENGTH}
        disabled={disabled || loading}
        aria-label="Suggest an item"
      />
      <Button
        type="button"
        size="icon"
        className="h-10 w-10 shrink-0"
        onClick={handleSubmit}
        disabled={disabled || loading || !value.trim()}
        aria-label="Submit suggestion"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};
