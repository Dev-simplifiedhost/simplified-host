import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign, Save, Loader2, CreditCard, Wallet, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { StripeConnectSetup } from "./StripeConnectSetup";

interface ContributionSettingsProps {
  eventId: string;
  currentSettings: {
    contributionsEnabled: boolean;
    contributionType: string;
    contributionPerGuest: number | null;
    contributionSuggestedAmount: number | null;
    contributionMinimumAmount: number | null;
    contributionGoal: number | null;
    contributionMessage: string | null;
    creditCardPaymentsEnabled: boolean;
    contributionMethods: Array<{ type: string; handle: string }>;
    contributionPolicyNote?: string | null;
  };
  onUpdate: () => void;
}

export function ContributionSettings({
  eventId,
  currentSettings,
  onUpdate,
}: ContributionSettingsProps) {
  const [saving, setSaving] = useState(false);
  const [contributionsEnabled, setContributionsEnabled] = useState(currentSettings.contributionsEnabled);
  const [contributionType, setContributionType] = useState(currentSettings.contributionType || 'freeform');
  const [contributionPerGuest, setContributionPerGuest] = useState<string>(
    currentSettings.contributionPerGuest?.toString() || ''
  );
  const [suggestedAmount, setSuggestedAmount] = useState<string>(
    currentSettings.contributionSuggestedAmount?.toString() || ''
  );
  const [minimumAmount, setMinimumAmount] = useState<string>(
    currentSettings.contributionMinimumAmount?.toString() || ''
  );
  const [goalAmount, setGoalAmount] = useState<string>(
    currentSettings.contributionGoal?.toString() || ''
  );
  const [contributionMessage, setContributionMessage] = useState(
    currentSettings.contributionMessage || ''
  );
  const [creditCardPaymentsEnabled, setCreditCardPaymentsEnabled] = useState(
    currentSettings.creditCardPaymentsEnabled
  );
  const [stripeStatus, setStripeStatus] = useState<string>('not_connected');
  const [hasLoadedDefaults, setHasLoadedDefaults] = useState(false);
  const [manualPaymentsEnabled, setManualPaymentsEnabled] = useState(
    currentSettings.contributionMethods.length > 0
  );
  const [manualMethods, setManualMethods] = useState<Array<{ type: string; handle: string }>>(
    currentSettings.contributionMethods.length > 0 
      ? currentSettings.contributionMethods 
      : [{ type: 'venmo', handle: '' }]
  );
  const [contributionPolicyNote, setContributionPolicyNote] = useState(
    currentSettings.contributionPolicyNote || ''
  );

  // Auto-populate contribution methods from user's default payment methods
  useEffect(() => {
    const loadDefaultPaymentMethods = async () => {
      // Only load defaults when contributions are newly enabled and no methods exist
      if (contributionsEnabled && 
          currentSettings.contributionMethods.length === 0 && 
          !hasLoadedDefaults) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: profile } = await supabase
            .from('profiles')
            .select('default_payment_methods')
            .eq('id', user.id)
            .single();

          if (profile?.default_payment_methods && 
              Array.isArray(profile.default_payment_methods) && 
              profile.default_payment_methods.length > 0) {
            // Update the event with default payment methods
            const { error } = await supabase
              .from('events')
              .update({ 
                contribution_methods: profile.default_payment_methods 
              })
              .eq('id', eventId);

            if (!error) {
              toast({
                title: "Payment methods added",
                description: "Your saved payment methods have been added to this event",
              });
              onUpdate(); // Refresh to get updated contribution methods
            }
          }
          setHasLoadedDefaults(true);
        } catch (error) {
          console.error("Error loading default payment methods:", error);
        }
      }
    };

    loadDefaultPaymentMethods();
  }, [contributionsEnabled, currentSettings.contributionMethods.length, eventId, hasLoadedDefaults, onUpdate]);

  useEffect(() => {
    setContributionsEnabled(currentSettings.contributionsEnabled);
    setContributionType(currentSettings.contributionType || 'freeform');
    setContributionPerGuest(currentSettings.contributionPerGuest?.toString() || '');
    setSuggestedAmount(currentSettings.contributionSuggestedAmount?.toString() || '');
    setMinimumAmount(currentSettings.contributionMinimumAmount?.toString() || '');
    setGoalAmount(currentSettings.contributionGoal?.toString() || '');
    setContributionMessage(currentSettings.contributionMessage || '');
    setCreditCardPaymentsEnabled(currentSettings.creditCardPaymentsEnabled);
    setManualPaymentsEnabled(currentSettings.contributionMethods.length > 0);
    setManualMethods(
      currentSettings.contributionMethods.length > 0 
        ? currentSettings.contributionMethods 
        : [{ type: 'venmo', handle: '' }]
    );
    setContributionPolicyNote(currentSettings.contributionPolicyNote || '');
  }, [currentSettings]);

  const addManualMethod = () => {
    setManualMethods([...manualMethods, { type: 'venmo', handle: '' }]);
  };

  const removeManualMethod = (index: number) => {
    setManualMethods(manualMethods.filter((_, i) => i !== index));
  };

  const updateManualMethod = (index: number, field: 'type' | 'handle', value: string) => {
    const updated = [...manualMethods];
    updated[index] = { ...updated[index], [field]: value };
    setManualMethods(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Filter out empty manual methods
      const validMethods = manualPaymentsEnabled 
        ? manualMethods.filter(m => m.handle.trim() !== '') 
        : [];

      const { error } = await supabase
        .from('events')
        .update({
          contributions_enabled: contributionsEnabled,
          contribution_type: contributionType,
          contribution_per_guest: contributionPerGuest ? parseFloat(contributionPerGuest) : null,
          contribution_suggested_amount: suggestedAmount ? parseFloat(suggestedAmount) : null,
          contribution_minimum_amount: minimumAmount ? parseFloat(minimumAmount) : null,
          contribution_goal: goalAmount ? parseFloat(goalAmount) : null,
          contribution_message: contributionMessage || null,
          credit_card_payments_enabled: creditCardPaymentsEnabled && stripeStatus === 'complete',
          contribution_methods: validMethods,
          contribution_policy_note: contributionPolicyNote.trim() || null,
        })
        .eq('id', eventId);

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Contribution settings have been updated",
      });
      onUpdate();
    } catch (error: any) {
      console.error('Error saving contribution settings:', error);
      toast({
        title: "Failed to save",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Check if any payment method is configured
  const hasPaymentMethod = (stripeStatus === 'complete' && creditCardPaymentsEnabled) || 
    (manualPaymentsEnabled && manualMethods.some(m => m.handle.trim() !== ''));

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Enable Contributions
              </CardTitle>
              <CardDescription>
                Allow guests to contribute money for your event
              </CardDescription>
            </div>
            <Switch
              checked={contributionsEnabled}
              onCheckedChange={setContributionsEnabled}
              aria-label="Toggle contributions"
            />
          </div>
        </CardHeader>
      </Card>

      {contributionsEnabled && (
        <>
          {/* Payment method empty state */}
          {!hasPaymentMethod && (
            <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Add a payment method to enable contributions.
              </p>
            </div>
          )}

          {/* Contribution Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contribution Type</CardTitle>
              <CardDescription>How do you want to request contributions?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={contributionType} onValueChange={setContributionType}>
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <div className="space-y-1">
                    <Label htmlFor="fixed" className="font-medium cursor-pointer">
                      Fixed Amount Per Guest
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Request a specific amount from each guest (e.g., "$25 per person")
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value="freeform" id="freeform" />
                  <div className="space-y-1">
                    <Label htmlFor="freeform" className="font-medium cursor-pointer">
                      Freeform / Flexible
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Set suggested/minimum amounts and let guests choose how much to give
                    </p>
                  </div>
                </div>
              </RadioGroup>

              <Separator />

              {contributionType === 'fixed' && (
                <div className="space-y-2">
                  <Label htmlFor="perGuest">Requested Amount Per Guest ($)</Label>
                  <Input
                    id="perGuest"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="25.00"
                    value={contributionPerGuest}
                    onChange={(e) => setContributionPerGuest(e.target.value)}
                  />
                </div>
              )}

              {contributionType === 'freeform' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="suggested">Suggested Amount ($)</Label>
                    <Input
                      id="suggested"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="30.00"
                      value={suggestedAmount}
                      onChange={(e) => setSuggestedAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minimum">Minimum Amount ($)</Label>
                    <Input
                      id="minimum"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Optional"
                      value={minimumAmount}
                      onChange={(e) => setMinimumAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="goal">Goal Amount ($)</Label>
                    <Input
                      id="goal"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Optional"
                      value={goalAmount}
                      onChange={(e) => setGoalAmount(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="message">Note for Guests (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="e.g., Covers food, drinks, and decorations"
                  value={contributionMessage}
                  onChange={(e) => setContributionMessage(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Methods</CardTitle>
              <CardDescription>Choose how guests can contribute</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stripe Toggle */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="stripe-enabled" 
                    checked={creditCardPaymentsEnabled || stripeStatus === 'complete'}
                    onCheckedChange={(checked) => setCreditCardPaymentsEnabled(!!checked)}
                    disabled={stripeStatus !== 'complete'}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="stripe-enabled" className="font-medium flex items-center gap-2 cursor-pointer">
                      <CreditCard className="h-4 w-4" />
                      Credit Card (Stripe)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Accept card and digital wallet payments (4.5% fee)
                    </p>
                  </div>
                </div>
                
                <StripeConnectSetup onStatusChange={setStripeStatus} />
                
                {/* Stripe hint text */}
                <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                  <p>Payments go directly to your bank via Stripe Connect Standard.</p>
                  <p>SimplifiedHost never holds your funds and is not a money transmitter.</p>
                  <p>Guests pay all processing fees.</p>
                </div>
                
                {stripeStatus !== 'complete' && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    You must complete Stripe onboarding before guests can pay by card.
                  </p>
                )}
              </div>

              <Separator />

              {/* Manual Payments Toggle */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="manual-enabled" 
                    checked={manualPaymentsEnabled}
                    onCheckedChange={(checked) => setManualPaymentsEnabled(!!checked)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="manual-enabled" className="font-medium flex items-center gap-2 cursor-pointer">
                      <Wallet className="h-4 w-4" />
                      Manual Payments (Venmo, Zelle, Cash App, etc.)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Share your payment handles for guests to pay directly
                    </p>
                  </div>
                </div>

                {manualPaymentsEnabled && (
                  <div className="pl-6 space-y-3">
                    {manualMethods.map((method, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <select
                            value={method.type}
                            onChange={(e) => updateManualMethod(index, 'type', e.target.value)}
                            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label="Payment method type"
                          >
                            <option value="venmo">Venmo</option>
                            <option value="zelle">Zelle</option>
                            <option value="cashapp">Cash App</option>
                            <option value="paypal">PayPal</option>
                            <option value="other">Other</option>
                          </select>
                          <Input
                            placeholder={method.type === 'venmo' ? '@username' : method.type === 'cashapp' ? '$cashtag' : 'Handle or email'}
                            value={method.handle}
                            onChange={(e) => updateManualMethod(index, 'handle', e.target.value)}
                            aria-label="Payment handle"
                          />
                        </div>
                        {manualMethods.length > 1 && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeManualMethod(index)}
                            className="h-10 w-10"
                            aria-label="Remove payment method"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={addManualMethod}
                      className="w-full h-10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Method
                    </Button>
                    <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1 mt-3">
                      <p>Share your personal payment handles so guests can pay you directly.</p>
                      <p>These payments occur outside SimplifiedHost and are not tracked or verified by the platform.</p>
                      <p>Guests pay any processing fees charged by the payment service.</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contribution Policy Note */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contribution Policy (Optional)</CardTitle>
              <CardDescription>Set expectations for guests</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder='Example: "Contributions are final" or "Contact me if your plans change"'
                value={contributionPolicyNote}
                onChange={(e) => setContributionPolicyNote(e.target.value)}
                rows={2}
                aria-label="Contribution policy note"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Shown to guests below the contribution module.
              </p>
              <div className="mt-3 p-3 rounded-md bg-muted/30 text-xs text-muted-foreground">
                <p className="font-medium mb-1">Examples:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>"Any amount is welcome — thank you!"</li>
                  <li>"Suggested contribution: $20 per guest."</li>
                  <li>"All payments are final but if you have any issues, please let me know!"</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="sticky bottom-0 bg-background pt-4 pb-safe">
            <Button onClick={handleSave} disabled={saving} className="w-full h-12">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Contribution Settings
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
