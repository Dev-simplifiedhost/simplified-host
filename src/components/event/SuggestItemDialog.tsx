import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lightbulb, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { z } from "zod";
import { filterContent, CHAR_LIMITS, findSimilarItem } from "@/lib/contentFilter";
import { checkRateLimit, recordAction } from "@/lib/itemRateLimiter";

const suggestItemSchema = z.object({
  item_name: z.string().trim().min(1, "Item name is required").max(CHAR_LIMITS.ITEM_NAME, "Name too long (max 50 characters)"),
  category: z.string().min(1, "Category is required"),
  dietary_tags: z.array(z.string()).optional(),
  dietary_other: z.string().max(100, "Dietary info too long").optional(),
  goal_amount: z.number().min(0).optional(),
  notes: z.string().trim().max(CHAR_LIMITS.ITEM_NOTES, "Notes too long (max 200 characters)").optional(),
});

interface SuggestItemDialogProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guestName: string;
  guestEmail?: string;
  onSuccess?: () => void;
  itemSuggestEligibility?: string;
}

export const SuggestItemDialog = ({
  eventId,
  open,
  onOpenChange,
  guestName,
  guestEmail,
  onSuccess,
  itemSuggestEligibility = 'attending_and_maybe',
}: SuggestItemDialogProps) => {
  const { toast } = useToast();
  const { verifyRecaptcha } = useRecaptcha();
  const isMobile = useIsMobile();
  const contentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [rsvpId, setRsvpId] = useState<string | null>(null);
  const [canSuggest, setCanSuggest] = useState(false);
  
  const [formData, setFormData] = useState({
    item_name: "",
    category: "",
    dietary_tags: [] as string[],
    dietary_other: "",
    goal_amount: "",
    notes: "",
  });

  // Check if user has an RSVP and matches eligibility requirements
  useEffect(() => {
    const checkRSVP = async () => {
      if (!open) return;

      // If host allows all invitees, no RSVP or name check needed
      if (itemSuggestEligibility === 'all_invitees') {
        setCanSuggest(true);
        setRsvpId(null);
        return;
      }

      if (!guestName.trim()) return;

      const guestToken = localStorage.getItem(`rsvp_token_${eventId}`);
      if (!guestToken) {
        setCanSuggest(false);
        setRsvpId(null);
        return;
      }

      const { data: rsvp } = await supabase
        .rpc('check_rsvp_status', {
          p_event_id: eventId,
          p_guest_token: guestToken
        })
        .maybeSingle();

      if (!rsvp) {
        setCanSuggest(false);
        setRsvpId(null);
        return;
      }

      // Check based on event's suggestion eligibility setting
      let eligible = false;
      switch (itemSuggestEligibility) {
        case 'attending_only':
          eligible = rsvp.rsvp_status === 'attending';
          break;
        case 'attending_and_maybe':
          eligible = ['attending', 'maybe'].includes(rsvp.rsvp_status);
          break;
        default:
          eligible = false;
      }

      if (eligible) {
        setRsvpId(rsvp.id);
        setCanSuggest(true);
      } else {
        setCanSuggest(false);
        setRsvpId(null);
      }
    };

    checkRSVP();
  }, [open, eventId, guestName, itemSuggestEligibility]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canSuggest) {
      const message = itemSuggestEligibility === 'attending_only' 
        ? "You must RSVP as 'Attending' to suggest items"
        : itemSuggestEligibility === 'attending_and_maybe'
        ? "You must RSVP as 'Attending' or 'Maybe' to suggest items"
        : "Please check RSVP requirements";
      
      toast({
        title: "RSVP Required",
        description: message,
        variant: "destructive",
      });
      return;
    }

    // Check rate limit (3 suggestions per 5 minutes)
    const rateCheck = checkRateLimit('GUEST_SUGGESTIONS');
    if (!rateCheck.allowed) {
      toast({
        title: "Suggestion limit reached",
        description: rateCheck.message,
        variant: "destructive",
      });
      return;
    }

    // Skip guest token requirement if host allows all invitees
    const guestToken = itemSuggestEligibility !== 'all_invitees' 
      ? localStorage.getItem(`rsvp_token_${eventId}`)
      : null;
      
    if (itemSuggestEligibility !== 'all_invitees' && !guestToken) {
      toast({
        title: "Session expired",
        description: "Please refresh and RSVP again",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Validate form data
      const validatedData = suggestItemSchema.parse({
        item_name: formData.item_name,
        category: formData.category,
        dietary_tags: formData.dietary_tags,
        dietary_other: formData.dietary_other || undefined,
        goal_amount: formData.goal_amount ? parseFloat(formData.goal_amount) : undefined,
        notes: formData.notes || undefined,
      });

      // Content filtering for name and notes
      const nameFilter = filterContent(validatedData.item_name);
      if (!nameFilter.isClean) {
        toast({
          title: "Invalid item name",
          description: nameFilter.issues.join('. '),
          variant: "destructive",
        });
        return;
      }

      if (validatedData.notes) {
        const notesFilter = filterContent(validatedData.notes);
        if (!notesFilter.isClean) {
          toast({
            title: "Invalid notes",
            description: notesFilter.issues.join('. '),
            variant: "destructive",
          });
          return;
        }
      }

      // Check for duplicate items
      const { data: existingItems } = await supabase
        .from('event_items')
        .select('name, id')
        .eq('event_id', eventId);
      
      if (existingItems) {
        const duplicateCheck = findSimilarItem(validatedData.item_name, existingItems);
        if (duplicateCheck.isSimilar) {
          toast({
            title: "Similar item exists",
            description: `A similar item "${duplicateCheck.matchedItem}" may already exist. Please check the item list.`,
            variant: "default",
          });
          // Continue anyway - just a warning
        }
      }

      // Verify reCAPTCHA
      const recaptchaToken = await verifyRecaptcha('suggest_item');
      if (!recaptchaToken) {
        toast({
          title: "Verification failed",
          description: "reCAPTCHA verification failed. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Determine goal type based on what guest provided
      let goalType: 'quantity' | 'monetary' | 'both';
      let goalQuantity = 1;
      let goalAmount = validatedData.goal_amount || null;

      if (validatedData.goal_amount) {
        goalType = 'both';
      } else {
        goalType = 'quantity';
      }

      // Insert into item_suggestions table (pending review)
      const { error } = await supabase
        .from('item_suggestions')
        .insert([{
          event_id: eventId,
          suggested_by_name: guestName,
          suggested_by_email: guestEmail || null,
          rsvp_id: rsvpId,
          item_name: validatedData.item_name,
          description: null,
          notes: validatedData.notes || null,
          category: validatedData.category,
          goal_type: goalType,
          goal_quantity: goalQuantity,
          goal_amount: goalAmount,
          dietary_tags: validatedData.dietary_tags && validatedData.dietary_tags.length > 0 ? validatedData.dietary_tags : null,
          dietary_other: validatedData.dietary_other || null,
          status: 'pending',
        }]);

      if (error) throw error;

      // Record rate limit action after success
      recordAction('GUEST_SUGGESTIONS');

      toast({
        title: "Suggestion submitted!",
        description: "Your suggestion has been submitted for review by the host.",
      });

      // Reset form
      setFormData({
        item_name: "",
        category: "",
        dietary_tags: [],
        dietary_other: "",
        goal_amount: "",
        notes: "",
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error submitting suggestion:', error);
      toast({
        title: "Error submitting suggestion",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!isMobile) return;
    
    const el = e.currentTarget;
    const container = contentRef.current;
    if (!container) return;
    
    // Longer delay to allow keyboard animation to complete
    // Prevent scrollIntoView for number inputs as they lose focus on mobile
    if (el.type === 'number') {
      // For number inputs, just ensure the container scrolls to show the field
      setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const isVisible = rect.top >= containerRect.top && rect.bottom <= containerRect.bottom;
        
        if (!isVisible) {
          container.scrollTop = el.offsetTop - 100; // Scroll with padding
        }
      }, 300);
    } else {
      // For text inputs, use scrollIntoView
      setTimeout(() => {
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      }, 300);
    }
  };

  const content = (
    <>
      {!canSuggest ? (
        <div className="bg-muted p-4 rounded-md text-sm">
          <p className="font-medium">RSVP Required</p>
          <p className="text-muted-foreground mt-1">
            {itemSuggestEligibility === 'attending_only' 
              ? "You must RSVP as 'Attending' to suggest items for this event."
              : itemSuggestEligibility === 'attending_and_maybe'
              ? "You must RSVP as 'Attending' or 'Maybe' to suggest items for this event."
              : "Please check RSVP requirements to suggest items."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label htmlFor="item_name">Item Name *</Label>
            <Input
              id="item_name"
              value={formData.item_name}
              onChange={(e) => setFormData({ ...formData, item_name: e.target.value.slice(0, CHAR_LIMITS.ITEM_NAME) })}
              placeholder="e.g., Paper plates, Napkins, Salad"
              maxLength={CHAR_LIMITS.ITEM_NAME}
              required
              onFocus={handleInputFocus}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.item_name.length}/{CHAR_LIMITS.ITEM_NAME} characters
            </p>
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              required
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="appetizer">Appetizer</SelectItem>
                <SelectItem value="main">Main Dish</SelectItem>
                <SelectItem value="side">Side Dish</SelectItem>
                <SelectItem value="dessert">Dessert</SelectItem>
                <SelectItem value="drink">Drinks</SelectItem>
                <SelectItem value="decor">Decorations</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Dietary Tags (Optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">Select all that apply</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {["Vegetarian", "Vegan", "Gluten-free", "Kosher", "Nut-free"].map((tag) => {
                const tagValue = tag.toLowerCase().replace("-", "_");
                const isSelected = formData.dietary_tags.includes(tagValue);
                return (
                  <Button
                    key={tag}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        dietary_tags: isSelected
                          ? formData.dietary_tags.filter(t => t !== tagValue)
                          : [...formData.dietary_tags, tagValue]
                      });
                    }}
                  >
                    {tag}
                  </Button>
                );
              })}
            </div>
            <Input
              placeholder="Other dietary restrictions (e.g., Halal, Dairy-free)"
              value={formData.dietary_other}
              onChange={(e) => setFormData({ ...formData, dietary_other: e.target.value })}
              maxLength={100}
              onFocus={handleInputFocus}
            />
          </div>

          <div>
            <Label htmlFor="goal_amount">Goal Amount ($) (Optional)</Label>
            <Input
              id="goal_amount"
              type="number"
              min="0"
              step="0.01"
              value={formData.goal_amount}
              onChange={(e) => setFormData({ ...formData, goal_amount: e.target.value })}
              placeholder="0.00"
              onFocus={handleInputFocus}
            />
            <p className="text-xs text-muted-foreground mt-1">
              How much should others contribute toward this item?
            </p>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value.slice(0, CHAR_LIMITS.ITEM_NOTES) })}
              placeholder="Any special details or preparation instructions"
              maxLength={CHAR_LIMITS.ITEM_NOTES}
              rows={3}
              onFocus={handleInputFocus}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.notes.length}/{CHAR_LIMITS.ITEM_NOTES} characters
            </p>
          </div>
        </div>
      )}
    </>
  );

  const footer = canSuggest ? (
    <form onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Submit Suggestion
        </Button>
      </div>
    </form>
  ) : null;

  // Desktop uses Dialog
  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              <DialogTitle>Suggest an Item</DialogTitle>
            </div>
            <DialogDescription>
              Can't find what you want to bring? Add a new item to the event.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {content}
          </div>
          {footer && <div className="pt-4">{footer}</div>}
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile uses Drawer
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="h-[92dvh] overflow-hidden">
        <DrawerHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <DrawerTitle>Suggest an Item</DrawerTitle>
          </div>
          <DrawerDescription>
            Can't find what you want to bring? Add a new item to the event.
          </DrawerDescription>
        </DrawerHeader>
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-y-contain px-6 pb-[calc(env(safe-area-inset-bottom)+120px)] [@supports(-webkit-touch-callout:none)]:[-webkit-overflow-scrolling:touch]"
          data-vaul-no-drag
        >
          {content}
        </div>
        {footer && (
          <DrawerFooter className="pt-2 pb-[max(1rem,calc(env(safe-area-inset-bottom)+1rem))]">
            {footer}
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
};
