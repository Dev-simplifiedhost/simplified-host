import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Check, X, DollarSign, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const itemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  quantity: z.number().min(1).max(1000),
  category: z.string().max(50),
  notes: z.string().max(500).optional(),
});

const contributionSchema = z.object({
  contributor_name: z.string().trim().min(1, "Name is required").max(100),
  amount: z.number().min(0.01).max(999999),
  payment_method: z.string().max(50),
  note: z.string().max(200).optional(),
});

interface Item {
  id: string;
  name: string;
  quantity: number;
  category: string;
  notes?: string;
  is_host_provided: boolean;
  claimed_by?: string;
  claimed_by_name?: string;
  is_guest_added: boolean;
}

interface Contribution {
  id: string;
  contributor_name: string;
  amount: number;
  payment_method?: string;
  note?: string;
  created_at: string;
}

export const ItemsTab = ({ eventId, isHost }: { eventId: string; isHost: boolean }) => {
  const [items, setItems] = useState<Item[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isAddContributionOpen, setIsAddContributionOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Form states
  const [itemForm, setItemForm] = useState({
    name: "",
    quantity: 1,
    category: "food",
    notes: "",
  });

  const [contributionForm, setContributionForm] = useState({
    contributor_name: "",
    amount: "",
    payment_method: "venmo",
    note: "",
  });

  // Load items and contributions
  useEffect(() => {
    loadItems();
    loadContributions();

    // Set up realtime subscriptions with real-time notifications
    const itemsChannel = supabase
      .channel('event-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_items',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          loadItems();
          
          // Show notification for claims/unclaims if host
          if (isHost && payload.eventType === 'UPDATE') {
            const newData = payload.new as any;
            const oldData = payload.old as any;
            
            if (!oldData.claimed_by && newData.claimed_by) {
              toast({
                title: "Item Claimed",
                description: `${newData.claimed_by_name} claimed ${newData.name}`,
              });
            } else if (oldData.claimed_by && !newData.claimed_by) {
              toast({
                title: "Item Unclaimed",
                description: `${newData.name} is now available`,
              });
            }
          }
        }
      )
      .subscribe();

    const contributionsChannel = supabase
      .channel('contributions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contributions',
          filter: `event_id=eq.${eventId}`,
        },
        () => loadContributions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(contributionsChannel);
    };
  }, [eventId, isHost]);

  const loadItems = async () => {
    const { data, error } = await supabase
      .from('event_items')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) {
      toast({ title: "Error loading items", description: error.message, variant: "destructive" });
    } else {
      setItems(data || []);
    }
  };

  const loadContributions = async () => {
    const { data, error } = await supabase
      .from('contributions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error loading contributions", description: error.message, variant: "destructive" });
    } else {
      setContributions(data || []);
    }
  };

  const handleAddItem = async () => {
    try {
      const validated = itemSchema.parse(itemForm);
      
      // Check for duplicates
      const duplicate = items.find(item => item.name.toLowerCase() === validated.name.toLowerCase());
      if (duplicate) {
        toast({ 
          title: "Duplicate item", 
          description: "An item with this name already exists. Please edit the existing item instead.",
          variant: "destructive" 
        });
        return;
      }

      const { error } = await supabase.from('event_items').insert([{
        event_id: eventId,
        name: validated.name,
        quantity: validated.quantity,
        category: validated.category,
        notes: validated.notes,
        is_guest_added: !isHost,
      }]);

      if (error) throw error;

      toast({ title: "Item added successfully" });
      setIsAddItemOpen(false);
      setItemForm({ name: "", quantity: 1, category: "food", notes: "" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Validation error", description: error.errors[0].message, variant: "destructive" });
      } else {
        toast({ title: "Error adding item", description: (error as Error).message, variant: "destructive" });
      }
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;

    try {
      const validated = itemSchema.parse({
        name: editingItem.name,
        quantity: editingItem.quantity,
        category: editingItem.category,
        notes: editingItem.notes,
      });

      const { error } = await supabase
        .from('event_items')
        .update(validated)
        .eq('id', editingItem.id);

      if (error) throw error;

      toast({ title: "Item updated successfully" });
      setEditingItem(null);
    } catch (error) {
      toast({ title: "Error updating item", description: (error as Error).message, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (itemId: string, isClaimed: boolean) => {
    if (isClaimed && !confirm("This item is claimed. Are you sure you want to delete it?")) {
      return;
    }

    const { error } = await supabase
      .from('event_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      toast({ title: "Error deleting item", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Item deleted successfully" });
    }
  };

  const handleClaimItem = async (itemId: string, userName: string = "Guest") => {
    const { error } = await supabase
      .from('event_items')
      .update({ 
        claimed_by: userName,
        claimed_by_name: userName 
      })
      .eq('id', itemId);

    if (error) {
      toast({ title: "Error claiming item", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Item claimed successfully" });
    }
  };

  const handleUnclaimItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to unclaim this item?")) return;

    const { error } = await supabase
      .from('event_items')
      .update({ claimed_by: null, claimed_by_name: null })
      .eq('id', itemId);

    if (error) {
      toast({ title: "Error unclaiming item", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Item unclaimed successfully" });
    }
  };

  const handleToggleHostProvided = async (itemId: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('event_items')
      .update({ is_host_provided: !currentValue })
      .eq('id', itemId);

    if (error) {
      toast({ title: "Error updating item", description: error.message, variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Delete ${selectedItems.size} selected items?`)) return;

    const { error } = await supabase
      .from('event_items')
      .delete()
      .in('id', Array.from(selectedItems));

    if (error) {
      toast({ title: "Error deleting items", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${selectedItems.size} items deleted successfully` });
      setSelectedItems(new Set());
    }
  };

  const handleAddContribution = async () => {
    try {
      const validated = contributionSchema.parse({
        ...contributionForm,
        amount: parseFloat(contributionForm.amount),
      });

      const { error } = await supabase.from('contributions').insert([{
        event_id: eventId,
        contributor_name: validated.contributor_name,
        amount: validated.amount,
        payment_method: validated.payment_method,
        note: validated.note,
      }]);

      if (error) throw error;

      toast({ title: "Contribution added successfully" });
      setIsAddContributionOpen(false);
      setContributionForm({ contributor_name: "", amount: "", payment_method: "venmo", note: "" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Validation error", description: error.errors[0].message, variant: "destructive" });
      } else {
        toast({ title: "Error adding contribution", description: (error as Error).message, variant: "destructive" });
      }
    }
  };

  const totalContributions = contributions.reduce((sum, c) => sum + Number(c.amount), 0);
  const claimedCount = items.filter(i => i.claimed_by || i.is_host_provided).length;
  const unclaimedCount = items.filter(i => !i.claimed_by && !i.is_host_provided).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground">
              {items.filter(i => !i.is_host_provided).length} guest items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Claimed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{claimedCount}</div>
            <p className="text-xs text-muted-foreground">
              {claimedCount > 0 ? `${Math.round((claimedCount / Math.max(items.filter(i => !i.is_host_provided).length, 1)) * 100)}%` : '0%'} coverage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unclaimedCount}</div>
            <p className="text-xs text-muted-foreground">
              Still needed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalContributions.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {contributions.length} contributors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Item</DialogTitle>
                  <DialogDescription>Add an item for your event</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name</Label>
                    <Input
                      value={itemForm.name}
                      onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                      placeholder="e.g., Potato Salad"
                      maxLength={100}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={itemForm.quantity}
                        onChange={(e) => setItemForm({ ...itemForm, quantity: parseInt(e.target.value) || 1 })}
                        min={1}
                        max={1000}
                      />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select value={itemForm.category} onValueChange={(value) => setItemForm({ ...itemForm, category: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="food">Food</SelectItem>
                          <SelectItem value="drink">Drink</SelectItem>
                          <SelectItem value="decor">Décor</SelectItem>
                          <SelectItem value="supplies">Supplies</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Notes (optional)</Label>
                    <Textarea
                      value={itemForm.notes}
                      onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                      placeholder="Any additional details..."
                      maxLength={500}
                    />
                  </div>
                  <Button onClick={handleAddItem} className="w-full">Add Item</Button>
                </div>
              </DialogContent>
            </Dialog>

            {isHost && selectedItems.size > 0 && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedItems.size})
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="contributions">Contributions</TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4">
          {items.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <p className="text-muted-foreground mb-4">No items yet</p>
                <Button onClick={() => setIsAddItemOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add First Item
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((item) => (
                <Card key={item.id} className={item.is_host_provided ? "border-primary/50" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          {isHost && (
                            <input
                              type="checkbox"
                              checked={selectedItems.has(item.id)}
                              onChange={(e) => {
                                const newSet = new Set(selectedItems);
                                if (e.target.checked) {
                                  newSet.add(item.id);
                                } else {
                                  newSet.delete(item.id);
                                }
                                setSelectedItems(newSet);
                              }}
                              className="mr-2"
                            />
                          )}
                          {item.name}
                        </CardTitle>
                        <CardDescription>
                          {item.quantity}x • {item.category}
                          {item.is_guest_added && <Badge variant="outline" className="ml-2">Guest Added</Badge>}
                        </CardDescription>
                      </div>
                      {isHost && (
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingItem(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(item.id, !!item.claimed_by)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground mb-3">{item.notes}</p>
                    )}
                    
                    {item.is_host_provided ? (
                      <Badge variant="secondary" className="w-full justify-center">
                        Host Provided
                      </Badge>
                    ) : item.claimed_by ? (
                      <div className="space-y-2">
                        <Badge variant="default" className="w-full justify-center">
                          <Check className="mr-1 h-3 w-3" />
                          Claimed by {item.claimed_by_name}
                        </Badge>
                        {!isHost && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleUnclaimItem(item.id)}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Unclaim
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {!isHost && (
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              const name = prompt("Enter your name:");
                              if (name) handleClaimItem(item.id, name);
                            }}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Claim
                          </Button>
                        )}
                        {isHost && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleToggleHostProvided(item.id, item.is_host_provided)}
                          >
                            Mark as Host Provided
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Contributions Tab */}
        <TabsContent value="contributions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Financial Contributions</CardTitle>
                  <CardDescription>Track monetary support for the event</CardDescription>
                </div>
                <Dialog open={isAddContributionOpen} onOpenChange={setIsAddContributionOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <DollarSign className="mr-2 h-4 w-4" />
                      Add Contribution
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Contribution</DialogTitle>
                      <DialogDescription>Record a financial contribution</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Your Name</Label>
                        <Input
                          value={contributionForm.contributor_name}
                          onChange={(e) => setContributionForm({ ...contributionForm, contributor_name: e.target.value })}
                          placeholder="Enter your name"
                          maxLength={100}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Amount</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={contributionForm.amount}
                            onChange={(e) => setContributionForm({ ...contributionForm, amount: e.target.value })}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label>Payment Method</Label>
                          <Select 
                            value={contributionForm.payment_method} 
                            onValueChange={(value) => setContributionForm({ ...contributionForm, payment_method: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="venmo">Venmo</SelectItem>
                              <SelectItem value="zelle">Zelle</SelectItem>
                              <SelectItem value="cashapp">Cash App</SelectItem>
                              <SelectItem value="paypal">PayPal</SelectItem>
                              <SelectItem value="cash">Cash</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label>Note (optional)</Label>
                        <Input
                          value={contributionForm.note}
                          onChange={(e) => setContributionForm({ ...contributionForm, note: e.target.value })}
                          placeholder="e.g., for decorations"
                          maxLength={200}
                        />
                      </div>
                      <Button onClick={handleAddContribution} className="w-full">
                        Add Contribution
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {contributions.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-4">No contributions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contributions.map((contribution) => (
                    <div
                      key={contribution.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{contribution.contributor_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {contribution.payment_method}
                          {contribution.note && ` • ${contribution.note}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">${Number(contribution.amount).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(contribution.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  maxLength={100}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 1 })}
                    min={1}
                    max={1000}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select 
                    value={editingItem.category} 
                    onValueChange={(value) => setEditingItem({ ...editingItem, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="food">Food</SelectItem>
                      <SelectItem value="drink">Drink</SelectItem>
                      <SelectItem value="decor">Décor</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editingItem.notes || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  maxLength={500}
                />
              </div>
              <Button onClick={handleUpdateItem} className="w-full">
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
