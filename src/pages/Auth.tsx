import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldAlert } from "lucide-react";
import logo from "@/assets/logo.svg";
import { z } from "zod";
import { createEventFromPlan } from "@/lib/createEventFromPlan";
import { Footer } from "@/components/Footer";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import { calculateLoginDelay, formatDelayTime } from "@/lib/passwordStrength";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signUpSchema, signInSchema } from "@/lib/formValidation";
import { sanitizeEmail } from "@/lib/sanitization";

const emailSchema = z.string().email("Invalid email address").max(255);
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(72);

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loginDelay, setLoginDelay] = useState(0);
  const [remainingDelay, setRemainingDelay] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Countdown timer for login delay
  useEffect(() => {
    if (remainingDelay > 0) {
      const timer = setInterval(() => {
        setRemainingDelay(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [remainingDelay]);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handlePendingEventPlan(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        setTimeout(() => {
          handlePendingEventPlan(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handlePendingEventPlan = async (userId: string) => {
    const pendingPlanStr = localStorage.getItem('pendingEventPlan');
    if (!pendingPlanStr) {
      // Always redirect to My Events page after sign in
      navigate('/my-events');
      return;
    }

    setCreatingEvent(true);
    try {
      const pendingPlan = JSON.parse(pendingPlanStr);
      const { eventId } = await createEventFromPlan({
        plan: pendingPlan.generatedEvent,
        eventDate: pendingPlan.eventDate ? new Date(pendingPlan.eventDate) : undefined,
        location: pendingPlan.location,
        userId,
      });

      localStorage.removeItem('pendingEventPlan');

      toast({
        title: "Event created!",
        description: "Your event is live and ready to share",
      });

      navigate(`/dashboard?event=${eventId}`);
    } catch (error) {
      console.error('Error creating event from pending plan:', error);
      localStorage.removeItem('pendingEventPlan');
      
      toast({
        title: "Event creation failed",
        description: error instanceof Error ? error.message : "Please try creating your event again",
        variant: "destructive",
      });
      
      navigate('/my-events');
    } finally {
      setCreatingEvent(false);
    }
  };

  const validateInputs = () => {
    try {
      emailSchema.parse(email.trim());
      passwordSchema.parse(password);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
      return false;
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    // Sanitize inputs
    const sanitizedEmail = sanitizeEmail(email);
    
    // Validate inputs
    try {
      signUpSchema.parse({
        email: sanitizedEmail,
        password: password,
        confirmPassword: password,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setValidationErrors(errors);
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    if (!termsAccepted || !privacyAccepted) {
      toast({
        title: "Consent Required",
        description: "Please accept both Terms of Service and Privacy Policy to continue.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/home`,
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else if (data.user) {
        // Store consent records
        try {
          // Get user IP (optional)
          let userIp = null;
          try {
            const ipResponse = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipResponse.json();
            userIp = ipData.ip;
          } catch (ipError) {
            console.error('Failed to get IP:', ipError);
          }

          // Insert consent records
          const consents = [
            {
              user_id: data.user.id,
              consent_type: 'terms_of_service',
              consent_given: true,
              ip_address: userIp,
              policy_version: '1.0'
            },
            {
              user_id: data.user.id,
              consent_type: 'privacy_policy',
              consent_given: true,
              ip_address: userIp,
              policy_version: '1.0'
            }
          ];

          const { error: consentError } = await supabase
            .from('user_consents')
            .insert(consents);

          if (consentError) {
            console.error('Failed to store consent:', consentError);
          }
        } catch (consentError) {
          console.error('Error storing consent:', consentError);
        }

        toast({
          title: "Success!",
          description: "Account created successfully. You can now sign in.",
        });
        // Auto-confirm is enabled, so redirect to My Activity
        navigate("/my-activity");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for login delay
    if (remainingDelay > 0) {
      toast({
        title: "Please wait",
        description: `Too many failed attempts. Try again in ${formatDelayTime(remainingDelay)}`,
        variant: "destructive",
      });
      return;
    }

    if (!validateInputs()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Record failed attempt
        try {
          await supabase.rpc('record_login_attempt', {
            p_identifier: email.trim(),
            p_attempt_type: 'failed'
          });

          // Get failed attempt count
          const { data: failedCount } = await supabase.rpc('get_failed_login_count', {
            p_identifier: email.trim(),
            p_minutes: 60
          });

          if (failedCount) {
            const delay = calculateLoginDelay(failedCount);
            if (delay > 0) {
              setLoginDelay(delay);
              setRemainingDelay(delay);
              toast({
                title: "Too many failed attempts",
                description: `Please wait ${formatDelayTime(delay)} before trying again`,
                variant: "destructive",
              });
              setLoading(false);
              return;
            }
          }
        } catch (rpcError) {
          console.error('Failed to record login attempt:', rpcError);
        }

        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Invalid credentials",
            description: "Email or password is incorrect. Please try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign in failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else if (data.user) {
        // Record successful attempt
        try {
          await supabase.rpc('record_login_attempt', {
            p_identifier: email.trim(),
            p_attempt_type: 'successful'
          });
        } catch (rpcError) {
          console.error('Failed to record successful login:', rpcError);
        }
        
        // Reset delay on success
        setLoginDelay(0);
        setRemainingDelay(0);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast({
          title: "Google sign in failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main content - centered on all screens */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:p-8 pb-safe">
        {creatingEvent ? (
          <Card className="w-full max-w-md mx-auto border-0 md:border shadow-none md:shadow-sm">
            <CardContent className="pt-6 text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <div>
                <h3 className="font-semibold text-lg">Creating your event...</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Setting up your event plan
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="w-full max-w-md mx-auto">
            {/* Logo */}
            <div className="flex items-center justify-center mb-8">
              <img src={logo} alt="SimplifiedHost" className="h-16 sm:h-20 md:h-24" />
            </div>

            {/* Auth Card - borderless on mobile for app-like feel */}
            <Card className="border-0 md:border shadow-none md:shadow-sm">
              <CardHeader className="space-y-1 pb-4 px-0 md:px-6">
                <CardTitle className="text-2xl">Welcome</CardTitle>
                <CardDescription className="text-base">
                  Sign in or create an account to get started
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 md:px-6">
                <Tabs defaultValue="signin" className="space-y-6">
                  {/* Touch-friendly tabs */}
                  <TabsList className="grid w-full grid-cols-2 h-12">
                    <TabsTrigger value="signin" className="h-10 text-base">
                      Sign In
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="h-10 text-base">
                      Sign Up
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin">
                    <form onSubmit={handleSignIn} className="space-y-5">
                      {remainingDelay > 0 && (
                        <Alert variant="destructive">
                          <ShieldAlert className="h-4 w-4" />
                          <AlertDescription>
                            Too many failed login attempts. Please wait {formatDelayTime(remainingDelay)} before trying again.
                          </AlertDescription>
                        </Alert>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="signin-email" className="text-base">Email</Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={loading || remainingDelay > 0}
                          required
                          maxLength={255}
                          className="h-12 text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password" className="text-base">Password</Label>
                        <Input
                          id="signin-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={loading || remainingDelay > 0}
                          required
                          maxLength={72}
                          className="h-12 text-base"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-medium" 
                        disabled={loading || remainingDelay > 0}
                      >
                        {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        Sign In
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignUp} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-base">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="your@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          disabled={loading}
                          required
                          maxLength={255}
                          className="h-12 text-base"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-base">
                          Password (minimum 8 characters)
                        </Label>
                        <Input
                          id="signup-password"
                          type="password"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={loading}
                          required
                          minLength={8}
                          maxLength={72}
                          className="h-12 text-base"
                        />
                        <div className="mt-2">
                          <PasswordStrengthMeter password={password} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Try a passphrase like: <span className="font-mono text-xs">summer-lake-picnic-2024</span>
                        </p>
                      </div>
                      
                      {/* Consent Checkboxes - touch-friendly */}
                      <div className="space-y-4 pt-3 border-t">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="terms"
                            checked={termsAccepted}
                            onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                            disabled={loading}
                            required
                            className="h-5 w-5 mt-0.5"
                          />
                          <Label 
                            htmlFor="terms" 
                            className="text-sm font-normal leading-relaxed cursor-pointer"
                          >
                            I agree to the{' '}
                            <Link 
                              to="/policies#terms" 
                              target="_blank"
                              className="text-primary hover:underline"
                            >
                              Terms of Service
                            </Link>
                          </Label>
                        </div>
                        
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="privacy"
                            checked={privacyAccepted}
                            onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
                            disabled={loading}
                            required
                            className="h-5 w-5 mt-0.5"
                          />
                          <Label 
                            htmlFor="privacy" 
                            className="text-sm font-normal leading-relaxed cursor-pointer"
                          >
                            I agree to the{' '}
                            <Link 
                              to="/policies#privacy" 
                              target="_blank"
                              className="text-primary hover:underline"
                            >
                              Privacy Policy
                            </Link>
                          </Label>
                        </div>
                      </div>
                      
                      <Button 
                        type="submit" 
                        className="w-full h-12 text-base font-medium" 
                        disabled={loading || !termsAccepted || !privacyAccepted}
                      >
                        {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                        Sign Up
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Footer - hidden on mobile for app-like experience */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
};

export default Auth;
