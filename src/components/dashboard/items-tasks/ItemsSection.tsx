import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ChevronUp, Lightbulb, DollarSign, Pencil, Sparkles, Package, CheckSquare, X, Trash2, User } from "lucide-react";
import { ItemCategoryPanel, ITEM_CATEGORIES } from "./ItemCategoryPanel";
import { ItemData } from "./ItemTile";
import { AddItemDialog } from "../AddItemDialog";
import { SuggestedItemsCard } from "./SuggestedItemsCard";
import { cn } from "@/lib/utils";
import { suggestCategory } from "@/lib/itemAiAssist";
import PlanWithClickDialog from "@/components/plan-with-click/PlanWithClickDialog";
interface ItemsSectionProps {
  eventId: string;
  eventName: string;
  eventDate: string | null;
  eventLocation?: string;
  contributionsEnabled: boolean;
  expectedGuestCount: number;
  onViewSuggestions: () => void;
  onViewPayments: () => void;
  suggestionCount: number;
  paymentCount: number;
  onShareEvent?: () => void;
}
export const ItemsSection = ({
  eventId,
  eventName,
  eventDate,
  eventLocation = "",
  contributionsEnabled,
  expectedGuestCount,
  onViewSuggestions,
  onViewPayments,
  suggestionCount,
  paymentCount,
  onShareEvent
}: ItemsSectionProps) => {
  const {
    toast
  } = useToast();
  const [items, setItems] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [pwacDialogOpen, setPwacDialogOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    loadItems();
    const channel = supabase.channel(`items-section-${eventId}`).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'event_items',
      filter: `event_id=eq.${eventId}`
    }, loadItems).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'item_claims',
      filter: `event_id=eq.${eventId}`
    }, loadItems).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, {
      passive: true
    });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  const loadItems = async () => {
    setLoading(true);
    const {
      data,
      error
    } = await supabase.from('event_items').select('*, item_claims(*)').eq('event_id', eventId).order('created_at', {
      ascending: false
    });
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load items",
        variant: "destructive"
      });
    } else {
      setItems(data as any || []);
    }
    setLoading(false);
  };
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };
  const handleAddItem = (category?: string) => {
    setSelectedCategory(category || "");
    setEditingItem(null);
    setAddItemOpen(true);
  };
  const handleEditItem = (item: ItemData) => {
    setEditingItem(item);
    setSelectedCategory(item.category);
    setAddItemOpen(true);
  };

  // Quick-add suggested item with smart defaults (frictionless one-tap)
  const handleQuickAddItem = async (itemName: string) => {
    // Auto-detect category using AI heuristics and map to valid DB categories
    const categorySuggestion = suggestCategory(itemName);

    // Map new category system to legacy DB categories
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
    const {
      data,
      error
    } = await supabase.from('event_items').insert({
      event_id: eventId,
      name: itemName,
      category: dbCategory,
      goal_type: 'quantity',
      goal_quantity: 1,
      quantity: 1,
      current_quantity: 0,
      fulfillment_status: 'unfulfilled'
    }).select().single();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive"
      });
      return;
    }

    // Show toast with edit action
    toast({
      title: `"${itemName}" added`,
      description: "Qty: 1 • Tap Edit to change",
      action: <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => {
        if (data) {
          handleEditItem(data as ItemData);
        }
      }}>
          <Pencil className="h-3 w-3" />
          Edit
        </Button>,
      duration: 5000
    });
    loadItems();
  };
  const handleJumpToCategory = (categoryId: string) => {
    const ref = categoryRefs.current[categoryId];
    if (ref) {
      ref.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      // Auto-expand the category
      setExpandedCategories(prev => new Set([...prev, categoryId]));
    }
  };
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Bulk selection handlers
  const handleItemSelect = (id: string, checked: boolean) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    const { error } = await supabase
      .from('event_items')
      .delete()
      .in('id', Array.from(selectedItems));
    
    if (error) {
      toast({ title: "Error", description: "Failed to delete items", variant: "destructive" });
    } else {
      toast({ title: `${selectedItems.size} items deleted` });
      setSelectedItems(new Set());
      setBulkMode(false);
      loadItems();
    }
  };

  const handleBulkHostProvided = async () => {
    if (selectedItems.size === 0) return;
    
    const { error } = await supabase
      .from('event_items')
      .update({ is_host_provided: true })
      .in('id', Array.from(selectedItems));
    
    if (error) {
      toast({ title: "Error", description: "Failed to update items", variant: "destructive" });
    } else {
      toast({ title: `${selectedItems.size} items marked as host provided` });
      setSelectedItems(new Set());
      setBulkMode(false);
      loadItems();
    }
  };

  const handleBulkConvertToNormal = async () => {
    if (selectedItems.size === 0) return;
    
    const { error } = await supabase
      .from('event_items')
      .update({ is_suggested: false })
      .in('id', Array.from(selectedItems));
    
    if (error) {
      toast({ title: "Error", description: "Failed to convert items", variant: "destructive" });
    } else {
      toast({ title: `${selectedItems.size} items converted to standard` });
      setSelectedItems(new Set());
      setBulkMode(false);
      loadItems();
    }
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedItems(new Set());
  };

  // Filter items based on status and source filters
  const filteredItems = items.filter(item => {
    // Status filter - "unclaimed" replaces "available"
    if (statusFilter === "unclaimed" && (item.fulfillment_status !== 'unfulfilled' || item.is_host_provided)) return false;
    if (statusFilter === "partial" && item.fulfillment_status !== 'partial') return false;
    if (statusFilter === "covered" && item.fulfillment_status !== 'fulfilled' && !item.is_host_provided) return false;

    // Source filter
    if (sourceFilter === "host" && !item.is_host_provided) return false;
    if (sourceFilter === "guest" && !item.is_suggested) return false;
    if (sourceFilter === "standard" && (item.is_host_provided || item.is_suggested)) return false;
    return true;
  });

  // Group filtered items by category with suggested items pinned to top
  const itemsByCategory = ITEM_CATEGORIES.reduce((acc, cat) => {
    const categoryItems = filteredItems.filter(item => {
      const itemCat = item.category?.toLowerCase() || 'other';
      // Map legacy categories
      if (['appetizer', 'main', 'side', 'dessert', 'drink'].includes(itemCat)) {
        return cat.id === 'food_drinks';
      }
      if (itemCat === 'supplies') return cat.id === 'tableware';
      if (itemCat === 'misc') return cat.id === 'other';
      return itemCat === cat.id;
    });
    
    // Sort: suggested items first, then by created_at
    acc[cat.id] = categoryItems.sort((a, b) => {
      if (a.is_suggested && !b.is_suggested) return -1;
      if (!a.is_suggested && b.is_suggested) return 1;
      return 0;
    });
    
    return acc;
  }, {} as Record<string, ItemData[]>);

  // Stats from all items (not filtered)
  const totalItems = items.length;
  const fulfilledItems = items.filter(i => i.fulfillment_status === 'fulfilled' || i.is_host_provided).length;
  const availableCount = items.filter(i => i.fulfillment_status === 'unfulfilled' && !i.is_host_provided).length;
  const coveredCount = items.filter(i => i.fulfillment_status === 'fulfilled' || i.is_host_provided).length;
  const hostProvidedCount = items.filter(i => i.is_host_provided).length;
  const categoriesWithItems = ITEM_CATEGORIES.filter(cat => (itemsByCategory[cat.id]?.length || 0) > 0);
  return <div ref={containerRef} className="space-y-3">
      {/* Section Header - compact, responsive */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Items</h2>
        
        {/* Combined pill: guest-facing + coverage */}
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-foreground/75">
          Guest-facing • {coveredCount}/{totalItems} covered
        </span>
      </div>

      {/* Refine with AI entry - only show when items exist or event is active/archived */}
      {items.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPwacDialogOpen(true)}
            className="inline-flex items-center text-[11px] md:text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            <span className="md:hidden">Refine with AI</span>
            <span className="hidden md:inline">Refine items with AI</span>
          </button>
        
          {/* Contextual action buttons */}
          <div className="flex items-center gap-1.5">
            {suggestionCount > 0 && (
              <button
                type="button"
                onClick={onViewSuggestions}
                className="inline-flex items-center text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Lightbulb className="mr-1 h-3.5 w-3.5 text-yellow-500" />
                {suggestionCount}
              </button>
            )}
            {paymentCount > 0 && (
              <button
                type="button"
                onClick={onViewPayments}
                className="inline-flex items-center text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <DollarSign className="mr-1 h-3.5 w-3.5 text-green-500" />
                {paymentCount}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Sticky Controls Bar */}
      <div className="sticky top-0 z-10 bg-background py-2 -mx-4 px-4 border-b space-y-2">
        {/* Filter Chips - compact */}
        <div className="-mx-4 px-4 overflow-x-auto">
          <div className="flex items-center space-x-2 pb-1">
            <Badge 
              variant={statusFilter === "unclaimed" ? "default" : "outline"} 
              className={cn(
                "cursor-pointer whitespace-nowrap text-[11px] h-6 px-2",
                statusFilter !== "unclaimed" && "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
              )}
              onClick={() => setStatusFilter(statusFilter === "unclaimed" ? "all" : "unclaimed")}
            >
              Unclaimed ({availableCount})
            </Badge>
            <Badge 
              variant={statusFilter === "covered" ? "default" : "outline"} 
              className="cursor-pointer whitespace-nowrap text-[11px] h-6 px-2" 
              onClick={() => setStatusFilter(statusFilter === "covered" ? "all" : "covered")}
            >
              Covered ({coveredCount})
            </Badge>
            <Badge 
              variant={sourceFilter === "host" ? "default" : "outline"} 
              className="cursor-pointer whitespace-nowrap text-[11px] h-6 px-2" 
              onClick={() => setSourceFilter(sourceFilter === "host" ? "all" : "host")}
            >
              Host Provided ({hostProvidedCount})
            </Badge>
            {(statusFilter !== "all" || sourceFilter !== "all") && (
              <Badge 
                variant="secondary" 
                className="cursor-pointer whitespace-nowrap text-[11px] h-6 px-2" 
                onClick={() => {
                  setStatusFilter("all");
                  setSourceFilter("all");
                }}
              >
                Clear
              </Badge>
            )}
          </div>
        </div>

        {/* Jump to Category + Add Item - responsive stacking */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="sm:flex-1">
            <Select value="" onValueChange={handleJumpToCategory}>
              <SelectTrigger className="w-full sm:w-[180px] h-10">
                <SelectValue placeholder="Jump to category..." />
              </SelectTrigger>
              <SelectContent>
                {categoriesWithItems.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.label} ({itemsByCategory[cat.id]?.length || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={() => handleAddItem()} className="w-full sm:w-auto h-10" disabled={bulkMode}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
          
          <Button 
            variant={bulkMode ? "secondary" : "outline"} 
            onClick={() => bulkMode ? exitBulkMode() : setBulkMode(true)} 
            className="w-full sm:w-auto h-10"
          >
            {bulkMode ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <CheckSquare className="h-4 w-4 mr-2" />
                Select
              </>
            )}
          </Button>
        </div>
        
        {/* Bulk Actions Bar */}
        {bulkMode && selectedItems.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-muted rounded-lg border">
            <span className="text-sm font-medium">{selectedItems.size} selected</span>
            <div className="flex gap-2 ml-auto">
              <Button size="sm" variant="outline" onClick={handleBulkConvertToNormal}>
                Convert to Normal
              </Button>
              <Button size="sm" variant="outline" onClick={handleBulkHostProvided}>
                <User className="h-3.5 w-3.5 mr-1" />
                Host Provided
              </Button>
              <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Category Panels - ELEVATED above suggestions */}
      {loading ? <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Loading items...
          </CardContent>
        </Card> : items.length === 0 ? <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No items yet. Add items for guests to claim or contribute to.
            </p>
            <Button onClick={() => handleAddItem()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Item
            </Button>
          </CardContent>
        </Card> : <div className="space-y-3">
          {ITEM_CATEGORIES.map(category => {
        const categoryItems = itemsByCategory[category.id] || [];
        if (categoryItems.length === 0) return null;
        return <div key={category.id} ref={el => {
          categoryRefs.current[category.id] = el;
        }}>
                <ItemCategoryPanel 
                  category={category} 
                  items={categoryItems} 
                  isExpanded={expandedCategories.has(category.id)} 
                  onToggle={() => toggleCategory(category.id)} 
                  onItemClick={handleEditItem} 
                  onAddItem={handleAddItem}
                  selectable={bulkMode}
                  selectedItems={selectedItems}
                  onItemSelect={handleItemSelect}
                />
              </div>;
      })}
        </div>}
      
      {/* Rule-based Suggestions Card - BELOW items list */}
      <SuggestedItemsCard
        eventId={eventId}
        existingItems={items.map(i => ({ name: i.name, category: i.category || 'other' }))}
        guestCount={expectedGuestCount}
        eventTitle={eventName}
        eventLocation={eventLocation}
        onAddItem={handleQuickAddItem}
      />

      {/* Scroll to Top FAB */}
      <Button variant="secondary" size="icon" className={cn("fixed bottom-24 right-4 z-30 h-12 w-12 rounded-full shadow-lg transition-all duration-200 md:bottom-8", showScrollTop ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none")} onClick={scrollToTop}>
        <ChevronUp className="h-5 w-5" />
      </Button>

      {/* Add/Edit Item Dialog */}
      <AddItemDialog open={addItemOpen} onOpenChange={setAddItemOpen} eventId={eventId} eventName={eventName} expectedGuestCount={expectedGuestCount} editingItem={editingItem as any} existingItems={items.map(i => ({
      id: i.id,
      name: i.name
    }))} onEditExistingItem={itemId => {
      const item = items.find(i => i.id === itemId);
      if (item) handleEditItem(item);
    }} onSuccess={loadItems} />

      {/* PWAC Dialog */}
      <PlanWithClickDialog 
        open={pwacDialogOpen} 
        onOpenChange={setPwacDialogOpen}
        existingEvent={{
          id: eventId,
          name: eventName,
          date: eventDate,
          guestCount: expectedGuestCount,
          items: items.map(i => ({ name: i.name, category: i.category })),
          tasks: []
        }}
        onEventUpdated={loadItems}
      />
    </div>;
};