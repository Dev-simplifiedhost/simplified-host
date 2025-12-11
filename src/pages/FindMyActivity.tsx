import { useState, useCallback } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Package, Calendar, CheckCircle2, MoreVertical, Mail, ExternalLink, Phone, Edit, Trash2, RefreshCw, Lightbulb, DollarSign, Eye } from "lucide-react";
import { format } from "date-fns";
import { PhoneInputWithCountry } from "@/components/ui/phone-input";
import { cleanPhoneNumber } from "@/lib/phoneFormat";
import { MessageHostDialog } from "@/components/event/MessageHostDialog";
import { EditSuggestedItemDialog } from "@/components/event/EditSuggestedItemDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
import { useRealTimeRsvp } from "@/hooks/useRealTimeRsvp";

export default function FindMyActivity() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Message Host Dialog
  const [messageHostDialogOpen, setMessageHostDialogOpen] = useState(false);
  const [selectedEventForMessage, setSelectedEventForMessage] = useState<{ id: string; requireEmail: boolean } | null>(null);
  
  // Edit Contact Dialog
  const [editContactDialogOpen, setEditContactDialogOpen] = useState(false);
  const [editContactData, setEditContactData] = useState({ name: "", phone: "", countryCode: "US" });
  const [updatingContact, setUpdatingContact] = useState(false);
  
  // Edit Suggestion Dialog
  const [editSuggestionDialogOpen, setEditSuggestionDialogOpen] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState<any>(null);
  
  // Delete Suggestion Dialog
  const [deleteSuggestionDialogOpen, setDeleteSuggestionDialogOpen] = useState(false);
  const [deletingSuggestion, setDeletingSuggestion] = useState<any>(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);

  // Set up real-time updates for RSVPs
  const handleRsvpUpdate = useCallback(() => {
    if (results && name.trim()) {
      handleSearch();
      toast({
        title: "Activity Updated",
        description: "Your activity has been synced",
      });
    }
  }, [results, name]);

  useRealTimeRsvp(handleRsvpUpdate, !!results);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (window.innerWidth < 768) { // Mobile breakpoint
      setTimeout(() => {
        e.target.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 300); // Delay to allow keyboard to appear
    }
  };

  const handleSearch = async () => {
    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to search",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Search RSVPs by name
      let rsvpQuery = supabase
        .from('rsvps')
        .select('*, events(id, name, event_date, event_code, location, require_email_for_messages)')
        .ilike('guest_name', `%${name.trim()}%`);

      // If phone provided, add exact phone match (clean formatting)
      if (phone.trim()) {
        const cleanPhone = cleanPhoneNumber(phone.trim());
        rsvpQuery = rsvpQuery.eq('guest_phone', cleanPhone);
      }

      const { data: rsvps, error: rsvpError } = await rsvpQuery;

      if (rsvpError) throw rsvpError;

      // Get unique guest tokens and event IDs from RSVPs
      const tokens = rsvps?.map(r => r.guest_token).filter(Boolean) || [];
      const eventIds = rsvps?.map(r => r.event_id).filter(Boolean) || [];
      const rsvpIds = rsvps?.map(r => r.id).filter(Boolean) || [];

      // Search claimed items by name
      let itemsData: any[] = [];
      if (tokens.length > 0) {
        const { data: items } = await supabase
          .from('event_items')
          .select('*, events(name, event_date, event_code)')
          .in('claimed_by', tokens);

        itemsData = items || [];
      }

      // Also search item_claims directly by phone if provided
      if (phone.trim()) {
        const cleanPhone = cleanPhoneNumber(phone.trim());
        const { data: directClaims } = await supabase
          .from('item_claims')
          .select('*, event_items!inner(id, name, notes, event_id, events(name, event_date, event_code))')
          .ilike('contributor_name', `%${name.trim()}%`)
          .eq('contributor_phone', cleanPhone);
        
        // Merge with items found via tokens, avoid duplicates
        if (directClaims && directClaims.length > 0) {
          const existingItemIds = new Set(itemsData.map(item => item.id));
          const newItems = directClaims
            .map(claim => claim.event_items)
            .filter(item => !existingItemIds.has(item.id));
          itemsData = [...itemsData, ...newItems];
        }
      }

      // Fetch item suggestions
      let suggestionsData: any[] = [];
      if (rsvpIds.length > 0) {
        const { data: suggestions } = await supabase
          .from('item_suggestions')
          .select('*, events(name, event_date, event_code)')
          .in('rsvp_id', rsvpIds)
          .in('event_id', eventIds);
        
        suggestionsData = suggestions || [];
      }

      // Fetch monetary contributions (from contributions table)
      let contributionsData: any[] = [];
      if (eventIds.length > 0) {
        const { data: contributions } = await supabase
          .from('contributions')
          .select('*, events(name, event_date, event_code)')
          .ilike('contributor_name', `%${name.trim()}%`)
          .in('event_id', eventIds);
        
        contributionsData = contributions || [];
      }

      // Also check item_claims for monetary contributions
      if (phone.trim() && eventIds.length > 0) {
        const cleanPhone = cleanPhoneNumber(phone.trim());
        const { data: monetaryClaims } = await supabase
          .from('item_claims')
          .select('*, event_items(name, events(name, event_date, event_code))')
          .eq('claim_type', 'monetary')
          .ilike('contributor_name', `%${name.trim()}%`)
          .eq('contributor_phone', cleanPhone)
          .in('event_id', eventIds);

        if (monetaryClaims && monetaryClaims.length > 0) {
          contributionsData = [...contributionsData, ...monetaryClaims];
        }
      }

      setResults({
        rsvps: rsvps || [],
        claimedItems: itemsData,
        suggestions: suggestionsData,
        contributions: contributionsData,
        searchName: name.trim(),
        searchPhone: phone.trim()
      });
      setLastUpdated(new Date());

      if ((rsvps?.length || 0) === 0 && itemsData.length === 0 && suggestionsData.length === 0 && contributionsData.length === 0) {
        toast({
          title: "No Results Found",
          description: "No RSVPs, items, suggestions, or contributions found with that information",
        });
      }
    } catch (error: any) {
      toast({
        title: "Search Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (name.trim()) {
      handleSearch();
    }
  };

  const handleMessageHost = (eventId: string, requireEmail: boolean) => {
    setSelectedEventForMessage({ id: eventId, requireEmail: requireEmail || false });
    setMessageHostDialogOpen(true);
  };

  const handleEditContact = () => {
    setEditContactData({
      name: results?.searchName || name,
      phone: results?.searchPhone || phone,
      countryCode: countryCode
    });
    setEditContactDialogOpen(true);
  };

  const handleUpdateContact = async () => {
    if (!editContactData.name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name",
        variant: "destructive"
      });
      return;
    }

    setUpdatingContact(true);
    try {
      // Get all guest tokens from current results
      const tokens = results?.rsvps?.map((r: any) => r.guest_token).filter(Boolean) || [];
      
      if (tokens.length === 0) {
        toast({
          title: "No RSVPs Found",
          description: "No RSVPs to update",
          variant: "destructive"
        });
        return;
      }

      // Update all RSVPs with these tokens
      const cleanPhone = editContactData.phone.trim() ? cleanPhoneNumber(editContactData.phone) : null;
      
      const { error } = await supabase
        .from('rsvps')
        .update({
          guest_name: editContactData.name.trim(),
          guest_phone: cleanPhone,
          country_code: editContactData.countryCode
        })
        .in('guest_token', tokens);

      if (error) throw error;

      toast({
        title: "Contact Updated!",
        description: `Updated ${tokens.length} RSVP(s) with your new contact information`,
      });

      setEditContactDialogOpen(false);
      // Refresh results
      handleSearch();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUpdatingContact(false);
    }
  };

  const handleEditSuggestion = (suggestion: any) => {
    setEditingSuggestion(suggestion);
    setEditSuggestionDialogOpen(true);
  };

  const handleDeleteSuggestion = (suggestion: any) => {
    setDeletingSuggestion(suggestion);
    setDeleteSuggestionDialogOpen(true);
  };

  const confirmDeleteSuggestion = async () => {
    if (!deletingSuggestion) return;

    setDeletingInProgress(true);
    try {
      const { error } = await supabase
        .from('item_suggestions')
        .delete()
        .eq('id', deletingSuggestion.id)
        .eq('status', 'pending'); // Only delete pending

      if (error) throw error;

      toast({
        title: "Suggestion Deleted",
        description: "Your item suggestion has been removed",
      });

      setDeleteSuggestionDialogOpen(false);
      setDeletingSuggestion(null);
      // Refresh results
      handleSearch();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeletingInProgress(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-2xl pb-safe">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Search className="h-6 w-6" />
              <CardTitle>Find My Activity</CardTitle>
            </div>
            <CardDescription>
              Search for your RSVPs and claimed items by entering your name and contact info
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="search-name">Your Name *</Label>
                <Input
                  id="search-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  onFocus={handleInputFocus}
                  autoComplete="name"
                  inputMode="text"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="search-phone">
                  Phone Number (optional, for exact match)
                  <span className="text-xs text-muted-foreground ml-2">• Include country code</span>
                </Label>
                <PhoneInputWithCountry
                  value={phone}
                  onChange={setPhone}
                  countryCode={countryCode}
                  onCountryChange={setCountryCode}
                  placeholder="Enter phone number"
                  onFocus={handleInputFocus}
                />
                <p className="text-xs text-muted-foreground">
                  Country code defaults to US (+1). Select a different country if needed.
                </p>
              </div>

              <Button 
                onClick={handleSearch} 
                disabled={loading || !name.trim()}
                className="w-full min-h-[44px]"
              >
                <Search className="h-4 w-4 mr-2" />
                {loading ? "Searching..." : "Search My Activity"}
              </Button>
            </div>

            {/* Results */}
            {results && (
              <div className="space-y-6 mt-8 border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">
                    Results for "{results.searchName}"
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditContact}
                      className="min-h-[36px]"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Edit Contact
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={loading}
                      className="min-h-[36px]"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>

                {lastUpdated && (
                  <p className="text-xs text-muted-foreground">
                    Last updated: {format(lastUpdated, 'PPp')}
                  </p>
                )}
                
                {/* Scrollable container for results */}
                <div className="max-h-[400px] md:max-h-[500px] overflow-y-auto pr-2 space-y-6 overscroll-contain">
                  {/* RSVPs */}
                  {results.rsvps.length > 0 && (
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <h4 className="font-medium">Your RSVPs ({results.rsvps.length})</h4>
                      </div>
                      <div className="space-y-3">
                        {results.rsvps.map((rsvp: any) => (
                          <Card key={rsvp.id}>
                            <CardContent className="pt-6">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <p className="font-medium">{rsvp.events?.name}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => navigate(`/event/${rsvp.events?.event_code}`)}
                                    className="h-8 w-8"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleMessageHost(rsvp.events?.id, rsvp.events?.require_email_for_messages)}>
                                        <Mail className="h-4 w-4 mr-2" />
                                        Message Host
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => navigate(`/event/${rsvp.events?.event_code}`)}>
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        View Event Page
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={handleEditContact}>
                                        <Phone className="h-4 w-4 mr-2" />
                                        Edit Contact Info
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                              
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {rsvp.events?.event_date && format(new Date(rsvp.events.event_date), 'PPP')}
                                  </p>
                                  {rsvp.events?.location && (
                                    <p className="text-sm text-muted-foreground">
                                      {rsvp.events.location}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <Badge>{rsvp.rsvp_status.replace('_', ' ')}</Badge>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Code: {rsvp.events?.event_code}
                                  </p>
                                </div>
                              </div>
                              {rsvp.additional_guests && Array.isArray(rsvp.additional_guests) && rsvp.additional_guests.length > 0 && (
                                <p className="text-sm text-muted-foreground mt-3">
                                  Additional guests: {rsvp.additional_guests
                                    .map((g: any, idx: number) => typeof g === 'string' ? g : (g?.name || `Guest ${idx + 1}`))
                                    .join(', ')}
                                </p>
                              )}
                              {rsvp.message && (
                                <p className="text-sm text-muted-foreground mt-2 italic">
                                  "{rsvp.message}"
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Claimed Items */}
                  {results.claimedItems.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        <h4 className="font-medium">Items You're Bringing ({results.claimedItems.length})</h4>
                      </div>
                      <div className="space-y-3">
                        {results.claimedItems.map((item: any) => (
                          <Card key={item.id}>
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{item.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    For: {item.events?.name}
                                  </p>
                                  {item.notes && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {item.notes}
                                    </p>
                                  )}
                                </div>
                                {item.events?.event_date && (
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(item.events.event_date), 'MMM d')}
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Item Suggestions */}
                  {results.suggestions && results.suggestions.length > 0 && (
                    <div className="space-y-4 mt-6">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-600" />
                        <h4 className="font-medium">Items You've Suggested ({results.suggestions.length})</h4>
                      </div>
                      <div className="space-y-3">
                        {results.suggestions.map((suggestion: any) => (
                          <Card key={suggestion.id}>
                            <CardContent className="pt-6">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="font-medium">{suggestion.item_name}</p>
                                    <Badge variant={getStatusBadgeVariant(suggestion.status)}>
                                      {suggestion.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    For: {suggestion.events?.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Category: {suggestion.category}
                                  </p>
                                  {suggestion.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {suggestion.description}
                                    </p>
                                  )}
                                  {suggestion.rejection_reason && (
                                    <p className="text-xs text-destructive mt-2">
                                      Reason: {suggestion.rejection_reason}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Submitted: {format(new Date(suggestion.created_at), 'PPp')}
                                  </p>
                                </div>
                                {suggestion.status === 'pending' && (
                                  <div className="flex items-center gap-1 ml-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditSuggestion(suggestion)}
                                      className="h-8 w-8"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteSuggestion(suggestion)}
                                      className="h-8 w-8 text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                                {suggestion.status === 'approved' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => navigate(`/event/${suggestion.events?.event_code}`)}
                                    className="h-8 w-8"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contributions */}
                  {results.contributions && results.contributions.length > 0 && (
                    <div className="space-y-4 mt-6">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <h4 className="font-medium">
                          Your Contributions (
                          ${results.contributions.reduce((sum: number, c: any) => sum + (c.amount || c.amount_contributed || 0), 0).toFixed(2)}
                          )
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {results.contributions.map((contribution: any, idx: number) => (
                          <Card key={contribution.id || idx}>
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-green-600">
                                    ${(contribution.amount || contribution.amount_contributed || 0).toFixed(2)}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    For: {contribution.events?.name || contribution.event_items?.events?.name}
                                  </p>
                                  {contribution.payment_method && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      via {contribution.payment_method}
                                    </p>
                                  )}
                                  {contribution.note && (
                                    <p className="text-xs text-muted-foreground mt-1 italic">
                                      "{contribution.note}"
                                    </p>
                                  )}
                                  {contribution.payment_verified && (
                                    <Badge variant="default" className="mt-2">Verified</Badge>
                                  )}
                                </div>
                                {(contribution.created_at || contribution.events?.event_date) && (
                                  <p className="text-sm text-muted-foreground">
                                    {format(new Date(contribution.created_at || contribution.events.event_date), 'MMM d')}
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {results.rsvps.length === 0 && results.claimedItems.length === 0 && 
                   (!results.suggestions || results.suggestions.length === 0) && 
                   (!results.contributions || results.contributions.length === 0) && (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">
                        No activity found
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Try searching with a different name or add your phone for exact match
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Help Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Search Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p>• Enter the name you used when RSVPing or claiming items</p>
            <p>• Phone number is optional but helps narrow results to exact matches</p>
            <p>• Country code selector defaults to US (+1) - change if you used a different country</p>
            <p>• Name search is flexible (e.g., "John" will find "John Smith")</p>
          </CardContent>
        </Card>
      </main>

      {/* Message Host Dialog */}
      {selectedEventForMessage && (
        <MessageHostDialog
          open={messageHostDialogOpen}
          onOpenChange={setMessageHostDialogOpen}
          eventId={selectedEventForMessage.id}
          requireEmail={selectedEventForMessage.requireEmail}
        />
      )}

      {/* Edit Contact Dialog */}
      <Dialog open={editContactDialogOpen} onOpenChange={setEditContactDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact Information</DialogTitle>
            <DialogDescription>
              Update your contact info across all your RSVPs
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={editContactData.name}
                onChange={(e) => setEditContactData({ ...editContactData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <PhoneInputWithCountry
                value={editContactData.phone}
                onChange={(phone) => setEditContactData({ ...editContactData, phone })}
                countryCode={editContactData.countryCode}
                onCountryChange={(code) => setEditContactData({ ...editContactData, countryCode: code })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditContactDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateContact} disabled={updatingContact}>
              {updatingContact ? "Updating..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Suggestion Dialog */}
      {editingSuggestion && (
        <EditSuggestedItemDialog
          open={editSuggestionDialogOpen}
          onOpenChange={setEditSuggestionDialogOpen}
          item={editingSuggestion}
          eventId={editingSuggestion.event_id}
          onSuccess={() => handleSearch()}
        />
      )}

      {/* Delete Suggestion Confirmation */}
      <AlertDialog open={deleteSuggestionDialogOpen} onOpenChange={setDeleteSuggestionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Suggestion?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingSuggestion?.item_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingInProgress}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSuggestion} disabled={deletingInProgress}>
              {deletingInProgress ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}