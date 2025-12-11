import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Notification } from "@/hooks/useNotifications";
import { DollarSign, User, Mail, Package } from "lucide-react";

interface ConfirmPaymentDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: Notification;
}

interface ItemClaimDetails {
  id: string;
  contributor_name: string;
  contributor_email: string | null;
  amount_contributed: number;
  payment_verified: boolean;
  item: {
    name: string;
  };
  event: {
    name: string;
  };
}

export function ConfirmPaymentDialogV2({
  open,
  onOpenChange,
  notification,
}: ConfirmPaymentDialogV2Props) {
  const { toast } = useToast();
  const [claim, setClaim] = useState<ItemClaimDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && notification.reference_id) {
      loadClaimDetails();
    }
  }, [open, notification.reference_id]);

  const loadClaimDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("item_claims")
        .select(`
          id,
          contributor_name,
          contributor_email,
          amount_contributed,
          payment_verified,
          item:event_items(name),
          event:events(name)
        `)
        .eq("id", notification.reference_id)
        .eq("claim_type", "monetary")
        .single();

      if (error) throw error;
      setClaim(data as any);
    } catch (error) {
      console.error("Error loading claim:", error);
      toast({
        title: "Error",
        description: "Failed to load payment details",
        variant: "destructive",
      });
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("item_claims")
        .update({
          payment_verified: true,
          verified_at: new Date().toISOString(),
        })
        .eq("id", notification.reference_id);

      if (error) throw error;

      // Mark notification as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      toast({
        title: "Payment confirmed",
        description: `Payment of $${claim?.amount_contributed} from ${claim?.contributor_name} has been verified.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error confirming payment:", error);
      toast({
        title: "Error",
        description: "Failed to confirm payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    setLoading(true);
    try {
      // Delete the unverified claim
      const { error } = await supabase
        .from("item_claims")
        .delete()
        .eq("id", notification.reference_id);

      if (error) throw error;

      // Mark notification as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      toast({
        title: "Payment denied",
        description: "The payment claim has been removed.",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error denying payment:", error);
      toast({
        title: "Error",
        description: "Failed to deny payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!claim) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Loading...</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Payment</DialogTitle>
          <DialogDescription>
            Review the payment details and confirm if you've received it
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <strong>From:</strong> {claim.contributor_name}
            </div>
            
            {claim.contributor_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <strong>Email:</strong> {claim.contributor_email}
              </div>
            )}
            
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <strong>Amount:</strong> ${claim.amount_contributed.toFixed(2)}
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <Package className="h-4 w-4 text-muted-foreground" />
              <strong>For:</strong> {claim.item.name}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Processing..." : "Confirm Received"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeny}
              disabled={loading}
            >
              Deny
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
