import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DollarSign, ExternalLink, Copy, Check, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { StripeCheckoutButton } from "./StripeCheckoutButton";

interface ContributionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  contributionGoal: number;
  currentContributions: number;
  showContributionGoal: boolean;
  contributionMessage?: string;
  contributionMethods: Array<{
    type: string;
    handle: string;
  }>;
  creditCardPaymentsEnabled?: boolean;
  contributionType?: string;
  contributionPerGuest?: number | null;
  contributionSuggestedAmount?: number | null;
  contributionMinimumAmount?: number | null;
}

export const ContributionDialog = ({
  open,
  onOpenChange,
  eventId,
  contributionGoal,
  currentContributions,
  showContributionGoal,
  contributionMessage,
  contributionMethods,
  creditCardPaymentsEnabled = false,
  contributionType = 'freeform',
  contributionPerGuest,
  contributionSuggestedAmount,
  contributionMinimumAmount,
}: ContributionDialogProps) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [contributorName, setContributorName] = useState("");
  const [contributorEmail, setContributorEmail] = useState("");
  const [amount, setAmount] = useState<string>("");

  // Set default amount based on contribution type
  useEffect(() => {
    if (open) {
      if (contributionType === 'fixed' && contributionPerGuest) {
        setAmount(contributionPerGuest.toString());
      } else if (contributionSuggestedAmount) {
        setAmount(contributionSuggestedAmount.toString());
      } else {
        setAmount("");
      }
    }
  }, [open, contributionType, contributionPerGuest, contributionSuggestedAmount]);

  const getPaymentLink = (type: string, handle: string): string | null => {
    const trimmed = handle.trim();
    
    switch (type) {
      case 'venmo':
        if (trimmed.includes('venmo.com/')) {
          return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
        }
        if (trimmed.startsWith('@')) {
          return `https://venmo.com/${trimmed.substring(1)}`;
        }
        return null;
      
      case 'cashapp':
        if (trimmed.includes('cash.app/')) {
          return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
        }
        if (trimmed.startsWith('$')) {
          return `https://cash.app/${trimmed}`;
        }
        return null;
      
      case 'paypal':
        if (trimmed.includes('paypal.me/') || trimmed.includes('paypal.com/paypalme/')) {
          return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
        }
        return null;
      
      default:
        try {
          const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
          return url.toString();
        } catch {
          return null;
        }
    }
  };

  const handlePaymentClick = (method: any, index: number) => {
    const paymentLink = getPaymentLink(method.type, method.handle);
    const isZelle = method.type === 'zelle';
    
    if (isZelle || !paymentLink) {
      navigator.clipboard.writeText(method.handle);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast({ title: "Copied!", description: `${method.type} ID copied to clipboard` });
    } else {
      window.open(paymentLink, '_blank');
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const isValidAmount = parsedAmount > 0 && 
    (!contributionMinimumAmount || parsedAmount >= contributionMinimumAmount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Contribute
          </DialogTitle>
          {contributionMessage && (
            <DialogDescription>{contributionMessage}</DialogDescription>
          )}
        </DialogHeader>

        {/* Contribution Amount Info */}
        {contributionType === 'fixed' && contributionPerGuest && (
          <div className="p-3 bg-muted rounded-lg text-center">
            <span className="text-sm text-muted-foreground">Requested contribution:</span>
            <span className="ml-2 font-semibold text-lg">${contributionPerGuest}</span>
            <span className="text-sm text-muted-foreground"> per guest</span>
          </div>
        )}

        {/* Progress Bar */}
        {showContributionGoal && contributionGoal > 0 && (
          <div className="space-y-2 pb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Goal Progress</span>
              <span className="font-medium">
                ${currentContributions || 0} / ${contributionGoal}
              </span>
            </div>
            <Progress
              value={((currentContributions || 0) / contributionGoal) * 100}
              className="h-2"
            />
          </div>
        )}

        {/* Credit Card Payment Section */}
        {creditCardPaymentsEnabled && (
          <>
            {!showCardPayment ? (
              <Button 
                onClick={() => setShowCardPayment(true)}
                className="w-full gap-2"
                size="lg"
              >
                <CreditCard className="h-5 w-5" />
                Pay with Credit Card
              </Button>
            ) : (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter your name"
                    value={contributorName}
                    onChange={(e) => setContributorName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (for receipt)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={contributorEmail}
                    onChange={(e) => setContributorEmail(e.target.value)}
                  />
                </div>
                {contributionType !== 'fixed' && (
                  <div className="space-y-2">
                    <Label htmlFor="amount">
                      Amount ($)
                      {contributionMinimumAmount && (
                        <span className="text-muted-foreground ml-1">
                          (min: ${contributionMinimumAmount})
                        </span>
                      )}
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      min={contributionMinimumAmount || 1}
                      step="0.01"
                      placeholder={contributionSuggestedAmount?.toString() || "Enter amount"}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                )}
                
                <StripeCheckoutButton
                  eventId={eventId}
                  amount={parsedAmount}
                  contributorName={contributorName}
                  contributorEmail={contributorEmail}
                  disabled={!contributorName.trim() || !isValidAmount}
                  className="w-full"
                />
                
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowCardPayment(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            )}

            {contributionMethods.length > 0 && !showCardPayment && (
              <>
                <div className="relative">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
                    or pay manually
                  </span>
                </div>
              </>
            )}
          </>
        )}

        {/* Manual Payment Method Buttons */}
        {!showCardPayment && contributionMethods.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {contributionMethods.map((method, index) => {
              const paymentLink = getPaymentLink(method.type, method.handle);
              const isZelle = method.type === 'zelle';
              const isCopied = copiedIndex === index;

              return (
                <Button
                  key={index}
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handlePaymentClick(method, index)}
                >
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    {!isZelle && paymentLink && <ExternalLink className="h-3 w-3" />}
                    {(isZelle || !paymentLink) && (
                      isCopied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />
                    )}
                  </div>
                  <span className="text-sm font-medium capitalize">{method.type}</span>
                  {(isZelle || !paymentLink) && (
                    <span className="text-xs text-muted-foreground truncate max-w-full">
                      {method.handle}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        )}

        {!creditCardPaymentsEnabled && contributionMethods.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No payment methods have been configured for this event.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};
