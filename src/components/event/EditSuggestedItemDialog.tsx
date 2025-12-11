import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { filterContent, CHAR_LIMITS } from "@/lib/contentFilter";
import { checkRateLimit, recordAction } from "@/lib/itemRateLimiter";

interface EditSuggestedItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  eventId: string;
  onSuccess: () => void;
}

const CATEGORIES = [
  { value: 'appetizer', label: 'Appetizer' },
  { value: 'main', label: 'Main Course' },
  { value: 'side', label: 'Side Dish' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'drink', label: 'Drink' },
  { value: 'decor', label: 'Decor' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'misc', label: 'Miscellaneous' },
  { value: 'other', label: 'Other' },
];

const DIETARY_TAGS = [
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 
  'nut-free', 'kosher', 'halal', 'organic'
];

export const EditSuggestedItemDialog = ({ 
  open, 
  onOpenChange, 
  item, 
  eventId, 
  onSuccess 
}: EditSuggestedItemDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    notes: '',
    goal_type: 'quantity' as 'quantity' | 'monetary' | 'both',
    goal_quantity: '',
    goal_amount: '',
    dietary_tags: [] as string[],
    dietary_other: '',
    serves_per_unit: '',
  });

  useEffect(() => {
    if (item && open) {
      setFormData({
        name: item.name || '',
        category: item.category || '',
        notes: item.notes || '',
        goal_type: item.goal_type || 'quantity',
        goal_quantity: item.goal_quantity?.toString() || '',
        goal_amount: item.goal_amount?.toString() || '',
        dietary_tags: item.dietary_tags || [],
        dietary_other: item.dietary_other || '',
        serves_per_unit: item.serves_per_unit?.toString() || '',
      });
    }
  }, [item, open]);

  const handleSubmit = async () => {
    // Rate limiting
    const rateCheck = checkRateLimit('GUEST_SUGGESTIONS');
    if (!rateCheck.allowed) {
      toast({ title: "Slow down", description: rateCheck.message, variant: "destructive" });
      return;
    }

    if (!formData.name.trim()) {
      toast({ title: "Item name is required", variant: "destructive" });
      return;
    }

    if (!formData.category) {
      toast({ title: "Please select a category", variant: "destructive" });
      return;
    }

    // Content filtering
    const nameFilter = filterContent(formData.name);
    if (!nameFilter.isClean) {
      toast({ title: "Invalid Item Name", description: nameFilter.issues[0], variant: "destructive" });
      return;
    }

    const notesFilter = filterContent(formData.notes);
    if (!notesFilter.isClean) {
      toast({ title: "Invalid Notes", description: notesFilter.issues[0], variant: "destructive" });
      return;
    }

    setLoading(true);

    const guestToken = localStorage.getItem(`rsvp_token_${eventId}`);
    if (!guestToken) {
      toast({ title: "Error", description: "Guest token not found", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { error } = await supabase.rpc('update_my_suggested_item', {
      p_item_id: item.id,
      p_event_id: eventId,
      p_guest_token: guestToken,
      p_name: formData.name.trim().slice(0, CHAR_LIMITS.ITEM_NAME),
      p_category: formData.category,
      p_notes: formData.notes.trim().slice(0, CHAR_LIMITS.ITEM_NOTES) || null,
      p_goal_type: formData.goal_type,
      p_goal_quantity: formData.goal_quantity ? parseInt(formData.goal_quantity) : null,
      p_goal_amount: formData.goal_amount ? parseFloat(formData.goal_amount) : null,
      p_dietary_tags: formData.dietary_tags.length > 0 ? formData.dietary_tags : null,
      p_dietary_other: formData.dietary_other.trim() || null,
      p_serves_per_unit: formData.serves_per_unit ? parseInt(formData.serves_per_unit) : null,
    });

    setLoading(false);

    if (error) {
      toast({ 
        title: "Unable to update item", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      recordAction('GUEST_SUGGESTIONS');
      toast({ 
        title: "Item updated!", 
        description: "Your changes have been saved." 
      });
      onOpenChange(false);
      onSuccess();
    }
  };

  const toggleDietaryTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      dietary_tags: prev.dietary_tags.includes(tag)
        ? prev.dietary_tags.filter(t => t !== tag)
        : [...prev.dietary_tags, tag]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Your Suggested Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Item Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value.slice(0, CHAR_LIMITS.ITEM_NAME) })}
              placeholder="e.g., Caesar Salad"
              maxLength={CHAR_LIMITS.ITEM_NAME}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.name.length}/{CHAR_LIMITS.ITEM_NAME}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes / Description</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value.slice(0, CHAR_LIMITS.ITEM_NOTES) })}
              placeholder="Any additional details..."
              rows={3}
              maxLength={CHAR_LIMITS.ITEM_NOTES}
            />
            <p className="text-xs text-muted-foreground text-right">
              {formData.notes.length}/{CHAR_LIMITS.ITEM_NOTES}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal_quantity">Quantity Needed</Label>
              <Input
                id="goal_quantity"
                type="number"
                min="1"
                value={formData.goal_quantity}
                onChange={(e) => setFormData({ ...formData, goal_quantity: e.target.value })}
                placeholder="e.g., 2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal_amount">Estimated Cost ($)</Label>
              <Input
                id="goal_amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.goal_amount}
                onChange={(e) => setFormData({ ...formData, goal_amount: e.target.value })}
                placeholder="e.g., 25.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serves_per_unit">Servings Per Unit</Label>
            <Input
              id="serves_per_unit"
              type="number"
              min="1"
              value={formData.serves_per_unit}
              onChange={(e) => setFormData({ ...formData, serves_per_unit: e.target.value })}
              placeholder="e.g., 8"
            />
          </div>

          <div className="space-y-2">
            <Label>Dietary Information</Label>
            <div className="flex flex-wrap gap-2">
              {DIETARY_TAGS.map((tag) => (
                <Button
                  key={tag}
                  type="button"
                  variant={formData.dietary_tags.includes(tag) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleDietaryTag(tag)}
                  className="text-xs"
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dietary_other">Other Dietary Notes</Label>
            <Input
              id="dietary_other"
              value={formData.dietary_other}
              onChange={(e) => setFormData({ ...formData, dietary_other: e.target.value })}
              placeholder="e.g., contains shellfish"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};