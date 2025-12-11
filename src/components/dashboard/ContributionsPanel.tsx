import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  DollarSign, CreditCard, Wallet, Check, Clock, Copy, 
  RefreshCw, AlertCircle, UserPlus, ExternalLink, Send, Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { canSendReminder, recordReminderSent, getReminderTemplate, formatDaysRemaining } from "@/lib/contributionReminders";

interface ContributionsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  hostName: string;
  contributionGoal: number;
  contributionMethods: Array<{ type: string; handle: string }>;
  onInviteGuests: () => void;
  onOpenEducationModal: () => void;
}

interface ContributionClaim {
  id: string;
  contributor_name: string;
  contributor_email: string | null;
  contributor_phone: string | null;
  amount_contributed: number | null;
  payment_method: string | null;
  payment_verified: boolean;
  created_at: string;
  claim_type: string;
}

export function ContributionsPanel({
  open,
  onOpenChange,
  eventId,
  eventName,
  hostName,
  contributionGoal,
  contributionMethods,
  onInviteGuests,
  onOpenEducationModal,
}: ContributionsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeClaims, setStripeClaims] = useState<ContributionClaim[]>([]);
  const [manualClaims, setManualClaims] = useState<ContributionClaim[]>([]);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const loadContributions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('item_claims')
        .select('*')
        .eq('event_id', eventId)
        .eq('claim_type', 'monetary')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const claims = (data || []) as ContributionClaim[];
      
      // Separate by payment method
      setStripeClaims(claims.filter(c => c.payment_method === 'card'));
      setManualClaims(claims.filter(c => c.payment_method !== 'card'));
    } catch (err: any) {
      setError(err.message || 'Failed to load contributions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadContributions();
    }
  }, [open, eventId]);

  const handleVerifyPayment = async (claimId: string, newStatus: boolean) => {
    setVerifyingId(claimId);
    try {
      const { error } = await supabase
        .from('item_claims')
        .update({ 
          payment_verified: newStatus,
          verified_at: newStatus ? new Date().toISOString() : null,
        })
        .eq('id', claimId);

      if (error) throw error;

      toast({
        title: newStatus ? "Payment Verified" : "Verification Removed",
        description: newStatus ? "Contribution marked as received" : "Verification has been removed",
      });
      
      loadContributions();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update verification",
        variant: "destructive",
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleSendReminder = async (claim: ContributionClaim) => {
    const check = canSendReminder(claim.id);
    
    if (!check.allowed) {
      toast({
        title: "Reminder Recently Sent",
        description: `You can send another reminder in ${formatDaysRemaining(check.daysRemaining || 0)}`,
        variant: "destructive",
      });
      return;
    }

    // Get payment method info for reminder
    const paymentMethod = contributionMethods[0]?.type || 'your preferred method';
    const paymentHandle = contributionMethods[0]?.handle || '';
    
    const reminderText = getReminderTemplate(
      claim.contributor_name,
      eventName,
      paymentMethod,
      paymentHandle,
      hostName
    );

    // For now, copy to clipboard - SMS/email can be integrated later
    try {
      await navigator.clipboard.writeText(reminderText);
      recordReminderSent(claim.id);
      
      toast({
        title: "Reminder Copied",
        description: "Reminder message copied to clipboard. Paste it into your messaging app.",
      });
    } catch {
      toast({
        title: "Could not copy",
        description: "Please manually copy the reminder message",
        variant: "destructive",
      });
    }
  };

  // Calculate totals
  const stripeTotal = stripeClaims
    .filter(c => c.payment_verified)
    .reduce((sum, c) => sum + (c.amount_contributed || 0), 0);
  
  const manualTotal = manualClaims
    .filter(c => c.payment_verified)
    .reduce((sum, c) => sum + (c.amount_contributed || 0), 0);
  
  const totalCollected = stripeTotal + manualTotal;
  const contributorCount = new Set([
    ...stripeClaims.filter(c => c.payment_verified).map(c => c.contributor_email || c.contributor_name),
    ...manualClaims.filter(c => c.payment_verified).map(c => c.contributor_email || c.contributor_name),
  ]).size;
  
  const averageContribution = contributorCount > 0 ? totalCollected / contributorCount : 0;
  const progressPercent = contributionGoal > 0 ? Math.min((totalCollected / contributionGoal) * 100, 100) : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto pb-safe">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Contributions
          </SheetTitle>
          <SheetDescription>
            Track and manage contributions for {eventName}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Summary Section */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ) : error ? (
                <div className="text-center py-4">
                  <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">{error}</p>
                  <Button variant="outline" size="sm" onClick={loadContributions} className="mt-2">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">${totalCollected.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Total Collected</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{contributorCount}</p>
                      <p className="text-xs text-muted-foreground">Contributors</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">${averageContribution.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Average</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span>Stripe: ${stripeTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-green-600" />
                      <span>Manual: ${manualTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {contributionGoal > 0 && (
                    <div className="space-y-1.5">
                      <Progress value={progressPercent} className="h-2" />
                      <p className="text-xs text-muted-foreground text-right">
                        ${totalCollected.toFixed(2)} of ${contributionGoal.toFixed(2)} goal ({Math.round(progressPercent)}%)
                      </p>
                    </div>
                  )}

                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-xs" 
                    onClick={onOpenEducationModal}
                  >
                    <Info className="h-3 w-3 mr-1" />
                    How payments work
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabs for Stripe / Manual */}
          <Tabs defaultValue="stripe" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="stripe" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Stripe ({stripeClaims.length})
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Wallet className="h-4 w-4" />
                Manual ({manualClaims.length})
              </TabsTrigger>
            </TabsList>

            {/* Stripe Tab */}
            <TabsContent value="stripe" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Stripe processes online payments and pays you out directly.
              </p>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : stripeClaims.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No Stripe contributions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {stripeClaims.map((claim) => (
                    <Card key={claim.id}>
                      <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{claim.contributor_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <div>
                              <p className="font-semibold">${(claim.amount_contributed || 0).toFixed(2)}</p>
                              <Badge variant={claim.payment_verified ? "default" : "secondary"} className="text-xs">
                                {claim.payment_verified ? (
                                  <><Check className="h-3 w-3 mr-1" /> Succeeded</>
                                ) : (
                                  <><Clock className="h-3 w-3 mr-1" /> Pending</>
                                )}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={onInviteGuests} className="flex-1">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Guests
                </Button>
              </div>
            </TabsContent>

            {/* Manual Tab */}
            <TabsContent value="manual" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Manual payments are tracked here for your records. SimplifiedHost does not process these funds.
              </p>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : manualClaims.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No manual contributions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {manualClaims.map((claim) => {
                    const reminderCheck = canSendReminder(claim.id);
                    
                    return (
                      <Card key={claim.id}>
                        <CardContent className="py-3 px-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{claim.contributor_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${(claim.amount_contributed || 0).toFixed(2)}</p>
                              <Badge 
                                variant={claim.payment_verified ? "default" : "outline"} 
                                className={claim.payment_verified ? "bg-green-600" : ""}
                              >
                                {claim.payment_verified ? (
                                  <><Check className="h-3 w-3 mr-1" /> Verified</>
                                ) : (
                                  "Not verified"
                                )}
                              </Badge>
                            </div>
                          </div>

                          {!claim.payment_verified && (
                            <div className="flex gap-2 pt-1">
                              <Button 
                                size="sm" 
                                onClick={() => handleVerifyPayment(claim.id, true)}
                                disabled={verifyingId === claim.id}
                                className="flex-1 h-9"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Verify Payment
                              </Button>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleSendReminder(claim)}
                                      disabled={!reminderCheck.allowed}
                                      className="flex-1 h-9"
                                    >
                                      <Copy className="h-4 w-4 mr-1" />
                                      {reminderCheck.allowed ? "Copy Reminder" : `Wait ${formatDaysRemaining(reminderCheck.daysRemaining || 0)}`}
                                    </Button>
                                  </TooltipTrigger>
                                  {!reminderCheck.allowed && (
                                    <TooltipContent>
                                      <p>Reminder sent recently. Wait {formatDaysRemaining(reminderCheck.daysRemaining || 0)} before sending again.</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}

                          {claim.payment_verified && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleVerifyPayment(claim.id, false)}
                              disabled={verifyingId === claim.id}
                              className="w-full h-8 text-muted-foreground"
                            >
                              Remove verification
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              <Separator />

              <p className="text-xs text-muted-foreground text-center">
                Verify when you've received payment via your chosen method. SimplifiedHost does not process manual payments.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
