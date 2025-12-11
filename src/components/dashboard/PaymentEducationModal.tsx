import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Wallet, RefreshCw, FileText, Info } from "lucide-react";

interface PaymentEducationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentEducationModal({ open, onOpenChange }: PaymentEducationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" />
            How Payments Work
          </DialogTitle>
          <DialogDescription>
            Understanding contributions on SimplifiedHost
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Online Payments Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CreditCard className="h-4 w-4 text-primary" />
              Online Payments (Stripe)
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              Stripe handles card and wallet payments and pays you out directly. 
              SimplifiedHost does not hold funds or issue refunds.
            </p>
          </div>

          <Separator />

          {/* Manual Payments Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="h-4 w-4 text-green-600" />
              Manual Payments
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              Manual payments like Venmo, Zelle, or cash are not processed by SimplifiedHost. 
              You can record them here for your own tracking.
            </p>
          </div>

          <Separator />

          {/* Refunds Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <RefreshCw className="h-4 w-4 text-amber-600" />
              Refunds
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              Stripe refunds must be done through your Stripe dashboard. 
              Manual refunds are handled directly between you and your guests.
            </p>
          </div>

          <Separator />

          {/* Taxes Section */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Taxes
            </div>
            <p className="text-sm text-muted-foreground pl-6">
              SimplifiedHost does not provide accounting or tax documentation. 
              Please consult with your tax advisor for reporting requirements.
            </p>
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={() => onOpenChange(false)} className="w-full">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
