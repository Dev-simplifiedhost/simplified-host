import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArrowLeft, CreditCard, Wallet, Building2, Plus, X, Loader2, CheckCircle, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
interface PaymentMethod {
  type: string;
  handle: string;
}
interface StripeAccountDetails {
  status: string;
  accountId?: string;
  payoutsEnabled?: boolean;
  chargesEnabled?: boolean;
}
const PAYMENT_METHOD_OPTIONS = [{
  value: "venmo",
  label: "Venmo",
  placeholder: "@username"
}, {
  value: "zelle",
  label: "Zelle",
  placeholder: "email or phone"
}, {
  value: "cashapp",
  label: "Cash App",
  placeholder: "$cashtag"
}, {
  value: "paypal",
  label: "PayPal",
  placeholder: "paypal.me/username"
}];
const PaymentSettings = () => {
  const {
    user,
    loading: authLoading
  } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{
    display_name: string | null;
    phone_number: string | null;
  } | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [stripeStatus, setStripeStatus] = useState<StripeAccountDetails>({
    status: 'not_connected'
  });
  const [stripeLoading, setStripeLoading] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    loadData();
  }, [user, authLoading, navigate]);
  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load profile and payment methods
      const {
        data,
        error
      } = await supabase.from("profiles").select("display_name, phone_number, default_payment_methods").eq("id", user.id).single();
      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile:", error);
      }
      if (data) {
        setProfile({
          display_name: data.display_name,
          phone_number: data.phone_number
        });
        const methods = data.default_payment_methods;
        if (Array.isArray(methods)) {
          setPaymentMethods(methods.map((m: any) => ({
            type: m.type || '',
            handle: m.handle || ''
          })));
        }
      }

      // Check Stripe status
      await checkStripeStatus();
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };
  const checkStripeStatus = async () => {
    setStripeLoading(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) return;
      const response = await supabase.functions.invoke('check-stripe-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (response.data) {
        setStripeStatus({
          status: response.data.status || 'not_connected',
          accountId: response.data.accountId,
          payoutsEnabled: response.data.payoutsEnabled,
          chargesEnabled: response.data.chargesEnabled
        });
      }
    } catch (error) {
      console.error("Error checking Stripe status:", error);
    } finally {
      setStripeLoading(false);
    }
  };
  const handleConnectStripe = async () => {
    setConnectingStripe(true);
    try {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to continue");
        return;
      }
      const response = await supabase.functions.invoke('create-stripe-connect-link', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error: any) {
      console.error("Error connecting Stripe:", error);
      toast.error(error.message || "Failed to connect Stripe");
    } finally {
      setConnectingStripe(false);
    }
  };
  const addPaymentMethod = () => {
    if (paymentMethods.length >= 4) {
      toast.error("Maximum 4 payment methods allowed");
      return;
    }
    setPaymentMethods([...paymentMethods, {
      type: "",
      handle: ""
    }]);
  };
  const updatePaymentMethod = (index: number, field: 'type' | 'handle', value: string) => {
    const updated = [...paymentMethods];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setPaymentMethods(updated);
  };
  const removePaymentMethod = (index: number) => {
    setPaymentMethods(paymentMethods.filter((_, i) => i !== index));
  };
  const savePaymentMethods = async () => {
    if (!user) return;

    // Validate methods
    const validMethods = paymentMethods.filter(m => m.type && m.handle.trim());
    setSaving(true);
    try {
      const {
        error
      } = await supabase.from("profiles").update({
        default_payment_methods: validMethods as unknown as null
      }).eq("id", user.id);
      if (error) throw error;
      setPaymentMethods(validMethods);
      toast.success("Payment methods saved");
    } catch (error: any) {
      console.error("Error saving payment methods:", error);
      toast.error("Failed to save payment methods");
    } finally {
      setSaving(false);
    }
  };
  const getPlaceholder = (type: string) => {
    return PAYMENT_METHOD_OPTIONS.find(o => o.value === type)?.placeholder || "Enter handle";
  };
  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  if (!user) return null;
  return <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Header - hidden on mobile */}
      <div className="hidden md:block">
        <Header />
      </div>
      
      <main className="flex-1 pb-24 md:pb-16">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-10 bg-background border-b pt-safe">
          <div className="h-14 flex items-center px-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground h-12 -ml-2 px-2">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold flex-1 text-center mr-8">Payment Settings</h1>
          </div>
        </div>

        {/* Desktop Title */}
        <div className="hidden md:block py-8 bg-background border-b">
          <div className="max-w-2xl mx-auto px-4">
            <h1 className="text-2xl font-bold">Payment Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your payout account and default payment methods</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto w-full">
          <div className="py-4 space-y-6">
            {/* Account Details Section */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">
                Account Details
              </p>
              <div className="bg-card border-y md:mx-4 md:rounded-lg md:border">
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{user.email}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/profile')} className="text-primary">
                      Edit in Profile
                    </Button>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Phone Number</p>
                      <p className="font-medium">{profile?.phone_number || "Not set"}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/profile')} className="text-primary">
                      Edit in Profile
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stripe Connect Section */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">
                Receive Card Payments
              </p>
              <div className="bg-card border-y md:mx-4 md:rounded-lg md:border">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg font-sans">Payout Account</h3>
                        {stripeLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : stripeStatus.status === 'complete' ? <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            <CheckCircle className="h-3 w-3" />
                            Connected
                          </span> : stripeStatus.status === 'pending' ? <span className="inline-flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                            <AlertCircle className="h-3 w-3" />
                            Pending
                          </span> : null}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">Accept credit card, apple pay 
payments from guests. Money goes directly to your bank.</p>

                      {stripeStatus.status === 'complete' && <div className="mt-3 space-y-1.5 text-sm">
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Card payments enabled</span>
                          </div>
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Payouts to your bank enabled</span>
                          </div>
                          <p className="text-muted-foreground mt-2">
                            Platform fee: 4.5% per transaction
                          </p>
                        </div>}

                      <div className="mt-4 flex flex-wrap gap-2 my-[10px]">
                        {stripeStatus.status === 'not_connected' && <Button onClick={handleConnectStripe} disabled={connectingStripe} className="h-10">
                            {connectingStripe ? <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Connecting...
                              </> : <>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Connect Stripe Account
                              </>}
                          </Button>}

                        {stripeStatus.status === 'pending' && <Button onClick={handleConnectStripe} disabled={connectingStripe} className="h-10">
                            {connectingStripe ? <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Loading...
                              </> : "Complete Setup"}
                          </Button>}

                        {stripeStatus.status === 'complete' && <Button variant="outline" onClick={handleConnectStripe} disabled={connectingStripe} className="h-10">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Manage Payout Account
                          </Button>}

                        
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Default Payment Methods Section */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">
                Default Manual Payment Methods
              </p>
              <div className="bg-card border-y md:mx-4 md:rounded-lg md:border">
                <div className="p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <Wallet className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg font-sans">Manual Payment Methods</h3>
                      <p className="text-sm text-muted-foreground">
                        Save your Venmo, Zelle, Cash App, or PayPal details. They'll auto-populate when you enable contributions for new events.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {paymentMethods.map((method, index) => <div key={index} className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                        <Select value={method.type} onValueChange={value => updatePaymentMethod(index, 'type', value)}>
                          <SelectTrigger className="w-32 h-10">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHOD_OPTIONS.map(option => <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input placeholder={getPlaceholder(method.type)} value={method.handle} onChange={e => updatePaymentMethod(index, 'handle', e.target.value)} className="flex-1 h-10" />
                        <Button variant="ghost" size="icon" onClick={() => removePaymentMethod(index)} className="h-10 w-10 shrink-0">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>)}

                    {paymentMethods.length < 4 && <Button variant="outline" onClick={addPaymentMethod} className="w-full h-10">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Payment Method
                      </Button>}

                    {paymentMethods.length > 0 && <Button onClick={savePaymentMethods} disabled={saving} className="w-full h-10 mt-2">
                        {saving ? <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </> : "Save Payment Methods"}
                      </Button>}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History Link */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">
                Payment History
              </p>
              <div className="bg-card border-y md:mx-4 md:rounded-lg md:border">
                <button onClick={() => navigate('/dashboard?tab=payments')} className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">View Payment History</p>
                      <p className="text-sm text-muted-foreground">See payments received from guests</p>
                    </div>
                  </div>
                  <ArrowLeft className="h-5 w-5 text-muted-foreground rotate-180" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer - hidden on mobile */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>;
};
export default PaymentSettings;