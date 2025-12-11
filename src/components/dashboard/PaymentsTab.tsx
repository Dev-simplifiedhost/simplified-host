import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  CreditCard, 
  Wallet,
  CheckCircle2,
  Clock,
  Settings,
  ExternalLink,
  Info,
  MessageSquare,
  Loader2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { PaymentEducationModal } from "./PaymentEducationModal";
import { canSendReminder, recordReminderSent, formatDaysRemaining } from "@/lib/contributionReminders";

interface PaymentsTabProps {
  eventId: string;
  eventName: string;
  hostName?: string;
  contributionsEnabled: boolean;
  contributionGoal: number | null;
  contributionMethods?: {
    type: string;
    handle: string;
  }[];
  isCollaborator?: boolean;
  onOpenSettings: () => void;
  onShareEvent: () => void;
}

interface Claim {
  id: string;
  contributor_name: string;
  contributor_email: string | null;
  contributor_phone: string | null;
  country_code: string | null;
  amount_contributed: number | null;
  payment_method: string | null;
  payment_verified: boolean;
  created_at: string;
}

export const PaymentsTab = ({
  eventId,
  eventName,
  hostName,
  contributionsEnabled,
  contributionGoal,
  contributionMethods = [],
  isCollaborator = false,
  onOpenSettings,
  onShareEvent,
}: PaymentsTabProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stripeClaims, setStripeClaims] = useState<Claim[]>([]);
  const [manualClaims, setManualClaims] = useState<Claim[]>([]);
  const [educationModalOpen, setEducationModalOpen] = useState(false);
  const [reminderStates, setReminderStates] = useState<Record<string, { canSend: boolean; message?: string }>>({});
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  useEffect(() => {
    if (contributionsEnabled) {
      loadClaims();
    }
  }, [eventId, contributionsEnabled]);

  const loadClaims = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('item_claims')
      .select('*')
      .eq('event_id', eventId)
      .eq('claim_type', 'monetary')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error loading payments",
        description: error.message,
        variant: "destructive"
      });
    } else {
      const claims = data || [];
      setStripeClaims(claims.filter(c => c.payment_method === 'card' && c.payment_verified));
      setManualClaims(claims.filter(c => c.payment_method !== 'card'));
      
      // Check reminder states for manual claims
      const states: Record<string, { canSend: boolean; message?: string }> = {};
      claims.filter(c => c.payment_method !== 'card').forEach(c => {
        const result = canSendReminder(c.id);
        states[c.id] = {
          canSend: result.allowed,
          message: result.daysRemaining ? `Wait ${formatDaysRemaining(result.daysRemaining)}` : undefined
        };
      });
      setReminderStates(states);
    }
    
    setLoading(false);
  };

  const handleVerifyPayment = async (claimId: string) => {
    const { error } = await supabase
      .from('item_claims')
      .update({ 
        payment_verified: true, 
        verified_at: new Date().toISOString() 
      })
      .eq('id', claimId);

    if (error) {
      toast({
        title: "Error verifying payment",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Payment verified",
        description: "The manual payment has been marked as verified"
      });
      loadClaims();
    }
  };

  const handleSendSmsReminder = async (claim: Claim) => {
    if (!claim.contributor_phone) {
      toast({
        title: "Cannot send SMS",
        description: "No phone number available for this contributor",
        variant: "destructive"
      });
      return;
    }

    setSendingReminder(claim.id);
    
    try {
      const paymentMethod = contributionMethods[0];
      
      const { data, error } = await supabase.functions.invoke('send-payment-reminder', {
        body: {
          claim_id: claim.id,
          event_id: eventId,
          contributor_name: claim.contributor_name,
          contributor_phone: claim.contributor_phone,
          country_code: claim.country_code || 'US',
          amount: claim.amount_contributed,
          payment_method: paymentMethod?.type,
          payment_handle: paymentMethod?.handle,
          host_name: hostName,
          event_name: eventName
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      recordReminderSent(claim.id);
      
      toast({
        title: "Reminder sent",
        description: `SMS reminder sent to ${claim.contributor_name}`
      });
      
      // Update reminder states
      setReminderStates(prev => ({
        ...prev,
        [claim.id]: { canSend: false, message: `Wait ${formatDaysRemaining(3)}` }
      }));
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      toast({
        title: "Failed to send reminder",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setSendingReminder(null);
    }
  };

  const stripeTotal = stripeClaims.reduce((sum, c) => sum + Number(c.amount_contributed || 0), 0);
  const manualVerifiedTotal = manualClaims
    .filter(c => c.payment_verified)
    .reduce((sum, c) => sum + Number(c.amount_contributed || 0), 0);
  const totalContributions = stripeTotal + manualVerifiedTotal;
  const totalContributors = new Set([
    ...stripeClaims.map(c => c.contributor_email || c.contributor_name),
    ...manualClaims.filter(c => c.payment_verified).map(c => c.contributor_email || c.contributor_name)
  ]).size;
  const averageContribution = totalContributors > 0 ? totalContributions / totalContributors : 0;
  const goalProgress = contributionGoal ? Math.min((totalContributions / contributionGoal) * 100, 100) : 0;

  if (!contributionsEnabled) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Contributions Disabled</h3>
          <p className="text-muted-foreground mb-6">
            {isCollaborator 
              ? "The host has not enabled contributions for this event."
              : "Enable contributions to collect payments from guests"
            }
          </p>
          {!isCollaborator && (
            <Button onClick={onOpenSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Enable Contributions
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Disclaimer Banner */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="py-3 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            Payments are processed by Stripe. SimplifiedHost does not hold funds.
            <Button 
              variant="link" 
              className="h-auto p-0 text-blue-600 dark:text-blue-400 ml-1"
              onClick={() => setEducationModalOpen(true)}
            >
              Learn more
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="h-4 w-4" />
              Total
            </div>
            <div className="text-2xl font-bold">${totalContributions.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Users className="h-4 w-4" />
              Contributors
            </div>
            <div className="text-2xl font-bold">{totalContributors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Average
            </div>
            <div className="text-2xl font-bold">${averageContribution.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <CreditCard className="h-4 w-4" />
              Via Stripe
            </div>
            <div className="text-2xl font-bold">${stripeTotal.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Goal Progress */}
      {contributionGoal && contributionGoal > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Goal Progress</span>
              <span className="text-sm font-medium">
                ${totalContributions.toFixed(2)} of ${contributionGoal.toFixed(2)}
              </span>
            </div>
            <Progress value={goalProgress} className="h-2" />
            <div className="text-xs text-muted-foreground mt-1 text-right">
              {Math.round(goalProgress)}% complete
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payments Tabs */}
      <Tabs defaultValue="stripe" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stripe" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Stripe ({stripeClaims.length})
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Manual ({manualClaims.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stripe" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>
                Stripe processes online payments and pays you out directly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : stripeClaims.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No Stripe payments yet
                </div>
              ) : (
                <div className="space-y-3">
                  {stripeClaims.map((claim) => (
                    <div 
                      key={claim.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <div className="font-medium">{claim.contributor_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Succeeded
                        </Badge>
                        <span className="font-bold">${Number(claim.amount_contributed).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>
                Manual payments are tracked here for your records only. SimplifiedHost does not verify or move these funds.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : manualClaims.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No manual payments recorded
                </div>
              ) : (
                <div className="space-y-3">
                  {manualClaims.map((claim) => (
                    <div 
                      key={claim.id} 
                      className="p-4 rounded-lg bg-muted/50 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{claim.contributor_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(claim.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {claim.payment_verified ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Not Verified
                            </Badge>
                          )}
                          <span className="font-bold">${Number(claim.amount_contributed).toFixed(2)}</span>
                        </div>
                      </div>
                      
                      {!claim.payment_verified && !isCollaborator && (
                        <div className="flex flex-wrap gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="h-10"
                            onClick={() => handleVerifyPayment(claim.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Verify Payment
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="h-10"
                            onClick={() => handleSendSmsReminder(claim)}
                            disabled={!reminderStates[claim.id]?.canSend || sendingReminder === claim.id || !claim.contributor_phone}
                            title={!claim.contributor_phone ? 'No phone number available' : reminderStates[claim.id]?.message}
                          >
                            {sendingReminder === claim.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <MessageSquare className="h-4 w-4 mr-2" />
                                {!claim.contributor_phone 
                                  ? 'No Phone' 
                                  : reminderStates[claim.id]?.canSend 
                                    ? 'Send Reminder' 
                                    : reminderStates[claim.id]?.message}
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                      {!claim.payment_verified && isCollaborator && (
                        <div className="text-xs text-muted-foreground">
                          Only the host can verify payments
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="h-10" onClick={onShareEvent}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Copy Event Link
        </Button>
        {!isCollaborator && (
          <Button variant="outline" className="h-10" onClick={onOpenSettings}>
            <Settings className="h-4 w-4 mr-2" />
            Contribution Settings
          </Button>
        )}
      </div>

      <PaymentEducationModal
        open={educationModalOpen}
        onOpenChange={setEducationModalOpen}
      />
    </div>
  );
};
