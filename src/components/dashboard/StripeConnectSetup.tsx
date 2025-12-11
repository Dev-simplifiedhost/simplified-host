import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, CheckCircle, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface StripeConnectSetupProps {
  onStatusChange?: (status: string) => void;
}

export function StripeConnectSetup({ onStatusChange }: StripeConnectSetupProps) {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState<string>('not_connected');
  const [accountDetails, setAccountDetails] = useState<{
    chargesEnabled?: boolean;
    payoutsEnabled?: boolean;
  } | null>(null);

  useEffect(() => {
    checkStripeStatus();

    // Check URL params for Stripe return
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_success') === 'true') {
      // Refresh status after successful onboarding
      setTimeout(checkStripeStatus, 1000);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (urlParams.get('stripe_refresh') === 'true') {
      // User needs to continue onboarding
      toast({
        title: "Setup incomplete",
        description: "Please complete your Stripe account setup to accept card payments",
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const checkStripeStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('check-stripe-account');
      
      if (error) throw error;

      setStatus(data.status || 'not_connected');
      setAccountDetails({
        chargesEnabled: data.chargesEnabled,
        payoutsEnabled: data.payoutsEnabled,
      });
      onStatusChange?.(data.status || 'not_connected');
    } catch (error) {
      console.error('Error checking Stripe status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const returnUrl = window.location.href.split('?')[0];
      
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-link', {
        body: { returnUrl },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No onboarding URL received');

      // Redirect to Stripe onboarding
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Error connecting Stripe:', error);
      toast({
        title: "Failed to connect Stripe",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Credit Card Payments
            </CardTitle>
            <CardDescription>
              Accept credit card payments from guests via Stripe
            </CardDescription>
          </div>
          <StatusBadge status={status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === 'not_connected' && (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Connect your bank account to accept credit card payments. Setup takes about 60-90 seconds.
                SimplifiedHost takes a 4.5% platform fee on card payments.
              </AlertDescription>
            </Alert>
            <Button onClick={handleConnect} disabled={connecting} className="w-full">
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Connect Stripe Account
                </>
              )}
            </Button>
          </>
        )}

        {status === 'pending' && (
          <>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your Stripe account setup is incomplete. Please complete the onboarding process to start accepting payments.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2">
              <Button onClick={handleConnect} disabled={connecting} className="flex-1">
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={checkStripeStatus} size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {status === 'complete' && (
          <>
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Stripe account connected and ready!</span>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>✓ Card payments enabled</p>
              <p>✓ Payouts to your bank account enabled</p>
              <p className="text-xs">Platform fee: 4.5% per transaction</p>
            </div>
            <Button variant="outline" onClick={checkStripeStatus} size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Status
            </Button>
          </>
        )}

        {status === 'restricted' && (
          <>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your Stripe account has restrictions. Please update your account information to continue accepting payments.
              </AlertDescription>
            </Alert>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4 mr-2" />
              )}
              Update Account
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'complete':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Connected</Badge>;
    case 'pending':
      return <Badge variant="outline" className="text-amber-600 border-amber-600">Pending</Badge>;
    case 'restricted':
      return <Badge variant="destructive">Restricted</Badge>;
    default:
      return <Badge variant="secondary">Not Connected</Badge>;
  }
}
