import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, 
  Search, 
  UserPlus, 
  Share2, 
  Download,
  X,
  Bell,
  Send,
  CheckCircle2,
  HelpCircle,
  XCircle,
  RotateCcw,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { formatPhoneNumber } from "@/lib/phoneFormat";
import { GuestCard, GuestData, GuestActivity, ReadinessStatus } from "./GuestCard";
import { GuestDetailsDrawer } from "./GuestDetailsDrawer";
import { AddEditGuestDialog } from "./AddEditGuestDialog";
import { GuestFilters, GuestFilterOptions, defaultFilters } from "./GuestFilters";
import { GuestSmartNudge } from "./GuestSmartNudge";
import { BroadcastSMSDialog } from "../BroadcastSMSDialog";
import { cn } from "@/lib/utils";

interface GuestsTabV2Props {
  eventId: string;
  eventName: string;
  eventCode: string;
  eventDate: string | null;
  contributionsEnabled: boolean;
  isArchived?: boolean;
  claimableItemsCount?: number;
  onShareInvite: () => void;
}

interface ItemClaim {
  contributor_email: string | null;
  contributor_name: string;
  item_name: string;
  quantity_claimed: number;
  amount_contributed: number | null;
  payment_verified: boolean | null;
  claim_type: string;
}

export const GuestsTabV2 = ({ 
  eventId, 
  eventName, 
  eventCode,
  eventDate,
  contributionsEnabled,
  isArchived = false,
  claimableItemsCount = 0,
  onShareInvite 
}: GuestsTabV2Props) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  // Data state
  const [guests, setGuests] = useState<GuestData[]>([]);
  const [claims, setClaims] = useState<ItemClaim[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [advancedFilters, setAdvancedFilters] = useState<GuestFilterOptions>(defaultFilters);
  const [selectedGuest, setSelectedGuest] = useState<GuestData | null>(null);
  const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
  const [addEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestData | null>(null);
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  
  // Bulk selection state
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Load data
  useEffect(() => {
    loadGuests();
    loadClaims();
    
    const channel = supabase
      .channel(`guests-v2-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rsvps', filter: `event_id=eq.${eventId}` },
        () => loadGuests()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  const loadGuests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rsvps')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to load guests", variant: "destructive" });
    } else {
      const mapped = (data || []).map(r => ({
        ...r,
        rsvp_status: r.rsvp_status || 'no_response'
      })) as GuestData[];
      setGuests(mapped);
    }
    setLoading(false);
  };

  const loadClaims = async () => {
    const { data } = await supabase
      .from('item_claims')
      .select(`
        contributor_email,
        contributor_name,
        quantity_claimed,
        amount_contributed,
        payment_verified,
        claim_type,
        event_items(name)
      `)
      .eq('event_id', eventId);

    const mapped = (data || []).map((c: any) => ({
      contributor_email: c.contributor_email,
      contributor_name: c.contributor_name,
      item_name: c.event_items?.name || 'Unknown',
      quantity_claimed: c.quantity_claimed || 1,
      amount_contributed: c.amount_contributed,
      payment_verified: c.payment_verified,
      claim_type: c.claim_type,
    }));
    setClaims(mapped);
  };

  // Compute activity and readiness for each guest
  const getGuestActivity = (guest: GuestData): GuestActivity => {
    const email = guest.guest_email?.toLowerCase();
    if (!email) return { claimedItems: [], contributionAmount: 0, hasContributed: false };
    
    const guestClaims = claims.filter(c => c.contributor_email?.toLowerCase() === email);
    const claimedItems = guestClaims
      .filter(c => c.claim_type === 'quantity' || c.claim_type === 'bring')
      .map(c => ({ name: c.item_name, quantity: c.quantity_claimed }));
    
    const contributions = guestClaims.filter(c => c.claim_type === 'monetary' && c.payment_verified);
    const contributionAmount = contributions.reduce((sum, c) => sum + (c.amount_contributed || 0), 0);
    
    return {
      claimedItems,
      contributionAmount,
      hasContributed: contributionAmount > 0,
    };
  };

  const getReadinessStatus = (guest: GuestData, activity: GuestActivity): ReadinessStatus => {
    const hasRsvp = guest.rsvp_status === 'attending' || guest.rsvp_status === 'maybe';
    const hasClaimed = activity.claimedItems.length > 0 || activity.hasContributed;
    
    if (!hasRsvp && !guest.rsvp_status) return 'needs_rsvp';
    if (guest.rsvp_status === 'no_response') return 'needs_rsvp';
    if (hasRsvp && hasClaimed) return 'ready';
    if (hasRsvp && !hasClaimed) return 'needs_item';
    return 'needs_info';
  };

  // Stats
  const stats = useMemo(() => {
    const attending = guests.filter(g => g.rsvp_status === 'attending').length;
    const maybe = guests.filter(g => g.rsvp_status === 'maybe').length;
    const notAttending = guests.filter(g => g.rsvp_status === 'not_attending').length;
    const noResponse = guests.filter(g => !g.rsvp_status || g.rsvp_status === 'no_response').length;
    const dietaryCount = guests.filter(g => (g.dietary_preferences?.length || 0) > 0 || g.dietary_allergy).length;
    
    return { total: guests.length, attending, maybe, notAttending, noResponse, dietaryCount };
  }, [guests]);

  // Filter counts for advanced filters
  const filterCounts = useMemo(() => ({
    dietary: stats.dietaryCount,
    claimed: guests.filter(g => getGuestActivity(g).claimedItems.length > 0).length,
    contributed: guests.filter(g => getGuestActivity(g).hasContributed).length,
    noRsvp: stats.noResponse,
  }), [guests, claims, stats]);

  // Filter and sort guests
  const filteredGuests = useMemo(() => {
    let filtered = guests;

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'no_response') {
        filtered = filtered.filter(g => !g.rsvp_status || g.rsvp_status === 'no_response');
      } else {
        filtered = filtered.filter(g => g.rsvp_status === statusFilter);
      }
    }

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(g =>
        g.guest_name.toLowerCase().includes(term) ||
        g.guest_email?.toLowerCase().includes(term) ||
        g.guest_phone?.includes(term) ||
        g.message?.toLowerCase().includes(term)
      );
    }

    // Advanced filters
    if (advancedFilters.hasDietary) {
      filtered = filtered.filter(g => (g.dietary_preferences?.length || 0) > 0 || g.dietary_allergy);
    }
    if (advancedFilters.hasClaimedItems) {
      filtered = filtered.filter(g => getGuestActivity(g).claimedItems.length > 0);
    }
    if (advancedFilters.hasContributed) {
      filtered = filtered.filter(g => getGuestActivity(g).hasContributed);
    }
    if (advancedFilters.missingRsvp) {
      filtered = filtered.filter(g => !g.rsvp_status || g.rsvp_status === 'no_response');
    }

    // Sort: Going → Maybe → Not Going → No Response
    const statusOrder: Record<string, number> = {
      'attending': 1,
      'maybe': 2,
      'not_attending': 3,
      'no_response': 4,
    };

    filtered.sort((a, b) => {
      const aOrder = statusOrder[a.rsvp_status] || 4;
      const bOrder = statusOrder[b.rsvp_status] || 4;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return filtered;
  }, [guests, statusFilter, searchTerm, advancedFilters, claims]);

  // Bulk selection handlers
  const toggleGuestSelection = (guestId: string) => {
    if (isArchived) return;
    setSelectedGuestIds(prev => {
      const next = new Set(prev);
      if (next.has(guestId)) {
        next.delete(guestId);
      } else {
        next.add(guestId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (isArchived) return;
    if (selectedGuestIds.size === filteredGuests.length) {
      setSelectedGuestIds(new Set());
    } else {
      setSelectedGuestIds(new Set(filteredGuests.map(g => g.id)));
    }
  };

  const clearSelection = () => {
    setSelectedGuestIds(new Set());
  };

  // Bulk actions
  const handleBulkAction = async (action: 'remind' | 'resend' | 'clear' | 'going' | 'maybe' | 'not_going') => {
    if (selectedGuestIds.size === 0 || isArchived) return;
    
    setBulkActionLoading(true);
    const ids = Array.from(selectedGuestIds);
    
    try {
      switch (action) {
        case 'remind':
          // Open broadcast dialog with pre-selected recipients
          setBroadcastDialogOpen(true);
          break;
        case 'resend':
          toast({ title: "Invites resent", description: `Resent invites to ${ids.length} guest(s)` });
          break;
        case 'clear':
          await supabase
            .from('rsvps')
            .update({ rsvp_status: 'no_response', updated_at: new Date().toISOString() })
            .in('id', ids);
          toast({ title: "RSVP cleared", description: `Cleared RSVP for ${ids.length} guest(s)` });
          loadGuests();
          break;
        case 'going':
          await supabase
            .from('rsvps')
            .update({ rsvp_status: 'attending', updated_at: new Date().toISOString() })
            .in('id', ids);
          toast({ title: "Marked as Going", description: `Updated ${ids.length} guest(s)` });
          loadGuests();
          break;
        case 'maybe':
          await supabase
            .from('rsvps')
            .update({ rsvp_status: 'maybe', updated_at: new Date().toISOString() })
            .in('id', ids);
          toast({ title: "Marked as Maybe", description: `Updated ${ids.length} guest(s)` });
          loadGuests();
          break;
        case 'not_going':
          await supabase
            .from('rsvps')
            .update({ rsvp_status: 'not_attending', updated_at: new Date().toISOString() })
            .in('id', ids);
          toast({ title: "Marked as Not Going", description: `Updated ${ids.length} guest(s)` });
          loadGuests();
          break;
      }
      clearSelection();
    } catch (error) {
      toast({ title: "Error", description: "Failed to perform action", variant: "destructive" });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Guest handlers
  const handleGuestClick = (guest: GuestData) => {
    setSelectedGuest(guest);
    setDetailsDrawerOpen(true);
  };

  const handleAddGuest = () => {
    if (isArchived) return;
    setEditingGuest(null);
    setAddEditDialogOpen(true);
  };

  const handleEditGuest = () => {
    setEditingGuest(selectedGuest);
    setDetailsDrawerOpen(false);
    setAddEditDialogOpen(true);
  };

  const handleSaveGuest = async (data: Partial<GuestData>) => {
    if (editingGuest) {
      const { error } = await supabase
        .from('rsvps')
        .update({
          guest_name: data.guest_name,
          guest_email: data.guest_email,
          guest_phone: data.guest_phone,
          country_code: data.country_code,
          dietary_preferences: data.dietary_preferences,
          dietary_allergy: data.dietary_allergy,
          rsvp_status: data.rsvp_status,
          message: data.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingGuest.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update guest", variant: "destructive" });
        throw error;
      }
      toast({ title: "Guest updated", description: `${data.guest_name} has been updated` });
    } else {
      const { error } = await supabase
        .from('rsvps')
        .insert({
          event_id: eventId,
          guest_name: data.guest_name,
          guest_email: data.guest_email,
          guest_phone: data.guest_phone,
          country_code: data.country_code,
          dietary_preferences: data.dietary_preferences,
          dietary_allergy: data.dietary_allergy,
          rsvp_status: data.rsvp_status || 'no_response',
          message: data.message,
          source: 'host_added',
        });

      if (error) {
        toast({ title: "Error", description: "Failed to add guest", variant: "destructive" });
        throw error;
      }
      toast({ title: "Guest added", description: `${data.guest_name} has been added` });
    }
    
    loadGuests();
  };

  const handleDeleteGuest = async () => {
    if (!selectedGuest) return;
    
    const { error } = await supabase
      .from('rsvps')
      .delete()
      .eq('id', selectedGuest.id);

    if (error) {
      toast({ title: "Error", description: "Failed to remove guest", variant: "destructive" });
    } else {
      toast({ title: "Guest removed", description: `${selectedGuest.guest_name} has been removed` });
      setDetailsDrawerOpen(false);
      setSelectedGuest(null);
      loadGuests();
    }
  };

  const handleUpdateRsvp = async (status: GuestData['rsvp_status']) => {
    if (!selectedGuest || isArchived) return;
    
    const { error } = await supabase
      .from('rsvps')
      .update({ rsvp_status: status, updated_at: new Date().toISOString() })
      .eq('id', selectedGuest.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update RSVP", variant: "destructive" });
    } else {
      setSelectedGuest(prev => prev ? { ...prev, rsvp_status: status } : null);
      loadGuests();
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Status', 'Additional Guests', 'Dietary', 'Date'];
    const rows = filteredGuests.map(g => [
      g.guest_name,
      g.guest_email || '',
      g.guest_phone ? formatPhoneNumber(g.guest_phone, g.country_code || 'US') : '',
      g.rsvp_status || 'no_response',
      g.additional_guests?.join(', ') || '',
      g.dietary_preferences?.join(', ') || '',
      format(new Date(g.created_at), 'PPP')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guest-list-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const hasActiveFilters = Object.values(advancedFilters).some(Boolean);
  const hasSelection = selectedGuestIds.size > 0;
  
  const statusButtons = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'attending', label: 'Going', count: stats.attending },
    { value: 'maybe', label: 'Maybe', count: stats.maybe },
    { value: 'not_attending', label: 'Not Going', count: stats.notAttending },
    { value: 'no_response', label: 'No Response', count: stats.noResponse },
  ];

  return (
    <div className="space-y-4 pb-32 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <span className="font-semibold">{stats.total} Guest{stats.total !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="hidden sm:flex" onClick={onShareInvite}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          {!isArchived && (
            <Button size="sm" onClick={handleAddGuest}>
              <UserPlus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Guest</span>
              <span className="sm:hidden">Add</span>
            </Button>
          )}
        </div>
      </div>

      {/* Smart Nudge - Single card, context-aware */}
      {!isArchived && (
        <GuestSmartNudge
          goingCount={stats.attending}
          noResponseCount={stats.noResponse}
          dietaryCount={stats.dietaryCount}
          claimableItemsCount={claimableItemsCount}
          eventDate={eventDate}
          contributionsEnabled={contributionsEnabled}
          onSendReminders={() => setBroadcastDialogOpen(true)}
          onViewItems={() => {}}
          onViewDietary={() => setAdvancedFilters({ ...defaultFilters, hasDietary: true })}
        />
      )}

      {/* Bulk Action Bar */}
      {hasSelection && !isArchived && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" className="h-8" onClick={clearSelection}>
                  <X className="h-4 w-4 mr-1" />
                  {selectedGuestIds.size} selected
                </Button>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs whitespace-nowrap"
                  onClick={() => handleBulkAction('remind')}
                  disabled={bulkActionLoading}
                >
                  <Bell className="h-3.5 w-3.5 mr-1" />
                  Remind
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs whitespace-nowrap"
                  onClick={() => handleBulkAction('resend')}
                  disabled={bulkActionLoading}
                >
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Resend Invite
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs whitespace-nowrap"
                  onClick={() => handleBulkAction('going')}
                  disabled={bulkActionLoading}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" />
                  Going
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs whitespace-nowrap"
                  onClick={() => handleBulkAction('maybe')}
                  disabled={bulkActionLoading}
                >
                  <HelpCircle className="h-3.5 w-3.5 mr-1 text-yellow-600" />
                  Maybe
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs whitespace-nowrap"
                  onClick={() => handleBulkAction('not_going')}
                  disabled={bulkActionLoading}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1 text-red-600" />
                  Not Going
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs whitespace-nowrap"
                  onClick={() => handleBulkAction('clear')}
                  disabled={bulkActionLoading}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Clear RSVP
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search guests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12"
        />
        {searchTerm && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setSearchTerm("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-10 bg-background py-2 -mx-4 px-4 border-b space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {statusButtons.map(btn => (
            <Button
              key={btn.value}
              variant={statusFilter === btn.value ? 'default' : 'outline'}
              size="sm"
              className="h-9 whitespace-nowrap flex-shrink-0"
              onClick={() => setStatusFilter(btn.value)}
            >
              {btn.label} ({btn.count})
            </Button>
          ))}
        </div>
        
        <GuestFilters
          filters={advancedFilters}
          onFiltersChange={setAdvancedFilters}
          hasAnyFilters={hasActiveFilters}
          counts={filterCounts}
        />
      </div>

      {/* Select All Toggle */}
      {!isArchived && filteredGuests.length > 0 && (
        <div className="flex items-center gap-2 py-1">
          <Checkbox
            id="select-all"
            checked={selectedGuestIds.size === filteredGuests.length && filteredGuests.length > 0}
            onCheckedChange={toggleSelectAll}
            className="h-5 w-5"
          />
          <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
            Select all ({filteredGuests.length})
          </label>
        </div>
      )}

      {/* Guest List */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Loading guests...
          </CardContent>
        </Card>
      ) : guests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No guests yet. Add a few or share your invite link to begin.
            </p>
            {!isArchived && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                <Button onClick={handleAddGuest}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Guest
                </Button>
                <Button variant="outline" onClick={onShareInvite}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Invite
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : filteredGuests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No guests match your filters.</p>
            <Button
              variant="ghost"
              className="mt-2"
              onClick={() => {
                setStatusFilter('all');
                setSearchTerm('');
                setAdvancedFilters(defaultFilters);
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredGuests.map(guest => {
            const activity = getGuestActivity(guest);
            const readiness = getReadinessStatus(guest, activity);
            const isSelected = selectedGuestIds.has(guest.id);
            
            return (
              <div key={guest.id} className="flex items-start gap-3">
                {!isArchived && (
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleGuestSelection(guest.id)}
                    className="h-5 w-5 mt-5 flex-shrink-0"
                    aria-label={`Select ${guest.guest_name}`}
                  />
                )}
                <div className="flex-1">
                  <GuestCard
                    guest={guest}
                    activity={activity}
                    readinessStatus={readiness}
                    onClick={() => handleGuestClick(guest)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Guest Details Drawer */}
      <GuestDetailsDrawer
        open={detailsDrawerOpen}
        onOpenChange={setDetailsDrawerOpen}
        guest={selectedGuest}
        activity={selectedGuest ? getGuestActivity(selectedGuest) : { claimedItems: [], contributionAmount: 0, hasContributed: false }}
        readinessStatus={selectedGuest ? getReadinessStatus(selectedGuest, getGuestActivity(selectedGuest)) : 'needs_rsvp'}
        contributionsEnabled={contributionsEnabled}
        isArchived={isArchived}
        eventId={eventId}
        eventName={eventName}
        onEdit={handleEditGuest}
        onDelete={handleDeleteGuest}
        onUpdateRsvp={handleUpdateRsvp}
      />

      {/* Add/Edit Guest Dialog */}
      <AddEditGuestDialog
        open={addEditDialogOpen}
        onOpenChange={setAddEditDialogOpen}
        guest={editingGuest}
        onSave={handleSaveGuest}
      />

      {/* Broadcast SMS Dialog */}
      <BroadcastSMSDialog
        open={broadcastDialogOpen}
        onOpenChange={setBroadcastDialogOpen}
        eventId={eventId}
        eventName={eventName}
      />
    </div>
  );
};
