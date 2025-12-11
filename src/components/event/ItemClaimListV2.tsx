import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search, Plus, Loader2, InfoIcon, UtensilsCrossed, Salad, Pizza, Cake, Coffee, Sparkles, Package, MoreHorizontal, CircleDot, X, Lightbulb, Pencil, Trash2, ExternalLink, Clock, CheckCircle2, User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { SuggestItemDialog } from "./SuggestItemDialog";
import { EditSuggestedItemDialog } from "./EditSuggestedItemDialog";
import { ContributionDialog } from "./ContributionDialog";
import { MySuggestionsDialog } from "./MySuggestionsDialog";
import { QuickSuggestInput } from "./QuickSuggestInput";
import { cleanPhoneNumber } from "@/lib/phoneFormat";
import { ExternalLinkDialog } from "./ExternalLinkDialog";
import { formatDistanceToNow } from "date-fns";
import { checkRateLimit, recordAction } from "@/lib/itemRateLimiter";
import { cn } from "@/lib/utils";

interface ItemClaim {
  id: string;
  claim_type: string;
  quantity_claimed: number | null;
  amount_contributed: number | null;
  contributor_name: string;
  payment_verified: boolean;
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
  item_claims?: ItemClaim[];
  link_url?: string;
  updated_at?: string;
}

// Format claimant name as "First Name + Last Initial" for privacy
const formatClaimantName = (fullName: string): string => {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

interface ItemClaimListV2Props {
  eventId: string;
  contributionMethods?: Array<{ type: string; handle: string }>;
  onSuggestionSubmitted?: () => void;
}

// Helper function to determine if an item is available based on goal_type
const isItemAvailable = (item: Item): boolean => {
  // Host-provided items are never available
  if ((item as any).is_host_provided) return false;
  
  // For quantity-based items: unavailable if ANY quantity is claimed
  if (item.goal_type === 'quantity' || item.goal_type === 'both') {
    return item.current_quantity === 0;
  }
  
  // For monetary-only items: unavailable only when fully funded
  if (item.goal_type === 'monetary') {
    return item.fulfillment_status !== 'fulfilled';
  }
  
  return false;
};

export const ItemClaimListV2 = ({ eventId, contributionMethods = [], onSuggestionSubmitted }: ItemClaimListV2Props) => {
  const { toast } = useToast();
  const { verifyRecaptcha } = useRecaptcha();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'available' | 'unavailable'>('available');
  const [searchQuery, setSearchQuery] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [claimQuantity, setClaimQuantity] = useState(1);
  const [eventSettings, setEventSettings] = useState<{
    item_claim_eligibility: string;
    item_suggest_eligibility: string;
    max_guest_claims_per_item: number | null;
    skip_external_link_interstitial: boolean;
    allow_guest_items: boolean;
  } | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null);
  const [mySuggestionsDialogOpen, setMySuggestionsDialogOpen] = useState(false);
  const [guestRsvpStatus, setGuestRsvpStatus] = useState<string | null>(null);
  const [suggestDialogOpen, setSuggestDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedPaymentItem, setSelectedPaymentItem] = useState<Item | null>(null);
  const [claimingMonetaryItem, setClaimingMonetaryItem] = useState(false);
  const [editingClaim, setEditingClaim] = useState<ItemClaim | null>(null);
  const [countryCode, setCountryCode] = useState("US");
  const [unclaimConfirmOpen, setUnclaimConfirmOpen] = useState(false);
  const [itemToUnclaim, setItemToUnclaim] = useState<Item | null>(null);
  const [claimConfirmOpen, setClaimConfirmOpen] = useState(false);
  const [itemToConfirm, setItemToConfirm] = useState<Item | null>(null);
  const [guestRsvpId, setGuestRsvpId] = useState<string | null>(null);
  const [editSuggestedItemDialogOpen, setEditSuggestedItemDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  const [deleteSuggestedItemConfirmOpen, setDeleteSuggestedItemConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [externalLinkDialogOpen, setExternalLinkDialogOpen] = useState(false);
  const [selectedExternalLink, setSelectedExternalLink] = useState<{ url: string; name: string } | null>(null);

  const getCategoryIcon = (category: string) => {
    const categoryLower = category.toLowerCase();
    const iconProps = { className: "h-5 w-5", strokeWidth: 2 };
    
    switch (categoryLower) {
      case 'appetizer':
        return <Salad {...iconProps} />;
      case 'main':
        return <UtensilsCrossed {...iconProps} />;
      case 'side':
        return <Pizza {...iconProps} />;
      case 'dessert':
        return <Cake {...iconProps} />;
      case 'drink':
        return <Coffee {...iconProps} />;
      case 'decor':
        return <Sparkles {...iconProps} />;
      case 'supplies':
        return <Package {...iconProps} />;
      case 'misc':
        return <MoreHorizontal {...iconProps} />;
      default:
        return <CircleDot {...iconProps} />;
    }
  };

  const formatCategoryName = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  useEffect(() => {
    // Try to load guest info from RSVP token first
    const loadGuestFromRsvp = async () => {
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
          setGuestEmail(rsvp.guest_email || "");
          setGuestPhone(rsvp.guest_phone || "");
          setCountryCode(rsvp.country_code || "US");
          setGuestRsvpStatus(rsvp.rsvp_status);
          return;
        }
      }
      
      // Fallback to localStorage saved values
      const savedName = localStorage.getItem(`guest_name_${eventId}`);
      const savedEmail = localStorage.getItem(`guest_email_${eventId}`);
      const savedPhone = localStorage.getItem(`guest_phone_${eventId}`);
      const savedCountryCode = localStorage.getItem(`guest_country_code_${eventId}`);
      if (savedName) setGuestName(savedName);
      if (savedEmail) setGuestEmail(savedEmail);
      if (savedPhone) setGuestPhone(savedPhone);
      if (savedCountryCode) setCountryCode(savedCountryCode);
    };
    
    loadGuestFromRsvp();

    // Fetch event settings
    const fetchEventSettings = async () => {
      const { data } = await supabase
        .from('events')
        .select('item_claim_eligibility, item_suggest_eligibility, max_guest_claims_per_item, skip_external_link_interstitial, allow_guest_items')
        .eq('id', eventId)
        .maybeSingle();
      setEventSettings(data);
    };
    fetchEventSettings();

    loadItems();

    const channel = supabase
      .channel(`items-claim-v2-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_items', filter: `event_id=eq.${eventId}` }, loadItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_claims', filter: `event_id=eq.${eventId}` }, loadItems)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvps', filter: `event_id=eq.${eventId}` }, async () => {
        // Re-check RSVP status when RSVPs change
        const rsvpToken = localStorage.getItem(`rsvp_token_${eventId}`);
        if (rsvpToken) {
          const { data: rsvp } = await supabase
            .rpc('check_rsvp_status', {
              p_event_id: eventId,
              p_guest_token: rsvpToken
            })
            .maybeSingle();
          
          if (rsvp) {
            setGuestRsvpStatus(rsvp.rsvp_status);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  const loadItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('event_items')
      .select(`
        *,
        item_claims(*),
        item_suggestions!suggestion_id(
          id,
          rsvp_id,
          suggested_by_name,
          suggested_by_email
        )
      `)
      .eq('event_id', eventId)
      .order('category');

    if (error) {
      toast({ title: "Error loading items", description: error.message, variant: "destructive" });
    } else {
      setItems((data as any) || []);
    }
    setLoading(false);
  };

  const handleQuantityClaim = async () => {
    if (!selectedItem || !guestName.trim()) {
      toast({ title: "Please enter your name", variant: "destructive" });
      return;
    }
    
    if (!guestPhone.trim()) {
      toast({ title: "Please enter your phone number", variant: "destructive" });
      return;
    }

    // Resolve RSVP record (token first, then lookup by name/phone)
    const cleanedPhone = cleanPhoneNumber(guestPhone);
    let rsvpData: any = null;

    const existingToken = localStorage.getItem(`rsvp_token_${eventId}`);
    if (existingToken) {
      const { data } = await supabase
        .rpc('get_my_rsvp', { p_event_id: eventId, p_guest_token: existingToken })
        .maybeSingle();
      rsvpData = data;
    }

    if (!rsvpData) {
      const { data: found } = await supabase
        .rpc('find_my_rsvp', {
          p_event_id: eventId,
          p_guest_name: guestName.trim(),
          p_guest_phone: cleanedPhone,
          p_country_code: countryCode
        })
        .maybeSingle();
      if (found) {
        rsvpData = found;
        try { localStorage.setItem(`rsvp_token_${eventId}`, found.guest_token); } catch {}
        setGuestRsvpStatus(found.rsvp_status);
        setGuestRsvpId(found.id);
      }
    }

    if (!rsvpData || !rsvpData.id) {
      toast({ 
        title: "RSVP Required", 
        description: "Please RSVP to the event before claiming items",
        variant: "destructive" 
      });
      return;
    }

    // Store RSVP ID for suggested item tracking
    if (rsvpData.id && !guestRsvpId) {
      setGuestRsvpId(rsvpData.id);
    }

    // Eligibility based on event settings and actual RSVP status
    const eligibilitySetting = eventSettings?.item_claim_eligibility || 'attending_only';
    const status = rsvpData.rsvp_status as string;
    const isEligible = (
      eligibilitySetting === 'all_invitees' ||
      (eligibilitySetting === 'attending_only' && status === 'attending') ||
      (eligibilitySetting === 'attending_and_maybe' && (status === 'attending' || status === 'maybe'))
    );

    if (!isEligible) {
      toast({
        title: "Cannot claim items",
        description: eligibilitySetting === 'attending_only'
          ? "Host restricted claims to 'Attending' guests only. Please update your RSVP."
          : "Host restricted claims to 'Attending' or 'Maybe' guests. Please update your RSVP.",
        variant: 'destructive'
      });
      return;
    }

    const recaptchaToken = await verifyRecaptcha('claim_item');
    if (!recaptchaToken) {
      toast({ title: "reCAPTCHA verification failed", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from('item_claims' as any).insert({
      item_id: selectedItem.id,
      event_id: eventId,
      claim_type: 'quantity',
      quantity_claimed: claimQuantity,
      contributor_name: guestName.trim(),
      contributor_email: guestEmail.trim() || null,
      contributor_phone: guestPhone.trim(),
      country_code: countryCode,
      rsvp_id: rsvpData.id,
    });

    if (error) {
      console.error('Item claim failed:', error);
      toast({ 
        title: "Error claiming item", 
        description: error.message || "Failed to claim item. Please try again.",
        variant: "destructive" 
      });
    } else {
      localStorage.setItem(`guest_name_${eventId}`, guestName.trim());
      if (guestEmail.trim()) localStorage.setItem(`guest_email_${eventId}`, guestEmail.trim());
      localStorage.setItem(`guest_phone_${eventId}`, guestPhone.trim());
      localStorage.setItem(`guest_country_code_${eventId}`, countryCode);
      toast({ title: "Item claimed successfully!" });
      setClaimDialogOpen(false);
      loadItems();
    }
  };

  const getUserClaimForItem = (item: Item): ItemClaim | null => {
    if (!item.item_claims || item.item_claims.length === 0) return null;
    if (!guestName.trim()) return null;
    
    const normalizedGuestName = guestName.trim().toLowerCase();
    
    // Try exact match first
    let claim = item.item_claims.find(claim => 
      claim.contributor_name.trim().toLowerCase() === normalizedGuestName &&
      claim.claim_type === 'quantity'
    );
    
    // If no exact match, try matching by first word (first name)
    if (!claim) {
      const firstName = normalizedGuestName.split(' ')[0];
      claim = item.item_claims.find(claim => 
        claim.contributor_name.trim().toLowerCase().split(' ')[0] === firstName &&
        claim.claim_type === 'quantity'
      );
    }
    
    return claim || null;
  };

  const handleItemClaim = async (item: Item, quantity: number) => {
    // Double-tap prevention
    if (claimingItemId === item.id) return;
    
    if (!guestName.trim()) {
      toast({ title: "Please enter your name", variant: "destructive" });
      return;
    }
    
    if (!guestPhone.trim()) {
      toast({ title: "Please enter your phone number", variant: "destructive" });
      return;
    }

    // Check rate limit
    const rateCheck = checkRateLimit('GUEST_CLAIMS');
    if (!rateCheck.allowed) {
      toast({ 
        title: "Too many actions", 
        description: rateCheck.message, 
        variant: "destructive" 
      });
      return;
    }

    // Check per-guest claim cap
    if (eventSettings?.max_guest_claims_per_item) {
      const myClaimCount = getMyClaimedItems().length;
      if (myClaimCount >= eventSettings.max_guest_claims_per_item) {
        toast({
          title: "Claim limit reached",
          description: `You've reached the maximum of ${eventSettings.max_guest_claims_per_item} claimed items`,
          variant: "destructive"
        });
        return;
      }
    }

    setClaimingItemId(item.id);

    // Resolve RSVP record (token first, then lookup by name/phone)
    const cleanedPhone = cleanPhoneNumber(guestPhone);
    let rsvpData: any = null;

    const existingToken = localStorage.getItem(`rsvp_token_${eventId}`);
    if (existingToken) {
      const { data } = await supabase
        .rpc('get_my_rsvp', { p_event_id: eventId, p_guest_token: existingToken })
        .maybeSingle();
      rsvpData = data;
    }

    if (!rsvpData) {
      const { data: found } = await supabase
        .rpc('find_my_rsvp', {
          p_event_id: eventId,
          p_guest_name: guestName.trim(),
          p_guest_phone: cleanedPhone,
          p_country_code: countryCode
        })
        .maybeSingle();
      if (found) {
        rsvpData = found;
        try { localStorage.setItem(`rsvp_token_${eventId}`, found.guest_token); } catch {}
        setGuestRsvpStatus(found.rsvp_status);
      }
    }

    if (!rsvpData || !rsvpData.id) {
      toast({ 
        title: "RSVP Required", 
        description: "Please RSVP to the event before claiming items",
        variant: "destructive" 
      });
      return;
    }

    // Eligibility based on event settings and actual RSVP status
    const eligibilitySetting = eventSettings?.item_claim_eligibility || 'attending_only';
    const status = rsvpData.rsvp_status as string;
    const isEligible = (
      eligibilitySetting === 'all_invitees' ||
      (eligibilitySetting === 'attending_only' && status === 'attending') ||
      (eligibilitySetting === 'attending_and_maybe' && (status === 'attending' || status === 'maybe'))
    );

    if (!isEligible) {
      toast({
        title: "Cannot claim items",
        description: eligibilitySetting === 'attending_only'
          ? "Host restricted claims to 'Attending' guests only. Please update your RSVP."
          : "Host restricted claims to 'Attending' or 'Maybe' guests. Please update your RSVP.",
        variant: 'destructive'
      });
      return;
    }

    const recaptchaToken = await verifyRecaptcha('claim_item');
    if (!recaptchaToken) {
      toast({ title: "reCAPTCHA verification failed", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from('item_claims' as any).insert({
      item_id: item.id,
      event_id: eventId,
      claim_type: 'quantity',
      quantity_claimed: quantity,
      contributor_name: guestName.trim(),
      contributor_email: guestEmail.trim() || null,
      contributor_phone: guestPhone.trim(),
      country_code: countryCode,
      rsvp_id: rsvpData.id,
    });

    if (error) {
      console.error('Item claim failed:', error);
      toast({ 
        title: "Error claiming item", 
        description: error.message || "Failed to claim item. Please try again.",
        variant: "destructive" 
      });
    } else {
      // Record rate limit action after success
      recordAction('GUEST_CLAIMS');
      
      localStorage.setItem(`guest_name_${eventId}`, guestName.trim());
      if (guestEmail.trim()) localStorage.setItem(`guest_email_${eventId}`, guestEmail.trim());
      localStorage.setItem(`guest_phone_${eventId}`, guestPhone.trim());
      localStorage.setItem(`guest_country_code_${eventId}`, countryCode);
      toast({ title: "Item claimed successfully!" });
      loadItems();
    }
    
    setClaimingItemId(null);
  };

  const handleEditClaim = (item: Item) => {
    const userClaim = getUserClaimForItem(item);
    if (!userClaim) return;
    
    setEditingClaim(userClaim);
    setSelectedItem(item);
    setClaimQuantity(userClaim.quantity_claimed || 1);
    setClaimDialogOpen(true);
  };

  const handleUpdateClaim = async () => {
    if (!selectedItem || !editingClaim) return;
    
    const { error } = await supabase
      .from('item_claims' as any)
      .update({
        quantity_claimed: claimQuantity,
        contributor_name: guestName.trim(),
        contributor_email: guestEmail.trim() || null,
        contributor_phone: guestPhone.trim(),
      })
      .eq('id', editingClaim.id);

    if (error) {
      toast({ title: "Error updating claim", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Claim updated successfully!" });
      setClaimDialogOpen(false);
      setEditingClaim(null);
      loadItems();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setEditingClaim(null);
      setClaimDialogOpen(false);
    } else {
      setClaimDialogOpen(open);
    }
  };

  const handleUnclaimConfirm = async () => {
    if (!itemToUnclaim) {
      toast({ title: "Error", description: "No item selected", variant: "destructive" });
      setUnclaimConfirmOpen(false);
      return;
    }

    // Check rate limit
    const rateCheck = checkRateLimit('GUEST_CLAIMS');
    if (!rateCheck.allowed) {
      toast({ 
        title: "Too many actions", 
        description: rateCheck.message, 
        variant: "destructive" 
      });
      setUnclaimConfirmOpen(false);
      return;
    }

    const userClaim = getUserClaimForItem(itemToUnclaim);
    if (!userClaim) {
      toast({ 
        title: "Cannot unclaim", 
        description: "This item wasn't claimed by you, or your name doesn't match the claim.", 
        variant: "destructive" 
      });
      setUnclaimConfirmOpen(false);
      setItemToUnclaim(null);
      return;
    }

    // Get the guest token from localStorage
    const rsvpToken = localStorage.getItem(`rsvp_token_${eventId}`);
    if (!rsvpToken) {
      toast({ 
        title: "RSVP required", 
        description: "Please refresh the page or RSVP again to manage your claims.", 
        variant: "destructive" 
      });
      setUnclaimConfirmOpen(false);
      setItemToUnclaim(null);
      return;
    }

    // Use secure RPC function to delete claim
    const { error } = await supabase.rpc('delete_my_item_claim', {
      p_claim_id: userClaim.id,
      p_event_id: eventId,
      p_guest_token: rsvpToken,
    });

    if (error) {
      const errorMessage = error.message?.includes('not_authorized')
        ? "This claim doesn't belong to your RSVP."
        : error.message || "Unable to unclaim. Please try again.";
      
      toast({ 
        title: "Unclaim failed", 
        description: errorMessage, 
        variant: "destructive" 
      });
    } else {
      // Record rate limit action after success
      recordAction('GUEST_CLAIMS');
      
      toast({ 
        title: "Item unclaimed!", 
        description: `${itemToUnclaim.name} is now available for others.`,
      });
      loadItems();
    }
    
    setUnclaimConfirmOpen(false);
    setItemToUnclaim(null);
  };

  // Handle full monetary item claim (registry-style - claim the whole item)
  const handleFullMonetaryClaim = async (item: Item) => {
    if (!guestName.trim()) {
      toast({ title: "Please enter your name", variant: "destructive" });
      return;
    }

    if (claimingMonetaryItem) return;
    setClaimingMonetaryItem(true);

    const recaptchaToken = await verifyRecaptcha('claim_item');
    if (!recaptchaToken) {
      toast({ title: "reCAPTCHA verification failed", variant: "destructive" });
      setClaimingMonetaryItem(false);
      return;
    }

    const fullAmount = item.goal_amount || 0;

    const { error } = await supabase.from('item_claims' as any).insert({
      item_id: item.id,
      event_id: eventId,
      claim_type: 'monetary',
      amount_contributed: fullAmount,
      contributor_name: guestName.trim(),
      contributor_email: guestEmail.trim() || null,
      contributor_phone: guestPhone.trim() || null,
      country_code: countryCode,
      payment_verified: false,
    });

    if (error) {
      toast({ title: "Error claiming item", description: error.message, variant: "destructive" });
    } else {
      localStorage.setItem(`guest_name_${eventId}`, guestName.trim());
      if (guestEmail.trim()) localStorage.setItem(`guest_email_${eventId}`, guestEmail.trim());
      if (guestPhone.trim()) localStorage.setItem(`guest_phone_${eventId}`, guestPhone.trim());
      
      toast({ 
        title: "Item claimed!", 
        description: `You've claimed ${item.name} for $${fullAmount.toFixed(2)}. Complete payment to confirm.` 
      });
      
      // Show payment methods dialog
      setSelectedPaymentItem(item);
      setPaymentDialogOpen(true);
      loadItems();
    }
    
    setClaimingMonetaryItem(false);
  };

  const getUserMonetaryContribution = (item: Item): number => {
    if (!item.item_claims || !guestName.trim()) return 0;
    
    return item.item_claims
      .filter(claim => 
        claim.contributor_name.trim().toLowerCase() === guestName.trim().toLowerCase() &&
        claim.claim_type === 'monetary'
      )
      .reduce((sum, claim) => sum + (claim.amount_contributed || 0), 0);
  };

  const canClaimQuantityItems = (): { canClaim: boolean; reason?: string } => {
    if (!eventSettings) return { canClaim: true };
    if (!guestName.trim()) return { canClaim: false, reason: "Please enter your name first" };

    const { item_claim_eligibility } = eventSettings;

    if (item_claim_eligibility === 'all_invitees') return { canClaim: true };
    
    if (!guestRsvpStatus) {
      return { canClaim: false, reason: "You must RSVP first to claim items. Please RSVP above." };
    }

    if (item_claim_eligibility === 'attending_only') {
      if (guestRsvpStatus === 'attending') return { canClaim: true };
      return { 
        canClaim: false, 
        reason: guestRsvpStatus === 'maybe' 
          ? "Host restricted claims to 'Attending' guests only. Change your RSVP to 'Attending' to claim items."
          : "Host restricted claims to 'Attending' guests only. Please RSVP as 'Attending' to claim items."
      };
    }

    if (item_claim_eligibility === 'attending_and_maybe') {
      if (guestRsvpStatus === 'attending' || guestRsvpStatus === 'maybe') return { canClaim: true };
      return { canClaim: false, reason: "Please RSVP to claim items." };
    }

    return { canClaim: false };
  };

  // Get all items claimed by current guest (for My Items section and claim cap)
  const getMyClaimedItems = (): Item[] => {
    if (!guestName.trim()) return [];
    const normalizedGuestName = guestName.trim().toLowerCase();
    
    return items.filter(item => {
      if (!item.item_claims || item.item_claims.length === 0) return false;
      return item.item_claims.some(claim => 
        claim.contributor_name.trim().toLowerCase() === normalizedGuestName &&
        claim.claim_type === 'quantity'
      );
    });
  };

  const isItemSuggestedByCurrentGuest = (item: any): boolean => {
    if (!guestRsvpId || !item.suggestion_id) return false;
    const suggestion = item.item_suggestions;
    return suggestion && suggestion.rsvp_id === guestRsvpId;
  };

  const handleEditSuggestedItem = (item: Item) => {
    setItemToEdit(item);
    setEditSuggestedItemDialogOpen(true);
  };

  const handleDeleteSuggestedItem = (item: Item) => {
    setItemToDelete(item);
    setDeleteSuggestedItemConfirmOpen(true);
  };

  const confirmDeleteSuggestedItem = async () => {
    if (!itemToDelete) return;

    const guestToken = localStorage.getItem(`rsvp_token_${eventId}`);
    if (!guestToken) {
      toast({ title: "Error", description: "Guest token not found", variant: "destructive" });
      return;
    }

    const { error } = await supabase.rpc('delete_my_suggested_item', {
      p_item_id: itemToDelete.id,
      p_event_id: eventId,
      p_guest_token: guestToken,
    });

    if (error) {
      toast({ 
        title: "Unable to delete", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: "Item deleted", 
        description: "Your suggested item has been removed from the event." 
      });
      loadItems();
    }

    setDeleteSuggestedItemConfirmOpen(false);
    setItemToDelete(null);
  };

  const groupItemsByCategory = (items: Item[]) => {
    const categoryOrder = ['appetizer', 'main', 'side', 'dessert', 'drink', 'decor', 'supplies', 'misc', 'other'];
    
    const grouped = items.reduce((acc, item) => {
      const category = item.category.toLowerCase();
      if (!acc[category]) acc[category] = [];
      acc[category].push(item);
      return acc;
    }, {} as Record<string, Item[]>);

    return categoryOrder
      .filter(cat => grouped[cat])
      .map(cat => ({ category: cat, items: grouped[cat] }))
      .concat(
        Object.keys(grouped)
          .filter(cat => !categoryOrder.includes(cat))
          .map(cat => ({ category: cat, items: grouped[cat] }))
      );
  };

  // Filter by search query
  const searchFilteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter by availability
  const filteredItems = searchFilteredItems.filter(item => {
    const available = isItemAvailable(item);
    return filter === 'available' ? available : !available;
  });

  // Further filter by selected category
  const categoryFilteredItems = selectedCategory 
    ? filteredItems.filter(item => item.category.toLowerCase() === selectedCategory)
    : filteredItems;

  const groupedItems = groupItemsByCategory(categoryFilteredItems);
  
  const availableCount = items.filter(item => isItemAvailable(item)).length;
  const unavailableCount = items.filter(item => !isItemAvailable(item)).length;

  // Get all categories with counts for the current filter
  const categoriesWithCounts = React.useMemo(() => {
    const categoryOrder = ['appetizer', 'main', 'side', 'dessert', 'drink', 'decor', 'supplies', 'misc', 'other'];
    const counts = filteredItems.reduce((acc, item) => {
      const cat = item.category.toLowerCase();
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return categoryOrder
      .filter(cat => counts[cat])
      .map(cat => ({ name: cat, count: counts[cat] }))
      .concat(
        Object.keys(counts)
          .filter(cat => !categoryOrder.includes(cat))
          .map(cat => ({ name: cat, count: counts[cat] }))
      );
  }, [filteredItems]);

  const scrollToCategory = (categoryName: string | null) => {
    setSelectedCategory(categoryName);
    if (categoryName && categoryRefs.current[categoryName]) {
      setTimeout(() => {
        categoryRefs.current[categoryName]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  };

  const renderCompactCard = (item: Item) => {
    const eligibility = canClaimQuantityItems();
    const isHostProvided = (item as any).is_host_provided;
    const isAvailable = isItemAvailable(item);
    const hasMonetaryGoal = item.goal_type === 'monetary' || item.goal_type === 'both';
    const hasQuantityGoal = item.goal_type === 'quantity' || item.goal_type === 'both';
    
    const userClaim = getUserClaimForItem(item);
    const hasClaimed = !!userClaim;
    const userMonetaryContribution = getUserMonetaryContribution(item);
    
    // Determine badge status text based on goal type and fulfillment status
    const getStatusBadgeText = () => {
      if (item.fulfillment_status === 'fulfilled') {
        return item.goal_type === 'monetary' ? 'Claimed' : 'Claimed';
      }
      if (item.fulfillment_status === 'partially_fulfilled') {
        // Quantity items with any claim are "Claimed"
        if ((item.goal_type === 'quantity' || item.goal_type === 'both') && item.current_quantity > 0) {
          return 'Claimed';
        }
        // Monetary items with any claim are "Claimed"
        if (item.goal_type === 'monetary') {
          return 'Claimed';
        }
      }
      return 'Available';
    };

    // Get all contributors for this item
    const contributors = item.item_claims
      ?.filter(claim => claim.claim_type === 'quantity')
      .map(claim => formatClaimantName(claim.contributor_name)) || [];

    // Calculate serving info
    const servesPerUnit = (item as any).serves_per_unit;
    const totalServes = servesPerUnit && item.goal_quantity 
      ? servesPerUnit * item.goal_quantity 
      : null;

    // Allow interactions on claimed items even when unavailable (so user can unclaim)
    const cardStateClass = !isAvailable
      ? (hasClaimed ? '' : 'opacity-50 pointer-events-none')
      : '';

    // Check if item was updated recently (within 24 hours)
    const isRecentlyUpdated = item.updated_at && 
      (new Date().getTime() - new Date(item.updated_at).getTime()) < 24 * 60 * 60 * 1000;

    // Determine aria-label for accessibility
    const getAccessibilityLabel = () => {
      if (isHostProvided) return `${item.name}, Host Provided`;
      if (item.fulfillment_status === 'fulfilled') return `${item.name}, Fully Covered`;
      if (isAvailable) return `${item.name}, Available`;
      return `${item.name}, Unavailable`;
    };

    return (
      <Card 
        key={item.id} 
        className={cn(
          "hover:border-primary/50 transition-all group border-2",
          cardStateClass,
          item.id === highlightedItemId && "animate-fade-in-highlight"
        )}
        aria-label={getAccessibilityLabel()}
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm leading-tight">
                {item.link_url ? (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (eventSettings?.skip_external_link_interstitial) {
                        window.open(item.link_url!, '_blank', 'noopener,noreferrer');
                      } else {
                        setSelectedExternalLink({ url: item.link_url!, name: item.name });
                        setExternalLinkDialogOpen(true);
                      }
                    }}
                    className={`text-primary hover:underline flex items-center gap-1 text-left ${!isAvailable && !hasClaimed ? 'opacity-50' : ''}`}
                    aria-label={`View external link for ${item.name}`}
                  >
                    <span className="truncate">{item.name}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </button>
                ) : (
                  <span className="truncate block">{item.name}</span>
                )}
              </h4>
              {hasMonetaryGoal && (
                <p className="text-xs font-medium text-primary mt-0.5">
                  ${item.goal_amount?.toFixed(2)} estimated
                </p>
              )}
              {totalServes && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Feeds {totalServes} people
                </p>
              )}
              {isRecentlyUpdated && item.updated_at && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Updated {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                </p>
              )}
              {item.notes && !totalServes && !hasMonetaryGoal && !isRecentlyUpdated && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.notes}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {(item as any).is_suggested && (
                <div className="flex items-center gap-1">
                  <Badge 
                    variant="outline" 
                    className="shrink-0 h-5 text-xs px-1.5 gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                  >
                    <Lightbulb className="h-3 w-3" />
                    {((item as any).suggested_count || 1) > 1 
                      ? `Suggested by ${(item as any).suggested_count} guests`
                      : 'Suggested'}
                  </Badge>
                  {isItemSuggestedByCurrentGuest(item) && (
                    <div className="flex gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 hover:bg-blue-500/10 hover:text-blue-600"
                        onClick={() => handleEditSuggestedItem(item)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => handleDeleteSuggestedItem(item)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {isHostProvided && (
                <Badge variant="secondary" className="shrink-0 h-5 text-xs px-1.5 bg-accent/50 text-accent-foreground">
                  Host Provided
                </Badge>
              )}
              {hasClaimed && (
                <Badge variant="default" className="shrink-0 h-5 text-xs px-1.5">
                  You claimed
                </Badge>
              )}
              {userMonetaryContribution > 0 && (
                <Badge variant="default" className="shrink-0 h-5 text-xs px-1.5">
                  You contributed ${userMonetaryContribution.toFixed(0)}
                </Badge>
              )}
              {!isHostProvided && item.fulfillment_status === 'fulfilled' && (
                <Badge 
                  className="shrink-0 h-5 text-xs px-1.5 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 gap-1"
                  aria-label="Fully Covered"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Fully Covered
                </Badge>
              )}
              {!isHostProvided && item.fulfillment_status !== 'fulfilled' && (
                <Badge 
                  variant={item.fulfillment_status === 'unfulfilled' ? "outline" : "secondary"} 
                  className="shrink-0 h-5 text-xs px-1.5"
                >
                  {getStatusBadgeText()}
                </Badge>
              )}
            </div>
          </div>

          {/* Show claimed by info for monetary items */}
          {hasMonetaryGoal && item.fulfillment_status === 'fulfilled' && (
            <div className="text-xs text-muted-foreground">
              {item.item_claims?.filter(c => c.claim_type === 'monetary').map((claim, idx) => (
                <span key={claim.id}>
                  Claimed by {formatClaimantName(claim.contributor_name)}
                  {idx < (item.item_claims?.filter(c => c.claim_type === 'monetary').length || 1) - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          )}

          {/* Show contributors if item has claims */}
          {contributors.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">Contributors: </span>
              {contributors.map((name, idx) => {
                // Check if this contributor is the current user
                const currentUserFirstName = guestName.trim().split(' ')[0].toLowerCase();
                const contributorFirstName = name.split(' ')[0].toLowerCase();
                const isCurrentUser = contributorFirstName === currentUserFirstName;
                return (
                  <span key={idx}>
                    {isCurrentUser ? <span className="font-semibold text-foreground">You</span> : name}
                    {idx < contributors.length - 1 ? ', ' : ''}
                  </span>
                );
              })}
            </div>
          )}

          {isHostProvided ? (
            <div className="text-xs text-center text-muted-foreground py-1 font-medium">
              Covered by Host
            </div>
          ) : (
            <div className="flex gap-2">
              {/* Quantity Section */}
              {hasQuantityGoal && (
                hasClaimed ? (
                  <Button 
                    variant="destructive"
                    size="sm"
                    className="flex-1 h-7 text-xs gap-1"
                    onClick={() => {
                      setItemToUnclaim(item);
                      setUnclaimConfirmOpen(true);
                    }}
                  >
                    <X className="h-3 w-3" />
                    Unclaim
                  </Button>
                ) : isAvailable ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          disabled={!eligibility.canClaim}
                          variant={hasMonetaryGoal ? "outline" : "default"}
                          size="sm"
                          className="flex-1 h-7 text-xs"
                          onClick={() => {
                            if (eligibility.canClaim) {
                              setItemToConfirm(item);
                              setClaimQuantity(1);
                              setClaimConfirmOpen(true);
                            }
                          }}
                        >
                          Claim this item
                        </Button>
                      </TooltipTrigger>
                      {!eligibility.canClaim && (
                        <TooltipContent side="top" className="max-w-[250px]">
                          <p className="text-xs">{eligibility.reason}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                ) : null
              )}

              {/* Monetary Section - Full claim only (registry-style) */}
              {hasMonetaryGoal && item.fulfillment_status !== 'fulfilled' && (
                <Button 
                  variant={hasQuantityGoal ? "outline" : "default"}
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  disabled={claimingMonetaryItem}
                  onClick={() => handleFullMonetaryClaim(item)}
                >
                  {claimingMonetaryItem ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : null}
                  Claim this item (${item.goal_amount?.toFixed(0)})
                </Button>
              )}

              {/* Fulfilled state for items without goals */}
              {!hasQuantityGoal && !hasMonetaryGoal && !isAvailable && (
                <div className="text-xs text-center text-muted-foreground py-1">
                  Fulfilled
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Event Items Header - Title + Search + Suggest */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Title */}
          <h2 className="font-heading text-title-normal font-semibold">Event Items</h2>
          
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="pl-9"
            />
          </div>
        </div>
        
        {/* Inline Quick Suggest Input - only show if allow_guest_items is enabled */}
        {eventSettings?.allow_guest_items && (
          <div className="space-y-2">
            <QuickSuggestInput
              eventId={eventId}
              guestName={guestName || 'Guest'}
              existingItems={items.map(i => ({ id: i.id, name: i.name }))}
              onSuccess={(itemId, itemName) => {
                loadItems();
                setHighlightedItemId(itemId);
                setTimeout(() => setHighlightedItemId(null), 2000);
                onSuggestionSubmitted?.();
              }}
              disabled={(() => {
                const eligibility = eventSettings?.item_suggest_eligibility || 'attending_and_maybe';
                if (eligibility === 'all_invitees') return false;
                if (!guestName.trim()) return true;
                return eligibility === 'attending_only'
                  ? guestRsvpStatus !== 'attending'
                  : !['attending', 'maybe'].includes(guestRsvpStatus || '');
              })()}
            />
            {!guestName.trim() && eventSettings?.item_suggest_eligibility !== 'all_invitees' && (
              <p className="text-xs text-muted-foreground">Enter your name above to suggest items</p>
            )}
          </div>
        )}
        
        {/* Empty state when no items and suggestions enabled */}
        {items.length === 0 && !loading && eventSettings?.allow_guest_items && (
          <p className="text-center text-muted-foreground py-4">
            Be the first to suggest something!
          </p>
        )}
      </div>

      {/* My Claimed Items Section */}
      {getMyClaimedItems().length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              My Claimed Items ({getMyClaimedItems().length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {getMyClaimedItems().map(item => renderCompactCard(item))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Eligibility Info Banner */}
      {eventSettings && eventSettings.item_claim_eligibility !== 'all_invitees' && (
        <div className="p-3 rounded-lg border bg-muted/50 flex items-start gap-2">
          <InfoIcon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-medium mb-1">Item Claiming Eligibility</p>
            <p className="text-muted-foreground">
              {eventSettings.item_claim_eligibility === 'attending_only' 
                ? "Only guests who RSVP'd 'Attending' can claim quantity items."
                : "Guests who RSVP'd 'Attending' or 'Maybe' can claim quantity items."}
            </p>
            {guestRsvpStatus && !canClaimQuantityItems().canClaim && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-500 font-medium">
                Your current RSVP status: <span className="capitalize">{guestRsvpStatus}</span>. {canClaimQuantityItems().reason}
              </p>
            )}
          </div>
        </div>
      )}

      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'available' | 'unavailable')}>
        <TabsList className="w-full">
          <TabsTrigger value="available" className="flex-1">
            Available ({availableCount})
          </TabsTrigger>
          <TabsTrigger value="unavailable" className="flex-1">
            Unavailable ({unavailableCount})
          </TabsTrigger>
        </TabsList>

        {/* Horizontal Scrollable Category Filter */}
        {categoriesWithCounts.length > 0 && (
          <div className="relative mt-3 -mx-4 px-4 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2 pb-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => scrollToCategory(null)}
                className="shrink-0 transition-smooth"
              >
                All ({filteredItems.length})
              </Button>
              {categoriesWithCounts.map(({ name, count }) => (
                <Button
                  key={name}
                  variant={selectedCategory === name ? "default" : "outline"}
                  size="sm"
                  onClick={() => scrollToCategory(name)}
                  className="shrink-0 capitalize transition-smooth flex items-center gap-1.5"
                >
                  {getCategoryIcon(name)}
                  {formatCategoryName(name)} ({count})
                </Button>
              ))}
            </div>
          </div>
        )}

        <TabsContent value={filter} className="space-y-6 mt-4">
          {groupedItems.length === 0 ? (
            <div className="text-center py-8">
              {searchQuery ? (
                <p className="text-muted-foreground">No items match your search</p>
              ) : filter === 'available' ? (
                eventSettings?.allow_guest_items ? (
                  <p className="text-muted-foreground">Be the first to suggest something!</p>
                ) : (
                  <p className="text-muted-foreground">No items available</p>
                )
              ) : (
                <p className="text-muted-foreground">No fulfilled items</p>
              )}
            </div>
          ) : (
            <Accordion 
              type="multiple" 
              defaultValue={groupedItems.length > 0 ? [groupedItems[0].category] : []}
              className="space-y-2"
            >
              {groupedItems.map(({ category, items }) => (
                <AccordionItem 
                  key={category}
                  value={category}
                  ref={(el) => { categoryRefs.current[category] = el; }}
                  className="scroll-mt-24 border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-3 [&>svg]:hidden">
                    <div className="flex items-center justify-between w-full">
                      <h3 className="font-heading font-medium text-base flex items-center gap-2">
                        {getCategoryIcon(category)}
                        {formatCategoryName(category)}
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="relative group">
                          <div className="absolute inset-0 rounded-full border-2 border-primary/30 group-hover:animate-ping" />
                          <div className="relative flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 border-2 border-primary/30 group-hover:border-primary/60 group-hover:bg-primary/20 transition-all duration-200">
                            <span className="font-body font-bold text-sm text-primary">
                              {items.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {items.map(renderCompactCard)}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>
      </Tabs>

      {/* Claim Quantity Dialog */}
      <Dialog open={claimDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClaim ? "Edit" : "Claim"} {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Confirmation Notice */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
              <p className="text-sm font-medium text-foreground">
                Thank you! You are committing to bring:
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                <span className="font-semibold text-foreground">{selectedItem?.name}</span>
                {selectedItem && (selectedItem.goal_quantity || 0) - selectedItem.current_quantity > 1 && (
                  <span> (quantity: {claimQuantity})</span>
                )}
              </p>
            </div>

            {/* Quantity Selection */}
            {selectedItem && (selectedItem.goal_quantity || 0) - selectedItem.current_quantity > 1 && (
              <div>
                <Label htmlFor="claim-quantity">How many will you bring?</Label>
                <Input
                  id="claim-quantity"
                  type="number"
                  min="1"
                  max={(selectedItem.goal_quantity || 0) - selectedItem.current_quantity}
                  value={claimQuantity}
                  onChange={(e) => setClaimQuantity(parseInt(e.target.value) || 1)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Remaining: {(selectedItem.goal_quantity || 0) - selectedItem.current_quantity}
                </p>
              </div>
            )}

            {/* Name Field */}
            <div>
              <Label htmlFor="claim-name">Your Name</Label>
              <Input
                id="claim-name"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your name"
                className="mt-1"
              />
            </div>

            {/* Email Field */}
            <div>
              <Label htmlFor="claim-email">Email Address (Optional)</Label>
              <Input
                id="claim-email"
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="Enter your email"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                For host to send updates
              </p>
            </div>

            {/* Phone Field */}
            <div>
              <Label htmlFor="claim-phone">Phone Number <span className="text-destructive">*</span></Label>
              <Input
                id="claim-phone"
                type="tel"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="Enter your phone number"
                className="mt-1"
                required
              />
            </div>

            <Button 
              onClick={editingClaim ? handleUpdateClaim : handleQuantityClaim} 
              className="w-full"
              disabled={!guestName.trim() || !guestPhone.trim()}
            >
              {editingClaim ? "Update Commitment" : "Confirm Commitment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Suggest Item Dialog */}
      <SuggestItemDialog
        eventId={eventId}
        open={suggestDialogOpen}
        onOpenChange={setSuggestDialogOpen}
        guestName={guestName}
        guestEmail={guestEmail}
        itemSuggestEligibility={eventSettings?.item_suggest_eligibility}
        onSuccess={() => {
          loadItems();
          onSuggestionSubmitted?.();
        }}
      />

      {/* Edit Suggested Item Dialog */}
      <EditSuggestedItemDialog
        open={editSuggestedItemDialogOpen}
        onOpenChange={setEditSuggestedItemDialogOpen}
        item={itemToEdit}
        eventId={eventId}
        onSuccess={loadItems}
      />

      {/* Payment Methods Dialog */}
      <ContributionDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        eventId={eventId}
        contributionGoal={selectedPaymentItem?.goal_amount || 0}
        currentContributions={0}
        showContributionGoal={false}
        contributionMessage={`Please include "${selectedPaymentItem?.name}" in your payment memo so the host can verify your contribution.`}
        contributionMethods={contributionMethods}
      />


      {/* Claim Confirmation Dialog */}
      <AlertDialog open={claimConfirmOpen} onOpenChange={setClaimConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Claim</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to claim <strong>{itemToConfirm?.name}</strong>? You'll be expected to bring this item to the event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToConfirm(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToConfirm) {
                  setSelectedItem(itemToConfirm);
                  setClaimDialogOpen(true);
                }
                setClaimConfirmOpen(false);
                setItemToConfirm(null);
              }}
            >
              Confirm Claim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unclaim Confirmation Dialog */}
      <AlertDialog open={unclaimConfirmOpen} onOpenChange={setUnclaimConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unclaim this item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unclaim <strong>{itemToUnclaim?.name}</strong>? This will make it available for others to claim.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToUnclaim(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnclaimConfirm}>Unclaim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Suggested Item Confirmation Dialog */}
      <AlertDialog open={deleteSuggestedItemConfirmOpen} onOpenChange={setDeleteSuggestedItemConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{itemToDelete?.name}</strong>? This will remove it from the event completely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSuggestedItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* External Link Dialog */}
      {selectedExternalLink && (
        <ExternalLinkDialog
          open={externalLinkDialogOpen}
          onOpenChange={setExternalLinkDialogOpen}
          url={selectedExternalLink.url}
          itemName={selectedExternalLink.name}
        />
      )}

      {/* My Suggestions Dialog */}
      <MySuggestionsDialog
        eventId={eventId}
        guestToken={localStorage.getItem(`rsvp_token_${eventId}`) || ''}
        open={mySuggestionsDialogOpen}
        onOpenChange={setMySuggestionsDialogOpen}
      />
    </div>
  );
};
