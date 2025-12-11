import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface StripeCheckoutButtonProps {
  eventId: string;
  itemId?: string;
  amount: number;
  contributorName: string;
  contributorEmail?: string;
  disabled?: boolean;
  className?: string;
}

export function StripeCheckoutButton({
  eventId,
  itemId,
  amount,
  contributorName,
  contributorEmail,
  disabled,
  className,
}: StripeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    if (amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid contribution amount",
        variant: "destructive",
      });
      return;
    }

    if (!contributorName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const currentUrl = window.location.href.split('?')[0];
      
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          eventId,
          itemId,
          amount,
          contributorName: contributorName.trim(),
          contributorEmail: contributorEmail?.trim() || undefined,
          successUrl: `${currentUrl}?payment=success`,
          cancelUrl: `${currentUrl}?payment=cancelled`,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No checkout URL received');

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: "Payment failed",
        description: error.message || "Unable to start checkout. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={disabled || loading || amount <= 0}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CreditCard className="h-4 w-4 mr-2" />
          Pay ${amount.toFixed(2)} with Card
        </>
      )}
    </Button>
  );
}
