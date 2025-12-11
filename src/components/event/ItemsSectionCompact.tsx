import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight } from "lucide-react";
import { ItemsNeededInsight } from "./ItemsNeededInsight";
import { QuickSuggestInput } from "./QuickSuggestInput";
import { ItemListCompact } from "./ItemListCompact";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
  is_host_provided?: boolean;
  is_suggested?: boolean;
  link_url?: string;
  item_claims?: any[];
}

interface ItemsSectionCompactProps {
  eventId: string;
  sectionLabel?: 'bring_something' | 'registry_items' | 'wishlist';
  allowGuestItems?: boolean;
  contributionMethods?: any[];
  onSuggestionSubmitted?: () => void;
  eventDate?: string | null;
  goingCount?: number;
  isArchived?: boolean;
  showNeedsMostHint?: boolean;
}

const SECTION_LABELS = {
  bring_something: 'Bring Something',
  registry_items: 'Registry Items',
  wishlist: 'Wishlist',
};

// Simplified filter options
const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'claimed_by_me', label: 'Claimed by Me' },
];

// Category display order
const CATEGORY_ORDER = [
  'Food & Drinks',
  'Tableware',
  'Decor',
  'Equipment',
  'Activities',
  'Setup & Cleanup',
  'Other',
];

// Normalize category names for grouping
const normalizeCategory = (cat: string | null | undefined): string => {
  if (!cat) return 'Other';
  const lower = cat.toLowerCase().trim();
  
  if (['food', 'drinks', 'drink', 'beverage', 'beverages', 'food_drinks', 'food & drinks'].includes(lower)) return 'Food & Drinks';
  if (['tableware', 'supplies', 'plates', 'utensils'].includes(lower)) return 'Tableware';
  if (['decor', 'decoration', 'decorations'].includes(lower)) return 'Decor';
  if (['equipment', 'gear', 'tools'].includes(lower)) return 'Equipment';
  if (['activities', 'activity', 'games', 'entertainment'].includes(lower)) return 'Activities';
  if (['setup', 'cleanup', 'setup_cleanup', 'setup & cleanup'].includes(lower)) return 'Setup & Cleanup';
  if (['misc', 'miscellaneous', 'other'].includes(lower)) return 'Other';
  
  const properCased = CATEGORY_ORDER.find(c => c.toLowerCase() === lower);
  if (properCased) return properCased;
  
  return 'Other';
};

export const ItemsSectionCompact = ({
  eventId,
  sectionLabel = 'bring_something',
  allowGuestItems = true,
  contributionMethods = [],
  onSuggestionSubmitted,
  eventDate,
  goingCount = 0,
  isArchived = false,
  showNeedsMostHint = true,
}: ItemsSectionCompactProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [guestName, setGuestName] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showUnavailable, setShowUnavailable] = useState(false);

  useEffect(() => {
    loadItems();
    loadGuestInfo();

    const channel = supabase
      .channel(`items-compact-${eventId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'event_items', 
        filter: `event_id=eq.${eventId}` 
      }, loadItems)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'item_claims', 
        filter: `event_id=eq.${eventId}` 
      }, loadItems)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  const loadItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('event_items')
      .select(`*, item_claims(*)`)
      .eq('event_id', eventId)
      .order('category');

    if (!error && data) {
      setItems(data as Item[]);
    }
    setLoading(false);
  };

  const loadGuestInfo = async () => {
    const rsvpToken = localStorage.getItem(`rsvp_token_${eventId}`);
    if (rsvpToken) {
      const { data: rsvp } = await supabase
        .rpc('check_rsvp_status', {
          p_event_id: eventId,
          p_guest_token: rsvpToken
        })
        .maybeSingle();
      
      if (rsvp) {
        setGuestName(rsvp.guest_name);
      }
    }
  };

  const isItemAvailable = (item: Item): boolean => {
    if (item.is_host_provided) return false;
    if (item.goal_type === 'quantity' || item.goal_type === 'both') {
      const remaining = (item.goal_quantity || 1) - (item.current_quantity || 0);
      return remaining > 0;
    }
    return item.fulfillment_status !== 'fulfilled';
  };

  const isClaimedByMe = (item: Item): boolean => {
    if (!guestName || !item.item_claims?.length) return false;
    const normalizedName = guestName.trim().toLowerCase();
    return item.item_claims.some(claim => 
      claim.contributor_name?.trim().toLowerCase() === normalizedName
    );
  };

  // Filter items
  const filteredItems = useMemo(() => {
    let result = items;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(query)
      );
    }

    switch (activeFilter) {
      case 'available':
        result = result.filter(isItemAvailable);
        break;
      case 'claimed_by_me':
        result = result.filter(isClaimedByMe);
        break;
    }

    return result;
  }, [items, searchQuery, activeFilter, guestName]);

  // Separate available and unavailable items
  const { availableItems, unavailableItems, groupedAvailable } = useMemo(() => {
    const available: Item[] = [];
    const unavailable: Item[] = [];
    
    filteredItems.forEach(item => {
      if (isItemAvailable(item)) {
        available.push(item);
      } else {
        unavailable.push(item);
      }
    });

    // Group available items by category
    const groups: Record<string, Item[]> = {};
    available.forEach(item => {
      const category = normalizeCategory(item.category);
      if (!groups[category]) groups[category] = [];
      groups[category].push(item);
    });

    // Sort categories
    const sortedCategories = Object.keys(groups).sort((a, b) => {
      const indexA = CATEGORY_ORDER.indexOf(a);
      const indexB = CATEGORY_ORDER.indexOf(b);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return { 
      availableItems: available, 
      unavailableItems: unavailable,
      groupedAvailable: { groups, sortedCategories }
    };
  }, [filteredItems]);

  // Auto-expand all categories initially
  useEffect(() => {
    if (groupedAvailable.sortedCategories.length > 0) {
      setExpandedCategories(new Set(groupedAvailable.sortedCategories));
    }
  }, [groupedAvailable.sortedCategories.join(',')]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const title = SECTION_LABELS[sectionLabel] || 'Bring Something';

  return (
    <div className="py-2 space-y-2.5">
      {/* Header */}
      <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>

      {/* What's Needed Most Pill */}
      <ItemsNeededInsight 
        items={items}
        sectionPreset={sectionLabel}
        eventDate={eventDate}
        goingCount={goingCount}
        isArchived={isArchived}
        showNeedsMostHint={showNeedsMostHint}
        guestSuggestionsEnabled={allowGuestItems}
        suggestedItemsCount={items.filter(i => i.is_suggested).length}
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
        <Input
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-[13px] bg-muted/30 border-0"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex gap-1.5 py-1">
        {FILTER_OPTIONS.map(filter => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
              activeFilter === filter.key
                ? "bg-foreground text-background"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Items List */}
      {loading ? (
        <div className="py-6 text-center text-muted-foreground/60 text-[13px]">
          Loading...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground/60 text-[13px]">
          {searchQuery || activeFilter !== 'all' 
            ? 'No items match your search'
            : "No items yet — your host hasn't added anything"}
        </div>
      ) : (
        <div className="space-y-1">
          {/* Available Items by Category */}
          {groupedAvailable.sortedCategories.map(category => {
            const categoryItems = groupedAvailable.groups[category];
            const isExpanded = expandedCategories.has(category);

            return (
              <div key={category}>
                {/* Category Header */}
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-1.5 w-full py-1.5 group"
                >
                  <ChevronRight className={cn(
                    "h-3.5 w-3.5 text-muted-foreground/50 transition-transform",
                    isExpanded && "rotate-90"
                  )} />
                  <span className="text-[13px] font-medium text-foreground">
                    {category}
                  </span>
                  <span className="text-[11px] text-muted-foreground/50 ml-0.5">
                    {categoryItems.length}
                  </span>
                </button>

                {/* Category Items */}
                {isExpanded && (
                  <div className="ml-5">
                    <ItemListCompact 
                      items={categoryItems} 
                      eventId={eventId}
                      guestName={guestName}
                      contributionMethods={contributionMethods}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Unavailable Items Accordion */}
          {unavailableItems.length > 0 && (
            <div className="pt-2 mt-2 border-t border-border/30">
              <button
                onClick={() => setShowUnavailable(!showUnavailable)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors py-1"
              >
                <ChevronRight className={cn(
                  "h-3 w-3 transition-transform",
                  showUnavailable && "rotate-90"
                )} />
                <span>{unavailableItems.length} unavailable item{unavailableItems.length !== 1 ? 's' : ''}</span>
              </button>
              
              {showUnavailable && (
                <div className="mt-1 ml-4">
                  <ItemListCompact 
                    items={unavailableItems} 
                    eventId={eventId}
                    guestName={guestName}
                    contributionMethods={contributionMethods}
                    isUnavailable
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Suggest Item */}
      {allowGuestItems && (
        <div className="pt-2 border-t border-border/30">
          <QuickSuggestInput
            eventId={eventId}
            guestName={guestName}
            existingItems={items.map(i => ({ id: i.id, name: i.name }))}
            onSuccess={() => {
              loadItems();
              onSuggestionSubmitted?.();
            }}
          />
        </div>
      )}
    </div>
  );
};
