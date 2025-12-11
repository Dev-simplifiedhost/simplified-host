import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";

interface PaymentItem {
  contributor_name: string;
  amount_contributed: number;
  item: { name: string };
}

interface BulkPaymentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'verify' | 'deny';
  payments: PaymentItem[];
  onConfirm: () => void;
  loading: boolean;
}

export function BulkPaymentConfirmDialog({
  open,
  onOpenChange,
  action,
  payments,
  onConfirm,
  loading
}: BulkPaymentConfirmDialogProps) {
  const totalAmount = payments.reduce((sum, p) => sum + p.amount_contributed, 0);
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {action === 'verify' ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" />
                Verify {payments.length} Payment{payments.length !== 1 ? 's' : ''}?
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-600" />
                Deny {payments.length} Payment{payments.length !== 1 ? 's' : ''}?
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {action === 'verify' 
              ? 'This will mark the following payments as verified and update the item fulfillment status.'
              : 'This will permanently delete the following unverified payment claims. This action cannot be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="font-medium">Total Amount</span>
            <Badge variant="outline" className="text-lg">
              ${totalAmount.toFixed(2)}
            </Badge>
          </div>
          
          <ScrollArea className="h-[300px] border rounded-md p-4">
            <div className="space-y-3">
              {payments.map((payment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-background border rounded-md">
                  <div>
                    <p className="font-medium">{payment.contributor_name}</p>
                    <p className="text-sm text-muted-foreground">{payment.item.name}</p>
                  </div>
                  <span className="font-bold">${payment.amount_contributed.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className={action === 'verify' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                {action === 'verify' ? 'Verify All' : 'Deny All'}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
