import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { itemClaimSchema } from "@/lib/formValidation";
import { sanitizeName, sanitizeLongText } from "@/lib/sanitization";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Plus, X, UtensilsCrossed, Wine, Sparkles, Package } from "lucide-react";

interface Item {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  notes: string | null;
  claimed_by: string | null;
  claimed_by_name: string | null;
  is_host_provided: boolean;
  is_guest_added: boolean;
}

interface ItemClaimListProps {
  eventId: string;
  allowGuestItems: boolean;
}

export const ItemClaimList = ({ eventId, allowGuestItems }: ItemClaimListProps) => {
  const { toast } = useToast();
  const { verifyRecaptcha } = useRecaptcha();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'claimed'>('all');
  const [guestName, setGuestName] = useState("");
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("");
  const [newItemNotes, setNewItemNotes] = useState("");
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check for saved guest info
    const savedName = localStorage.getItem(`guest_name_${eventId}`);
    const savedToken = localStorage.getItem(`guest_token_${eventId}`);
    if (savedName) setGuestName(savedName);
    if (savedToken) setGuestToken(savedToken);

    loadItems();

    // Real-time subscription
    const channel = supabase
      .channel(`items-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_items',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          loadItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const loadItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('event_items')
      .select('*')
      .eq('event_id', eventId)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load items",
        variant: "destructive"
      });
    } else {
      setItems(data as Item[] || []);
    }
    setLoading(false);
  };

  const handleClaim = async (itemId: string) => {
    const sanitizedName = sanitizeName(guestName);
    
    if (!sanitizedName) {
      toast({
        title: "Name Required",
        description: "Please enter your name to claim items",
        variant: "destructive"
      });
      return;
    }

    setClaimingItemId(itemId);

    try {
      // Verify reCAPTCHA
      const isHuman = await verifyRecaptcha('item_claim');
      if (!isHuman) {
        setClaimingItemId(null);
        return;
      }
      // Generate token if not exists
      let token = guestToken;
      if (!token) {
        token = crypto.randomUUID();
        setGuestToken(token);
        localStorage.setItem(`guest_token_${eventId}`, token);
      }

      // Save guest name
      localStorage.setItem(`guest_name_${eventId}`, guestName);

      // Attempt to claim the item
      const { data: item, error: fetchError } = await supabase
        .from('event_items')
        .select('*')
        .eq('id', itemId)
        .single();

      if (fetchError) throw fetchError;

      // Check if already claimed
      if (item.claimed_by && item.claimed_by !== token) {
        toast({
          title: "Already Claimed",
          description: `This item was just claimed by ${item.claimed_by_name}`,
          variant: "destructive"
        });
        loadItems();
        return;
      }

      // Claim the item
      const { error } = await supabase
        .from('event_items')
        .update({
          claimed_by: token,
          claimed_by_name: sanitizedName
        })
        .eq('id', itemId)
        .is('claimed_by', null);

      if (error) {
        if (error.message.includes('violates')) {
          toast({
            title: "Already Claimed",
            description: "Someone just claimed this item",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Item Claimed! ✓",
          description: `You've claimed ${item.name}`,
        });
      }

      loadItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to claim item",
        variant: "destructive"
      });
    } finally {
      setClaimingItemId(null);
    }
  };

  const handleUnclaim = async (itemId: string) => {
    if (!guestToken) return;

    try {
      const { error } = await supabase
        .from('event_items')
        .update({
          claimed_by: null,
          claimed_by_name: null
        })
        .eq('id', itemId)
        .eq('claimed_by', guestToken);

      if (error) throw error;

      toast({
        title: "Item Unclaimed",
        description: "Item is now available for others"
      });

      loadItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unclaim item",
        variant: "destructive"
      });
    }
  };

  const handleAddItem = async () => {
    setValidationErrors({});
    
    // Sanitize inputs
    const sanitizedData = {
      itemName: sanitizeLongText(newItemName, 200),
      category: newItemCategory.trim(),
      notes: sanitizeLongText(newItemNotes, 1000),
      guestName: sanitizeName(guestName),
    };

    // Validate
    try {
      itemClaimSchema.parse(sanitizedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setValidationErrors(errors);
        toast({
          title: "Validation Error",
          description: "Please check your input and try again",
          variant: "destructive"
        });
        return;
      }
    }

    if (!sanitizedData.itemName || !sanitizedData.guestName) {
      toast({
        title: "Missing Information",
        description: "Please enter your name and item name",
        variant: "destructive"
      });
      return;
    }

    try {
      // Verify reCAPTCHA
      const isHuman = await verifyRecaptcha('item_add');
      if (!isHuman) {
        return;
      }
      let token = guestToken;
      if (!token) {
        token = crypto.randomUUID();
        setGuestToken(token);
        localStorage.setItem(`guest_token_${eventId}`, token);
      }

      localStorage.setItem(`guest_name_${eventId}`, guestName);

      const { error } = await supabase
        .from('event_items')
        .insert({
          event_id: eventId,
          name: sanitizedData.itemName,
          category: sanitizedData.category || null,
          notes: sanitizedData.notes || null,
          quantity: 1,
          is_guest_added: true,
          claimed_by: token,
          claimed_by_name: sanitizedData.guestName
        });

      if (error) throw error;

      toast({
        title: "Item Added! ✓",
        description: `You've added and claimed ${sanitizedData.itemName}`
      });

      setNewItemName("");
      setNewItemCategory("");
      setNewItemNotes("");
      setAddDialogOpen(false);
      loadItems();
    } catch (error: any) {
      console.error('Item add error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add item. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getCategoryIcon = (category: string | null) => {
    switch (category?.toLowerCase()) {
      case 'food':
        return <UtensilsCrossed className="h-4 w-4" />;
      case 'drinks':
        return <Wine className="h-4 w-4" />;
      case 'decor':
        return <Sparkles className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const filteredItems = items.filter(item => {
    if (filter === 'available') return !item.claimed_by && !item.is_host_provided;
    if (filter === 'claimed') return !!item.claimed_by;
    return true;
  });

  const myItems = items.filter(item => item.claimed_by === guestToken);
  const stats = {
    total: items.filter(i => !i.is_host_provided).length,
    claimed: items.filter(i => i.claimed_by).length,
    available: items.filter(i => !i.claimed_by && !i.is_host_provided).length
  };

  return (
    <div className="space-y-6">
      {/* Header with Name Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            What Can You Bring?
          </CardTitle>
          <CardDescription>
            Claim items you'd like to bring to help out the host
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guest-name">Your Name</Label>
            <Input
              id="guest-name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Enter your name to claim items"
              maxLength={100}
            />
            {validationErrors.guestName && (
              <p className="text-sm text-destructive">{validationErrors.guestName}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{stats.claimed}</div>
              <div className="text-sm text-muted-foreground">Claimed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{stats.available}</div>
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Claimed Items */}
      {myItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Items</CardTitle>
            <CardDescription>Items you've claimed to bring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {myItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    {getCategoryIcon(item.category)}
                    <div>
                      <p className="font-medium">{item.name}</p>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground">{item.notes}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnclaim(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Add Button */}
      <div className="flex items-center gap-3">
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter items" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Items</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="claimed">Claimed</SelectItem>
          </SelectContent>
        </Select>

        {allowGuestItems && (
          <Button onClick={() => setAddDialogOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        )}
      </div>

      {/* Items List */}
      <div className="grid gap-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading items...</div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No items to display
            </CardContent>
          </Card>
        ) : (
          filteredItems.map(item => {
            const isClaimed = !!item.claimed_by;
            const isMyItem = item.claimed_by === guestToken;
            const isHostProvided = item.is_host_provided;

            return (
              <Card key={item.id} className={isClaimed ? "opacity-75" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getCategoryIcon(item.category)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{item.name}</h4>
                          {item.category && (
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                          )}
                          {item.is_guest_added && (
                            <Badge variant="secondary" className="text-xs">
                              Guest Added
                            </Badge>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                        )}
                        {item.quantity > 1 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Quantity: {item.quantity}
                          </p>
                        )}
                        {isClaimed && (
                          <div className="flex items-center gap-1 mt-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-green-600 font-medium">
                              Claimed by {isMyItem ? 'You' : item.claimed_by_name}
                            </span>
                          </div>
                        )}
                        {isHostProvided && (
                          <Badge variant="default" className="mt-2">
                            Host Provided
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      {!isHostProvided && !isClaimed && (
                        <Button
                          onClick={() => handleClaim(item.id)}
                          disabled={!guestName.trim() || claimingItemId === item.id}
                          size="sm"
                        >
                          {claimingItemId === item.id ? "Claiming..." : "Claim"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Item Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>
              Suggest an item you'd like to bring
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">Item Name *</Label>
              <Input
                id="item-name"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="e.g., Fruit Salad"
                maxLength={200}
              />
              {validationErrors.itemName && (
                <p className="text-sm text-destructive">{validationErrors.itemName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-category">Category</Label>
              <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="drinks">Drinks</SelectItem>
                  <SelectItem value="decor">Decor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-notes">Notes (optional)</Label>
              <Textarea
                id="item-notes"
                value={newItemNotes}
                onChange={(e) => setNewItemNotes(e.target.value)}
                placeholder="Any details like serving size, dietary info, etc."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem}>Add & Claim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};