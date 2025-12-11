import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ExternalLinkDialog } from "./ExternalLinkDialog";
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

interface ItemListCompactProps {
  items: Item[];
  eventId: string;
  guestName: string;
  contributionMethods?: any[];
  isUnavailable?: boolean;
}

// Format claimant name as "First Name + Last Initial" for privacy
const formatClaimantName = (fullName: string): string => {
  const parts = fullName.trim().split(' ');
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
};

export const ItemListCompact = ({ 
  items, 
  eventId, 
  guestName,
  contributionMethods = [],
  isUnavailable = false 
}: ItemListCompactProps) => {
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null);
  const [externalLinkDialogOpen, setExternalLinkDialogOpen] = useState(false);
  const [selectedLink, setSelectedLink] = useState<{ url: string; name: string } | null>(null);

  const getClaimants = (item: Item): string[] => {
    if (!item.item_claims?.length) return [];
    return item.item_claims
      .filter(claim => claim.claim_type === 'quantity')
      .map(claim => formatClaimantName(claim.contributor_name));
  };

  const isClaimedByMe = (item: Item): boolean => {
    if (!guestName || !item.item_claims?.length) return false;
    const normalizedName = guestName.trim().toLowerCase();
    return item.item_claims.some(claim => 
      claim.contributor_name?.trim().toLowerCase() === normalizedName ||
      claim.contributor_name?.trim().toLowerCase().split(' ')[0] === normalizedName.split(' ')[0]
    );
  };

  const getRemainingQuantity = (item: Item): number => {
    if (item.goal_type === 'quantity' || item.goal_type === 'both') {
      return Math.max(0, (item.goal_quantity || 1) - (item.current_quantity || 0));
    }
    return 0;
  };

  const handleCardClick = (item: Item) => {
    if (!item.link_url) return;
    
    try {
      const url = new URL(item.link_url);
      const currentHost = window.location.host;
      if (url.host !== currentHost) {
        setSelectedLink({ url: item.link_url, name: item.name });
        setExternalLinkDialogOpen(true);
        return;
      }
    } catch {}
    
    window.open(item.link_url, '_blank', 'noopener,noreferrer');
  };

  const handleClaimItem = async (e: React.MouseEvent, item: Item) => {
    e.stopPropagation();
    
    if (!guestName) {
      toast({ 
        title: "RSVP Required", 
        description: "Please RSVP to claim items",
        variant: "destructive" 
      });
      return;
    }

    setClaimingItemId(item.id);

    try {
      const rsvpToken = localStorage.getItem(`rsvp_token_${eventId}`);
      if (!rsvpToken) {
        toast({ 
          title: "RSVP Required", 
          description: "Please RSVP to claim items",
          variant: "destructive" 
        });
        return;
      }

      const { data: rsvpData } = await supabase
        .rpc('get_my_rsvp', { p_event_id: eventId, p_guest_token: rsvpToken })
        .maybeSingle();

      if (!rsvpData) {
        toast({ 
          title: "RSVP Required", 
          description: "Please RSVP to claim items",
          variant: "destructive" 
        });
        return;
      }

      const { error } = await supabase.from('item_claims').insert({
        item_id: item.id,
        event_id: eventId,
        claim_type: 'quantity',
        quantity_claimed: 1,
        contributor_name: guestName,
        rsvp_id: rsvpData.id,
      });

      if (error) throw error;

      toast({ title: "Item claimed!" });
    } catch (error: any) {
      console.error('Claim error:', error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to claim item",
        variant: "destructive" 
      });
    } finally {
      setClaimingItemId(null);
    }
  };

  // Get subtext for item
  const getSubtext = (item: Item, claimants: string[], claimedByMe: boolean): string | null => {
    if (item.is_host_provided) return "Host provided";
    if (claimedByMe) return null; // Will show badge instead
    if (item.is_suggested) return "Suggested";
    if (claimants.length > 0) {
      if (claimants.length === 1) return `Claimed by ${claimants[0]}`;
      return `Claimed by ${claimants[0]} +${claimants.length - 1}`;
    }
    return null;
  };

  return (
    <>
      <div className="space-y-0.5">
        {items.map(item => {
          const claimants = getClaimants(item);
          const remaining = getRemainingQuantity(item);
          const claimedByMe = isClaimedByMe(item);
          const isClaiming = claimingItemId === item.id;
          const hasLink = !!item.link_url;
          const subtext = getSubtext(item, claimants, claimedByMe);

          return (
            <div
              key={item.id}
              onClick={() => handleCardClick(item)}
              className={cn(
                "flex items-center justify-between gap-3 py-2 px-2 -mx-2 rounded-md transition-colors",
                hasLink && "cursor-pointer hover:bg-muted/40",
                isUnavailable && "py-1.5"
              )}
            >
              {/* Left: Name + Subtext */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "text-[13px] font-medium truncate",
                    isUnavailable ? "text-muted-foreground/60 text-[12px]" : "text-foreground"
                  )}>
                    {item.name}
                  </span>
                  
                  {hasLink && !isUnavailable && (
                    <ExternalLink className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                  )}
                </div>

                {/* Subtext row */}
                {!isUnavailable && (subtext || claimedByMe) && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {claimedByMe ? (
                      <span className="inline-flex items-center text-[11px] text-green-600 dark:text-green-400 font-medium">
                        <Check className="h-3 w-3 mr-0.5" />
                        You claimed this
                      </span>
                    ) : subtext ? (
                      <span className="text-[11px] text-muted-foreground/70">
                        {subtext}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Right: Quantity + Action */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Quantity pill - only for available items */}
                {!isUnavailable && remaining > 0 && !item.is_host_provided && (
                  <span className="text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                    {remaining} left
                  </span>
                )}

                {/* Claim Button */}
                {!isUnavailable && !item.is_host_provided && !claimedByMe && remaining > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2.5 text-[11px] font-medium"
                    onClick={(e) => handleClaimItem(e, item)}
                    disabled={isClaiming}
                  >
                    {isClaiming ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      'Claim'
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <ExternalLinkDialog
        open={externalLinkDialogOpen}
        onOpenChange={setExternalLinkDialogOpen}
        url={selectedLink?.url || ''}
        itemName={selectedLink?.name || ''}
      />
    </>
  );
};
