import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Notification } from "@/hooks/useNotifications";

interface ConfirmPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: Notification;
}

export function ConfirmPaymentDialog({
  open,
  onOpenChange,
  notification,
}: ConfirmPaymentDialogProps) {
  const { toast } = useToast();
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && notification.reference_id) {
      loadPaymentDetails();
    }
  }, [open, notification.reference_id]);

  const loadPaymentDetails = async () => {
    try {
      const { data: verification, error: verError } = await supabase
        .from("payment_verifications")
        .select("*, contribution_id")
        .eq("id", notification.reference_id)
        .single();

      if (verError) throw verError;

      const { data: contribution, error: contError } = await supabase
        .from("contributions")
        .select("*")
        .eq("id", verification.contribution_id)
        .single();

      if (contError) throw contError;

      setPayment({ ...verification, ...contribution });
    } catch (error) {
      console.error("Error loading payment:", error);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("payment_verifications")
        .update({
          status: "verified",
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
        description: "The payment has been marked as received.",
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

  const handleReject = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("payment_verifications")
        .update({ status: "rejected" })
        .eq("id", notification.reference_id);

      if (error) throw error;

      // Mark notification as read
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      toast({
        title: "Payment rejected",
        description: "The payment has been marked as not received.",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error rejecting payment:", error);
      toast({
        title: "Error",
        description: "Failed to reject payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!payment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm">
              <strong>From:</strong> {payment.contributor_name}
            </p>
            <p className="text-sm">
              <strong>Amount:</strong> ${payment.amount}
            </p>
            <p className="text-sm">
              <strong>Method:</strong> {payment.payment_method}
            </p>
            {payment.note && (
              <p className="text-sm">
                <strong>Note:</strong> {payment.note}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1"
            >
              Confirm Received
            </Button>
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={loading}
            >
              Not Received
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
