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
import { Loader2, ShieldAlert, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.svg";
import { z } from "zod";
import { createEventFromPlan } from "@/lib/createEventFromPlan";
import { Footer } from "@/components/Footer";
import { PasswordStrengthMeter } from "@/components/ui/password-strength-meter";
import { calculateLoginDelay, formatDelayTime } from "@/lib/passwordStrength";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { signUpSchema, signInSchema, otpSchema } from "@/lib/formValidation";
import { sanitizeEmail } from "@/lib/sanitization";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { getBaseUrl } from "@/lib/utils";

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
  
  // OTP and password reset state
  const [otpCode, setOtpCode] = useState("");
  const [showOtpVerification, setShowOtpVerification] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [otpEmail, setOtpEmail] = useState("");
  const [resendOtpCooldown, setResendOtpCooldown] = useState(0);
  const [otpType, setOtpType] = useState<'signup' | 'reset'>('signup');
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Countdown timer for login delay
  useEffect(() => {
    if (remainingDelay > 0) {
      const timer = setInterval(() => {
        setRemainingDelay(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [remainingDelay]);

  // Countdown timer for resend OTP cooldown
  useEffect(() => {
    if (resendOtpCooldown > 0) {
      const timer = setInterval(() => {
        setResendOtpCooldown(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendOtpCooldown]);

  // Handle URL parameters for password reset
  useEffect(() => {
    const reset = searchParams.get('reset');
    const type = searchParams.get('type');
    const token = searchParams.get('token');
    const tokenHash = searchParams.get('token_hash');
    
    // Handle password reset link from email (if user clicks link instead of using OTP)
    if (token && tokenHash) {
      // User clicked reset link - verify the token and show password reset form
      supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      }).then(({ data, error }) => {
        if (!error && data?.user) {
          setShowResetPassword(true);
          setOtpEmail(data.user.email || '');
          toast({
            title: "Reset link verified",
            description: "Please enter your new password",
          });
        }
      });
    } else if (reset === 'true' || type === 'recovery') {
      setShowForgotPassword(true);
    }
  }, [searchParams]);

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handlePendingEventPlan(session.user.id);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip auto-redirect if user is resetting password
      if (isResettingPassword) {
        return;
      }
      if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        setTimeout(() => {
          handlePendingEventPlan(session.user.id);
        }, 0);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isResettingPassword]);

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

        // Store email for OTP verification
        setOtpEmail(email.trim());
        setOtpType('signup');
        
        // Note: signUp() automatically sends OTP email, so don't call resend() here
        // Show OTP verification screen
        setShowOtpVerification(true);
        setResendOtpCooldown(60);
        toast({
          title: "Verification code sent!",
          description: `Check your email at ${email.trim()} for your 6-digit verification code. If you don't see it, check your spam folder.`,
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
          redirectTo: `${getBaseUrl()}/dashboard`,
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

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate OTP
    try {
      otpSchema.parse(otpCode);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid OTP",
          description: "Please enter a valid 6-digit code",
          variant: "destructive",
        });
      }
      return;
    }

    setLoading(true);
    try {
      let data, error;
      
      // Try verification with appropriate type
      if (otpType === 'signup') {
        // Try 'signup' type first (from resend)
        const result = await supabase.auth.verifyOtp({
          email: otpEmail,
          token: otpCode,
          type: 'signup',
        });
        data = result.data;
        error = result.error;
        
        // If 'signup' type fails, try 'email' type as fallback (from signInWithOtp)
        if (error && (error.message.includes("invalid") || error.message.includes("expired"))) {
          const fallbackResult = await supabase.auth.verifyOtp({
            email: otpEmail,
            token: otpCode,
            type: 'email',
          });
          if (!fallbackResult.error) {
            data = fallbackResult.data;
            error = null;
          }
        }
      } else {
        // Password reset uses 'recovery' type (from resetPasswordForEmail)
        // Set flag to prevent auto-redirect when verifyOtp creates a session
        setIsResettingPassword(true);
        
        // Try 'recovery' type first (proper type for password reset)
        const result = await supabase.auth.verifyOtp({
          email: otpEmail,
          token: otpCode,
          type: 'recovery' as any,
        });
        data = result.data;
        error = result.error;
      }

      if (error) {
        if (error.message.includes("expired") || error.message.includes("invalid")) {
          toast({
            title: "Invalid or expired code",
            description: "The OTP code is invalid or has expired. Please request a new one.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Verification failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else if (data?.user) {
        if (otpType === 'signup') {
          // Complete signup flow - store consents
          try {
            let userIp = null;
            try {
              const ipResponse = await fetch('https://api.ipify.org?format=json');
              const ipData = await ipResponse.json();
              userIp = ipData.ip;
            } catch (ipError) {
              console.error('Failed to get IP:', ipError);
            }

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
            title: "Account verified!",
            description: "Your account has been successfully verified",
          });
          
          setShowOtpVerification(false);
          navigate("/my-activity");
        } else {
          // Password reset flow - show password reset form
          setShowOtpVerification(false);
          setShowResetPassword(true);
          setOtpCode("");
          toast({
            title: "Code verified!",
            description: "Please enter your new password",
          });
        }
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

  const handleResendOtp = async () => {
    if (resendOtpCooldown > 0) {
      toast({
        title: "Please wait",
        description: `You can resend the code in ${resendOtpCooldown} seconds`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let error = null;

      if (otpType === 'signup') {
        // Use resend for signup verification
        const result = await supabase.auth.resend({
          type: 'signup',
          email: otpEmail,
        });
        error = result.error;
      } else {
        // Use resetPasswordForEmail for password reset
        const result = await supabase.auth.resetPasswordForEmail(otpEmail);
        error = result.error;
      }

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setResendOtpCooldown(60);
        toast({
          title: "Code resent!",
          description: "A new verification code has been sent to your email",
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    // Validate email
    try {
      emailSchema.parse(email.trim());
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid email",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
      }
      return;
    }

    setLoading(true);
    try {
      // Send OTP code for password reset using resetPasswordForEmail
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Show OTP verification screen
      setShowForgotPassword(false);
      setShowOtpVerification(true);
      setOtpEmail(email.trim());
      setOtpType('reset');
      setResendOtpCooldown(60);
      toast({
        title: "Password reset code sent!",
        description: `Check your email at ${email.trim()} for your 6-digit code. If you don't see it, check your spam folder.`,
      });
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    try {
      signUpSchema.parse({
        email: otpEmail,
        password: newPassword,
        confirmPassword: confirmPassword,
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
      }
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password reset!",
          description: "Your password has been successfully reset. Please sign in.",
        });
        // Sign out to clear the recovery session and allow proper signin with new password
        await supabase.auth.signOut();
        
        // Clear the password reset flag
        setIsResettingPassword(false);
        
        // Reset all form state
        setShowResetPassword(false);
        setNewPassword("");
        setConfirmPassword("");
        setEmail("");
        setOtpEmail("");
        setOtpCode("");
        setOtpType('signup');
        
        navigate("/auth");
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
        ) : showOtpVerification ? (
          <div className="w-full max-w-md mx-auto">
            {/* Logo */}
            <div className="flex items-center justify-center mb-8">
              <img src={logo} alt="SimplifiedHost" className="h-16 sm:h-20 md:h-24" />
            </div>

            {/* OTP Verification Card */}
            <Card className="border-0 md:border shadow-none md:shadow-sm">
              <CardHeader className="space-y-1 pb-4 px-0 md:px-6">
                <CardTitle className="text-2xl">
                  {otpType === 'signup' ? 'Verify Your Email' : 'Reset Password'}
                </CardTitle>
                <CardDescription className="text-base">
                  {otpType === 'signup' 
                    ? 'We sent a verification code to your email'
                    : 'Enter the code sent to your email to reset your password'}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 md:px-6">
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-base">Verification Code</Label>
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={otpCode}
                        onChange={(value) => setOtpCode(value)}
                        disabled={loading}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Enter the 6-digit code sent to {otpEmail}
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-medium" 
                    disabled={loading || otpCode.length !== 6}
                  >
                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Verify Code
                  </Button>

                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading || resendOtpCooldown > 0}
                      className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
                    >
                      {resendOtpCooldown > 0 
                        ? `Resend code in ${resendOtpCooldown}s`
                        : 'Resend code'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOtpVerification(false);
                        setOtpCode("");
                        if (otpType === 'reset') {
                          setShowForgotPassword(true);
                        }
                      }}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : showResetPassword ? (
          <div className="w-full max-w-md mx-auto">
            {/* Logo */}
            <div className="flex items-center justify-center mb-8">
              <img src={logo} alt="SimplifiedHost" className="h-16 sm:h-20 md:h-24" />
            </div>

            {/* Password Reset Card */}
            <Card className="border-0 md:border shadow-none md:shadow-sm">
              <CardHeader className="space-y-1 pb-4 px-0 md:px-6">
                <CardTitle className="text-2xl">Reset Password</CardTitle>
                <CardDescription className="text-base">
                  Enter your new password
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 md:px-6">
                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-base">
                      New Password (minimum 8 characters)
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      required
                      minLength={8}
                      maxLength={72}
                      className="h-12 text-base"
                    />
                    <div className="mt-2">
                      <PasswordStrengthMeter password={newPassword} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-base">Confirm Password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      required
                      minLength={8}
                      maxLength={72}
                      className="h-12 text-base"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-medium" 
                    disabled={loading || !newPassword || !confirmPassword}
                  >
                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Reset Password
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowResetPassword(false);
                      setShowOtpVerification(true);
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : showForgotPassword ? (
          <div className="w-full max-w-md mx-auto">
            {/* Logo */}
            <div className="flex items-center justify-center mb-8">
              <img src={logo} alt="SimplifiedHost" className="h-16 sm:h-20 md:h-24" />
            </div>

            {/* Forgot Password Card */}
            <Card className="border-0 md:border shadow-none md:shadow-sm">
              <CardHeader className="space-y-1 pb-4 px-0 md:px-6">
                <CardTitle className="text-2xl">Forgot Password</CardTitle>
                <CardDescription className="text-base">
                  Enter your email address and we'll send you a code to reset your password
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 md:px-6">
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email" className="text-base">Email</Label>
                    <Input
                      id="forgot-email"
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

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-medium" 
                    disabled={loading || !email.trim()}
                  >
                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Send Reset Code
                  </Button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setEmail("");
                    }}
                    className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Sign In
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>
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
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password" className="text-base">Password</Label>
                          <button
                            type="button"
                            onClick={() => {
                              setShowForgotPassword(true);
                            }}
                            className="text-sm text-primary hover:underline"
                            disabled={loading || remainingDelay > 0}
                          >
                            Forgot password?
                          </button>
                        </div>
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

                      {/* Divider */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                        </div>
                      </div>

                      {/* Google Sign In Button */}
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full h-12 text-base font-medium" 
                        disabled={loading}
                        onClick={handleGoogleSignIn}
                      >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Sign In with Google
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

                      {/* Divider */}
                      <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-border" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                        </div>
                      </div>

                      {/* Google Sign In Button */}
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full h-12 text-base font-medium" 
                        disabled={loading}
                        onClick={handleGoogleSignIn}
                      >
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Sign Up with Google
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
