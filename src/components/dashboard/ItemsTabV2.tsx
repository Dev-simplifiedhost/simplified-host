import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Plus, Edit, Trash2, DollarSign, Package, Lightbulb, ShoppingCart, Home, Calendar, UtensilsCrossed, Sparkles, PartyPopper, Wrench, Settings2, MoreHorizontal, Clock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SuggestedItemsTab } from "./SuggestedItemsTab";
import { PaymentHistoryTab } from "./PaymentHistoryTab";
import { GroceryListTab } from "./GroceryListTab";
import { AddItemDialog } from "./AddItemDialog";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { formatDistanceToNow } from "date-fns";

interface ItemClaim {
  id: string;
  claim_type: string;
  quantity_claimed: number | null;
  amount_contributed: number | null;
  contributor_name: string;
  contributor_email: string | null;
  payment_verified: boolean;
  created_at: string;
}

interface Item {
  id: string;
  name: string;
  category: string;
  notes?: string;
  goal_type: string;
  goal_quantity: number | null;
  goal_amount: number | null;
  current_quantity: number;
  current_amount: number;
  fulfillment_status: string;
  is_host_provided: boolean;
  is_suggested: boolean;
  serves_per_unit: number | null;
  item_claims?: ItemClaim[];
  updated_at?: string;
  link_url?: string;
  dietary_tags?: string[];
  dietary_other?: string;
}

export const ItemsTabV2 = ({ eventId, eventName, expectedGuestCount, openAddItemDialog = false, onAddItemDialogClose, contributionsEnabled = false, contributionGoal = 0 }: { 
  eventId: string;
  eventName?: string;
  expectedGuestCount?: number;
  openAddItemDialog?: boolean;
  onAddItemDialogClose?: () => void;
  contributionsEnabled?: boolean;
  contributionGoal?: number;
}) => {
  const [items, setItems] = useState<Item[]>([]);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editConfirmDialogOpen, setEditConfirmDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  const [activeSubTab, setActiveSubTab] = useState("items");
  const [suggestionCount, setSuggestionCount] = useState(0);
  const [paymentCount, setPaymentCount] = useState(0);
  const [hasGroceryList, setHasGroceryList] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadItems();
    loadCounts();

    const itemsChannel = supabase
      .channel(`items-v2-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_items', filter: `event_id=eq.${eventId}` }, loadItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_claims', filter: `event_id=eq.${eventId}` }, () => {
        loadItems();
        loadCounts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_suggestions', filter: `event_id=eq.${eventId}` }, loadCounts)
      .subscribe();

    return () => { supabase.removeChannel(itemsChannel); };
  }, [eventId]);

  useEffect(() => {
    if (openAddItemDialog) {
      setIsAddItemOpen(true);
      setActiveSubTab("items");
      if (onAddItemDialogClose) {
        onAddItemDialogClose();
      }
    }
  }, [openAddItemDialog, onAddItemDialogClose]);

  const loadCounts = async () => {
    const { count: suggestionsCount } = await supabase
      .from('item_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'pending');
    
    setSuggestionCount(suggestionsCount || 0);

    const { count: paymentsCount } = await supabase
      .from('item_claims')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('claim_type', 'monetary')
      .eq('payment_verified', false);
    
    setPaymentCount(paymentsCount || 0);

    const { data: groceryData } = await supabase
      .from('grocery_lists')
      .select('id')
      .eq('event_id', eventId)
      .single();
    
    setHasGroceryList(!!groceryData);
  };

  const loadItems = async () => {
    const { data, error } = await supabase
      .from('event_items')
      .select(`*, item_claims(*)`)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error Loading Items", description: error.message, variant: "destructive" });
    } else {
      setItems((data as any) || []);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    
    const itemName = items.find(i => i.id === itemToDelete)?.name;
    
    const { error } = await supabase.from('event_items').delete().eq('id', itemToDelete);
    if (error) {
      toast({ title: "Error Deleting Item", description: error.message, variant: "destructive" });
    } else {
      toast({ 
        title: "Item Deleted",
        description: eventName && itemName ? `"${itemName}" was removed from ${eventName}` : "Item was removed",
      });
      loadItems();
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleConfirmEdit = () => {
    if (!itemToEdit) return;
    setEditingItem(itemToEdit);
    setEditConfirmDialogOpen(false);
    setItemToEdit(null);
  };

  const getFulfillmentColor = (status: string) => {
    switch (status) {
      case 'fulfilled': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'partial': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase();
    const iconProps = { className: "h-4 w-4" };
    
    switch (categoryLower) {
      case 'food_drinks':
      case 'appetizer':
      case 'main':
      case 'side':
      case 'dessert':
      case 'drink':
        return <UtensilsCrossed {...iconProps} />;
      case 'tableware':
      case 'supplies':
        return <Package {...iconProps} />;
      case 'decor':
        return <Sparkles {...iconProps} />;
      case 'activities':
        return <PartyPopper {...iconProps} />;
      case 'setup_cleanup':
        return <Wrench {...iconProps} />;
      case 'equipment':
        return <Settings2 {...iconProps} />;
      default:
        return <MoreHorizontal {...iconProps} />;
    }
  };

  const formatCategoryName = (category: string) => {
    const categoryLabels: Record<string, string> = {
      'food_drinks': 'Food & Drinks',
      'tableware': 'Tableware & Serving',
      'decor': 'Decor',
      'activities': 'Activities & Entertainment',
      'setup_cleanup': 'Setup & Cleanup',
      'equipment': 'Equipment',
      'other': 'Other',
      // Legacy categories
      'appetizer': 'Appetizer',
      'main': 'Main',
      'side': 'Side',
      'dessert': 'Dessert',
      'drink': 'Drink',
      'supplies': 'Supplies',
      'misc': 'Misc',
    };
    return categoryLabels[category.toLowerCase()] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  const renderItemCard = (item: Item) => {
    const quantityProgress = item.goal_quantity ? (item.current_quantity / item.goal_quantity) * 100 : 0;
    const moneyProgress = item.goal_amount ? (item.current_amount / item.goal_amount) * 100 : 0;
    const showQuantity = !item.goal_type || item.goal_type === 'quantity' || item.goal_type === 'both';
    const showMoney = item.goal_type === 'monetary' || item.goal_type === 'both';

    const isRecentlyUpdated = item.updated_at && 
      (new Date().getTime() - new Date(item.updated_at).getTime()) < 24 * 60 * 60 * 1000;

    return (
      <Card key={item.id}>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
                {item.name}
                <Badge className={getFulfillmentColor(item.fulfillment_status)}>
                  {item.fulfillment_status}
                </Badge>
                {item.is_suggested && (
                  <Badge variant="outline" className="gap-1 bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800">
                    <Lightbulb className="h-3 w-3" />
                    Guest Suggestion
                  </Badge>
                )}
                {item.is_host_provided && (
                  <Badge variant="secondary">Host Provided</Badge>
                )}
                {item.link_url && (
                  <Badge variant="outline" className="gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Linked
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                {getCategoryIcon(item.category)}
                <span>{formatCategoryName(item.category)}</span>
                {isRecentlyUpdated && (
                  <span className="flex items-center gap-1 text-xs">
                    <Clock className="h-3 w-3" />
                    Updated {formatDistanceToNow(new Date(item.updated_at!), { addSuffix: true })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (item.item_claims && item.item_claims.length > 0) {
                    setItemToEdit(item);
                    setEditConfirmDialogOpen(true);
                  } else {
                    setEditingItem(item);
                  }
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setItemToDelete(item.id);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {showQuantity && item.goal_quantity && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Quantity</span>
                  <span>{item.current_quantity}/{item.goal_quantity}</span>
                </div>
                <Progress value={quantityProgress} className="h-2" />
              </div>
            )}
            
            {showMoney && item.goal_amount && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Cost-Sharing Goal</span>
                  <span>${item.current_amount?.toFixed(2) || '0.00'}/${item.goal_amount?.toFixed(2)}</span>
                </div>
                <Progress value={moneyProgress} className="h-2" />
              </div>
            )}

            {item.notes && (
              <p className="text-sm text-muted-foreground">{item.notes}</p>
            )}

            {item.dietary_tags && item.dietary_tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.dietary_tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag.replace('_', '-')}
                  </Badge>
                ))}
              </div>
            )}

            {item.item_claims && item.item_claims.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <p className="text-sm font-medium mb-2">Claims ({item.item_claims.length})</p>
                <div className="space-y-1">
                  {item.item_claims.slice(0, 3).map(claim => (
                    <div key={claim.id} className="flex justify-between items-center text-sm">
                      <span>{claim.contributor_name}</span>
                      <div className="flex items-center gap-2">
                        {claim.claim_type === 'monetary' ? (
                          <span>${claim.amount_contributed?.toFixed(2)}</span>
                        ) : (
                          <span>×{claim.quantity_claimed}</span>
                        )}
                        {claim.claim_type === 'monetary' && (
                          <Badge variant={claim.payment_verified ? "default" : "secondary"} className="text-xs">
                            {claim.payment_verified ? "Verified" : "Pending"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {item.item_claims.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{item.item_claims.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Breadcrumb className="text-xs">
        <BreadcrumbList className="text-xs">
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard" className="flex items-center gap-1 text-xs">
              <Home className="h-3 w-3" />
              Dashboard
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard" className="flex items-center gap-1 text-xs">
              <Calendar className="h-3 w-3" />
              Events
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs">Items & Contributions</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Items & Contributions</h2>
          <p className="text-sm text-muted-foreground">Manage Items, Suggestions, And Payment Verification</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card 
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setActiveSubTab("items")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-3">
            <CardTitle className="text-xs font-medium">Total Items</CardTitle>
            <Package className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-1">
            <div className="text-xl font-bold">
              {items.filter(i => i.fulfillment_status === 'fulfilled').length}/{items.length} Items
            </div>
            <p className="text-[10px] text-muted-foreground">Fulfilled</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setActiveSubTab("payments")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-3">
            <CardTitle className="text-xs font-medium">Pending Payments</CardTitle>
            <DollarSign className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-1">
            <div className="text-xl font-bold">{paymentCount}</div>
            <p className="text-[10px] text-muted-foreground">Awaiting Verification</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-colors hover:bg-accent/50"
          onClick={() => setActiveSubTab("grocery")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 px-4 pt-3">
            <CardTitle className="text-xs font-medium">Grocery List</CardTitle>
            <ShoppingCart className="h-3 w-3 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-1">
            <div className="text-xl font-bold">{hasGroceryList ? 'Ready' : 'Not Created'}</div>
            <p className="text-[10px] text-muted-foreground">
              {hasGroceryList ? 'View In Grocery Tab' : 'Generate From Items'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="items" className="gap-2">
            <Package className="w-4 h-4" />
            Items
            {items.length > 0 && (
              <Badge variant="secondary" className="ml-1">{items.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="grocery" className="gap-2">
            <ShoppingCart className="w-4 h-4" />
            Grocery List
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2">
            <Lightbulb className="w-4 h-4" />
            Suggestions
            {suggestionCount > 0 && (
              <Badge variant="secondary" className="ml-1">{suggestionCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <DollarSign className="w-4 h-4" />
            Payments
            {paymentCount > 0 && (
              <Badge variant="secondary" className="ml-1">{paymentCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setIsAddItemOpen(true)} className="h-12 gap-2">
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>

          <div className="grid gap-4">
            {items.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="text-muted-foreground">No Items Yet. Click "Add Item" To Get Started.</p>
                </CardContent>
              </Card>
            ) : (
              items.map(renderItemCard)
            )}
          </div>
        </TabsContent>

        <TabsContent value="grocery" className="space-y-6">
          <GroceryListTab eventId={eventId} />
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-6">
          <SuggestedItemsTab eventId={eventId} />
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <PaymentHistoryTab eventId={eventId} />
        </TabsContent>
      </Tabs>

      {/* New Add/Edit Item Dialog */}
      <AddItemDialog
        open={isAddItemOpen || !!editingItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddItemOpen(false);
            setEditingItem(null);
          }
        }}
        eventId={eventId}
        eventName={eventName}
        expectedGuestCount={expectedGuestCount}
        editingItem={editingItem}
        onSuccess={loadItems}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone and will remove all associated claims.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Confirmation Dialog (when item has claims) */}
      <AlertDialog open={editConfirmDialogOpen} onOpenChange={setEditConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to edit this item? Any changes will be visible to all guests immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToEdit(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEdit}>
              Continue to Edit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
