import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneInputWithCountry } from "@/components/ui/phone-input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { haptics } from "@/lib/haptics";
import { CheckCircle2, XCircle, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { cleanPhoneNumber, getExampleNumber, validatePhoneNumber } from "@/lib/phoneFormat";
import { sanitizeName, sanitizeEmail, sanitizeLongText } from "@/lib/sanitization";
import { rsvpFormSchema } from "@/lib/formValidation";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface RSVPWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  maxPlusOnes: number | null;
  allowPlusOnes: boolean;
  rsvpDeadline: string | null;
  maxAttendees: number | null;
  requireEmailForRsvp?: boolean;
  guestToken?: string;
  onSuccess: (updatedRsvp: any) => void;
}

export const RSVPWizardDialog = ({
  open,
  onOpenChange,
  eventId,
  eventName,
  maxPlusOnes,
  allowPlusOnes,
  rsvpDeadline,
  maxAttendees,
  requireEmailForRsvp = false,
  guestToken: propGuestToken,
  onSuccess
}: RSVPWizardDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { verifyRecaptcha } = useRecaptcha();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [status, setStatus] = useState<'attending' | 'maybe' | 'not_attending' | null>(null);
  const [hasPlusOnes, setHasPlusOnes] = useState(false);
  const [additionalGuests, setAdditionalGuests] = useState<string[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [dietaryOther, setDietaryOther] = useState("");
  const [dietaryAllergy, setDietaryAllergy] = useState("");
  const [message, setMessage] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneValid, setPhoneValid] = useState(false);
  const [existingRsvp, setExistingRsvp] = useState<any>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [usingProfileData, setUsingProfileData] = useState(false);
  const [guestCountOnly, setGuestCountOnly] = useState(false);
  const [additionalGuestCount, setAdditionalGuestCount] = useState(0);
  const [hasExistingConsent, setHasExistingConsent] = useState(false);
  const [consentChecking, setConsentChecking] = useState(false);
  const [consentDate, setConsentDate] = useState<string | null>(null);
  const [smsOptIn, setSmsOptIn] = useState(true);

  const contentRef = useSwipeGesture<HTMLDivElement>({
    onSwipeLeft: () => {
      if (currentStep < 3 && canContinue()) {
        haptics.light();
        handleContinue();
      }
    },
    onSwipeRight: () => {
      if (currentStep > 1) {
        haptics.light();
        setCurrentStep(currentStep - 1);
      }
    },
    minSwipeDistance: 50
  });

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Removed auto-scroll to prevent focus loss issues on mobile
    // Let the browser handle scroll-into-view naturally
  };

  // Load existing RSVP on mount
  useEffect(() => {
    if (open) {
      // Use prop token if provided, otherwise read from localStorage
      const token = propGuestToken || localStorage.getItem(`rsvp_token_${eventId}`);
      if (token) {
        setGuestToken(token);
        loadExistingRsvp(token);
      }
      loadAttendeeCount();
    }
  }, [open, eventId, propGuestToken]);

  // Auto-fill for authenticated users
  useEffect(() => {
    const loadProfileData = async () => {
      if (user && !existingRsvp && open) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, phone_number')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          if (profile.display_name && !guestName) {
            setGuestName(profile.display_name);
            setUsingProfileData(true);
          }
          if (profile.phone_number && !guestPhone) {
            setGuestPhone(profile.phone_number);
            setUsingProfileData(true);
          }
        }
        
        if (user.email && !guestEmail) {
          setGuestEmail(user.email);
          setUsingProfileData(true);
        }
      }
    };

    loadProfileData();
  }, [user, existingRsvp, open]);

  // Validate pre-filled or loaded phone numbers automatically
  useEffect(() => {
    if (guestPhone) {
      setPhoneValid(validatePhoneNumber(guestPhone, countryCode));
    } else {
      setPhoneValid(false);
    }
  }, [guestPhone, countryCode]);

  const loadExistingRsvp = async (token: string) => {
    console.log('[RSVP Debug] Loading existing RSVP with token:', token.substring(0, 8) + '...');
    
    try {
      const { data, error } = await supabase
        .rpc('get_my_rsvp_full', {
          p_event_id: eventId,
          p_guest_token: token
        })
        .maybeSingle();

      if (error) {
        console.error('[RSVP Debug] Error loading existing RSVP:', error);
        toast({
          title: "Note",
          description: "Couldn't load your previous RSVP. You can still proceed.",
          variant: "default"
        });
        return;
      }

      if (data && (data as any)?.id) {
        const r: any = data as any;
        console.log('[RSVP Debug] Existing RSVP found:', { 
          id: r.id, 
          status: r.rsvp_status,
          name: r.guest_name 
        });
        
        setExistingRsvp(r);
        setStatus(r.rsvp_status as 'attending' | 'maybe' | 'not_attending');
        setGuestName(r.guest_name);
        setGuestEmail(r.guest_email || "");
        setGuestPhone(r.guest_phone || "");
        setCountryCode(r.country_code || "US");
        setMessage(r.message || "");
        setDietaryPreferences((r as any).dietary_preferences || []);
        setDietaryOther((r as any).dietary_other || "");
        setDietaryAllergy((r as any).dietary_allergy || "");
        
        // Load SMS preference from guest_preferences
        const { data: prefs } = await supabase
          .from('guest_preferences')
          .select('sms_enabled')
          .eq('event_id', eventId)
          .eq('guest_token', token)
          .maybeSingle();
        
        if (prefs) {
          setSmsOptIn(prefs.sms_enabled ?? true);
        }
        
        const guests = (r as any).additional_guests;
        let guestsList: string[] = [];
        
        if (guests && Array.isArray(guests)) {
          guestsList = guests.map((g: any) => 
            typeof g === 'string' ? g : (g.name || '')
          ).filter((name: string) => name.trim());
        }
        
        const looksLikeHeadcountOnly = guestsList.length > 0 && guestsList.every(n => /^Guest\s+\d+$/i.test(n));

        if (looksLikeHeadcountOnly) {
          setHasPlusOnes(true);
          setGuestCountOnly(true);
          setAdditionalGuestCount(guestsList.length);
          setAdditionalGuests([]);
        } else {
          setAdditionalGuests(guestsList);
          setHasPlusOnes(guestsList.length > 0);
          setGuestCountOnly(false);
          setAdditionalGuestCount(guestsList.length);
        }
      } else {
        console.log('[RSVP Debug] No existing RSVP found for token (null or missing id)');
        // Clear the invalid token
        localStorage.removeItem(`rsvp_token_${eventId}`);
        setGuestToken(null);
        setExistingRsvp(null);
      }
    } catch (err) {
      console.error('[RSVP Debug] Exception loading RSVP:', err);
      toast({
        title: "Error",
        description: "An error occurred while loading your RSVP. You can still proceed with a new RSVP.",
        variant: "default"
      });
      // Clear the problematic token
      localStorage.removeItem(`rsvp_token_${eventId}`);
      setGuestToken(null);
      setExistingRsvp(null);
    }
  };

  const loadAttendeeCount = async () => {
    const { count } = await supabase
      .from('rsvps')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('rsvp_status', 'attending');

    setAttendeeCount(count || 0);
  };

  const validatePhone = (phone: string, country: string) => {
    if (!phone) {
      setPhoneError("Phone number is required");
      setPhoneValid(false);
      return false;
    }
    
    const isValid = validatePhoneNumber(phone, country);
    if (!isValid) {
      const countryName = country === 'US' ? 'US' : country === 'GB' ? 'UK' : country;
      setPhoneError(`Please enter a valid ${countryName} phone number`);
      setPhoneValid(false);
      return false;
    }
    
    setPhoneError("");
    setPhoneValid(true);
    return true;
  };

  const checkGlobalConsent = async (phone: string, country: string) => {
    if (!phone || phone.length < 10) return;
    
    setConsentChecking(true);
    const cleanedPhone = cleanPhoneNumber(phone);
    
    try {
      const { data: hasConsent } = await supabase.rpc('check_sms_consent_global', {
        p_phone: cleanedPhone,
        p_country_code: country
      });
      
      const { data: date } = await supabase.rpc('get_sms_consent_date', {
        p_phone: cleanedPhone,
        p_country_code: country
      });
      
      setHasExistingConsent(hasConsent === true);
      setConsentDate(date);
    } catch (error) {
      console.error('Error checking SMS consent:', error);
    } finally {
      setConsentChecking(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    setGuestPhone(value);
    if (phoneError) setPhoneError("");
  };

  const handlePhoneBlur = () => {
    if (guestPhone) {
      validatePhone(guestPhone, countryCode);
      checkGlobalConsent(guestPhone, countryCode);
    }
  };

  const canContinue = () => {
    if (currentStep === 1) {
      const emailValid = !requireEmailForRsvp || guestEmail.trim();
      return guestName.trim() && guestPhone.trim() && phoneValid && status && emailValid;
    }
    if (currentStep === 2) {
      if (guestCountOnly) {
        return additionalGuestCount > 0;
      }
      return additionalGuests.every(g => g.trim().length >= 2);
    }
    return true;
  };

  const handleContinue = () => {
    haptics.medium();
    if (currentStep === 1) {
      if (hasPlusOnes && allowPlusOnes) {
        setCurrentStep(2);
      } else {
        setCurrentStep(3);
      }
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    haptics.light();
    setCurrentStep(currentStep - 1);
  };

  const handleSave = async () => {
    haptics.medium();
    await handleSubmit();
  };

  const handleSubmit = async () => {
    if (!validatePhone(guestPhone, countryCode)) {
      haptics.error();
      toast({
        title: "Invalid Phone Number",
        description: phoneError,
        variant: "destructive",
      });
      return;
    }

    const sanitizedData = {
      guestName: sanitizeName(guestName),
      guestEmail: guestEmail ? sanitizeEmail(guestEmail) : '',
      guestPhone: cleanPhoneNumber(guestPhone),
      rsvpStatus: status,
      message: sanitizeLongText(message, 1000),
      additionalGuests: hasPlusOnes 
        ? (guestCountOnly 
            ? Array.from({length: additionalGuestCount}, (_, i) => `Guest ${i + 1}`)
            : additionalGuests
                .map(g => sanitizeName(g))
                .filter(g => g.trim()))
        : [],
    };

    try {
      rsvpFormSchema.parse(sanitizedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        haptics.error();
        const firstError = error.errors[0];
        const fieldPath = firstError.path.join('.');
        
        toast({
          title: "Validation Error",
          description: `${fieldPath}: ${firstError.message}`,
          variant: "destructive"
        });
        console.error('All validation errors:', error.errors);
        return;
      }
    }

    if (rsvpDeadline && new Date(rsvpDeadline) < new Date()) {
      haptics.error();
      toast({
        title: "RSVP Closed",
        description: "The RSVP deadline has passed",
        variant: "destructive"
      });
      return;
    }

    if (maxAttendees && attendeeCount >= maxAttendees && status === 'attending' && !existingRsvp) {
      haptics.error();
      toast({
        title: "Event Full",
        description: "This event has reached maximum capacity",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const isHuman = await verifyRecaptcha('rsvp_submit');
      if (!isHuman) {
        setLoading(false);
        toast({
          title: "Verification failed",
          description: "Please confirm you’re not a bot and try again.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('[RSVP Debug] Submitting RSVP. Mode:', existingRsvp ? 'UPDATE' : 'INSERT');
      console.log('[RSVP Debug] Guest token present:', !!guestToken);
      console.log('[RSVP Debug] Existing RSVP ID:', existingRsvp?.id);
      
      if (existingRsvp) {
        console.log('[RSVP Debug] Taking UPDATE path...');
        
        const { data: updatedRsvp, error } = await supabase
          .rpc('update_my_rsvp', {
            p_event_id: eventId,
            p_guest_token: guestToken!,
            p_guest_name: sanitizedData.guestName,
            p_guest_email: sanitizedData.guestEmail || null,
            p_guest_phone: sanitizedData.guestPhone,
            p_country_code: countryCode,
            p_rsvp_status: status,
            p_message: sanitizedData.message || null,
            p_additional_guests: hasPlusOnes ? sanitizedData.additionalGuests : [],
            p_dietary_preferences: dietaryPreferences,
            p_dietary_other: sanitizeLongText(dietaryOther, 100) || null,
            p_dietary_allergy: sanitizeLongText(dietaryAllergy, 100) || null,
          })
          .single();

        if (error) {
          console.error('[RSVP Debug] UPDATE failed:', error);
          haptics.error();
          toast({
            title: "Update Failed",
            description: error.message || "Could not update your RSVP. Please try again.",
            variant: "destructive"
          });
          throw error;
        }

        console.log('[RSVP Debug] UPDATE successful');
        haptics.success();
        try { localStorage.setItem(`rsvp_plus_ones_${eventId}`, String(hasPlusOnes ? sanitizedData.additionalGuests.length : 0)); } catch {}
        
        // Update SMS consent in guest_preferences
        await supabase.from('guest_preferences').upsert({
          event_id: eventId,
          guest_token: guestToken!,
          guest_email: sanitizedData.guestEmail || null,
          guest_phone: sanitizedData.guestPhone,
          country_code: countryCode,
          sms_enabled: hasExistingConsent ? true : smsOptIn,
          email_enabled: true,
          push_enabled: true,
          sms_consent_given_at: hasExistingConsent ? undefined : (smsOptIn ? new Date().toISOString() : null)
        }, {
          onConflict: 'event_id,guest_token',
          ignoreDuplicates: false
        });
        
        toast({
          title: "RSVP Updated! ✓",
          description: `Your response has been updated`
        });

        onSuccess(updatedRsvp);
        onOpenChange(false);
        return;
      } else {
        console.log('[RSVP Debug] Taking INSERT path...');
        
        // Fallback: Check if RSVP already exists by phone before INSERT
        console.log('[RSVP Debug] Checking for duplicate RSVP...');
        const { data: existingCheck } = await supabase
          .rpc('find_my_rsvp', {
            p_event_id: eventId,
            p_guest_name: sanitizedData.guestName,
            p_guest_phone: sanitizedData.guestPhone,
            p_country_code: countryCode
          })
          .maybeSingle();
        
        if (existingCheck) {
          console.log('[RSVP Debug] Found existing RSVP, switching to UPDATE mode:', existingCheck.id);
          
          // Switch to update mode
          const newToken = existingCheck.guest_token;
          localStorage.setItem(`rsvp_token_${eventId}`, newToken);
          setGuestToken(newToken);
          setExistingRsvp(existingCheck);
          
          // Now perform update
          const { data: updatedRsvp, error } = await supabase
            .rpc('update_my_rsvp', {
              p_event_id: eventId,
              p_guest_token: newToken,
              p_guest_name: sanitizedData.guestName,
              p_guest_email: sanitizedData.guestEmail || null,
              p_guest_phone: sanitizedData.guestPhone,
              p_country_code: countryCode,
              p_rsvp_status: status,
              p_message: sanitizedData.message || null,
              p_additional_guests: hasPlusOnes ? sanitizedData.additionalGuests : [],
              p_dietary_preferences: dietaryPreferences,
              p_dietary_other: sanitizeLongText(dietaryOther, 100) || null,
              p_dietary_allergy: sanitizeLongText(dietaryAllergy, 100) || null,
            })
            .single();

          if (error) {
            console.error('[RSVP Debug] UPDATE (from fallback) failed:', error);
            haptics.error();
            toast({
              title: "Update Failed",
              description: error.message || "Could not update your RSVP. Please try again.",
              variant: "destructive"
            });
            throw error;
          }

          console.log('[RSVP Debug] UPDATE (from fallback) successful');
          haptics.success();
          try { localStorage.setItem(`rsvp_plus_ones_${eventId}`, String(hasPlusOnes ? sanitizedData.additionalGuests.length : 0)); } catch {}
          
          // Update SMS consent in guest_preferences
          await supabase.from('guest_preferences').upsert({
            event_id: eventId,
            guest_token: newToken,
            guest_email: sanitizedData.guestEmail || null,
            guest_phone: sanitizedData.guestPhone,
            country_code: countryCode,
            sms_enabled: hasExistingConsent ? true : smsOptIn,
            email_enabled: true,
            push_enabled: true,
            sms_consent_given_at: hasExistingConsent ? undefined : (smsOptIn ? new Date().toISOString() : null)
          }, {
            onConflict: 'event_id,guest_token',
            ignoreDuplicates: false
          });
          
          toast({
            title: "RSVP Updated! ✓",
            description: `Your response has been updated`
          });

          onSuccess(updatedRsvp);
          onOpenChange(false);
          return;
        }
        
        console.log('[RSVP Debug] No duplicate found, proceeding with INSERT...');
        
        const newGuestToken = crypto.randomUUID();
        const { error } = await supabase
          .from('rsvps')
          .insert({
            event_id: eventId,
            guest_name: sanitizedData.guestName,
            guest_email: sanitizedData.guestEmail || null,
            guest_phone: sanitizedData.guestPhone,
            country_code: countryCode,
            rsvp_status: status,
            message: sanitizedData.message || null,
            additional_guests: hasPlusOnes ? sanitizedData.additionalGuests : [],
            dietary_preferences: dietaryPreferences,
            dietary_other: sanitizeLongText(dietaryOther, 100) || null,
            dietary_allergy: sanitizeLongText(dietaryAllergy, 100) || null,
            source: 'link',
            guest_token: newGuestToken,
          });

        if (error) {
          console.error('[RSVP Debug] INSERT failed:', error);
          haptics.error();
          toast({
            title: "RSVP Failed",
            description: error.message || "Could not save your RSVP. Please try again.",
            variant: "destructive"
          });
          throw error;
        }

        console.log('[RSVP Debug] INSERT successful');
        localStorage.setItem(`rsvp_token_${eventId}`, newGuestToken);
        try { localStorage.setItem(`rsvp_plus_ones_${eventId}`, String(hasPlusOnes ? sanitizedData.additionalGuests.length : 0)); } catch {}
        
        if (!user) {
          const guestInfo = {
            name: sanitizedData.guestName,
            email: sanitizedData.guestEmail,
            phone: sanitizedData.guestPhone,
            countryCode: countryCode
          };
          localStorage.setItem('saved_guest_info', JSON.stringify(guestInfo));
        }

        // Save SMS consent to guest_preferences
        await supabase.from('guest_preferences').upsert({
          event_id: eventId,
          guest_token: newGuestToken,
          guest_email: sanitizedData.guestEmail || null,
          guest_phone: sanitizedData.guestPhone,
          country_code: countryCode,
          sms_enabled: hasExistingConsent ? true : smsOptIn,
          email_enabled: true,
          push_enabled: true,
          sms_consent_given_at: hasExistingConsent ? undefined : (smsOptIn ? new Date().toISOString() : null)
        }, {
          onConflict: 'event_id,guest_token',
          ignoreDuplicates: false
        });

        // Try to fetch the inserted RSVP via secure RPC (bypasses RLS safely)
        let insertedRsvp: any = null;
        try {
          const { data: fetched, error: fetchError } = await supabase
            .rpc('get_my_rsvp_full', { p_event_id: eventId, p_guest_token: newGuestToken })
            .maybeSingle();
          if (fetchError) {
            console.warn('[RSVP Debug] Fetch after insert failed (non-blocking):', fetchError);
          } else {
            insertedRsvp = fetched;
          }
        } catch (e) {
          console.warn('[RSVP Debug] Exception during fetch after insert (non-blocking):', e);
        }

        haptics.success();
        toast({
          title: "RSVP Confirmed! ✓",
          description: `Thanks, ${sanitizedData.guestName}!`
        });

        onSuccess(insertedRsvp || { guest_token: newGuestToken });
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error('[RSVP Debug] RSVP submission error:', error);
      console.error('[RSVP Debug] Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      haptics.error();
      
      let errorTitle = "Unable to Submit RSVP";
      let errorMessage = "Failed to submit RSVP. Please try again.";
      
      // Specific error handling
      if (error.message?.includes('duplicate key') || error.code === '23505') {
        errorTitle = "RSVP Already Exists";
        errorMessage = "You've already RSVPed to this event. Please refresh the page to update your RSVP.";
      } else if (error.message?.includes('row-level security') || error.code === '42501') {
        errorTitle = "Permission Error";
        errorMessage = "Unable to save your RSVP due to a permission issue. Please refresh the page and try again.";
      } else if (error.message?.includes('violates check constraint')) {
        errorTitle = "Invalid Data";
        errorMessage = "Some of the information provided is invalid. Please check your inputs and try again.";
      } else if (error.code === 'PGRST116') {
        errorTitle = "Update Failed";
        errorMessage = "Could not find your RSVP to update. Please refresh the page and try again.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "RSVP Details";
      case 2: return "Who's Joining You?";
      case 3: return "Additional Details";
      default: return "";
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return "Let us know if you can attend";
      case 2: return "Tell us about your additional guests";
      case 3: return "Optional: Help us accommodate you better";
      default: return "";
    }
  };

  const renderStepIndicator = () => {
    const totalSteps = hasPlusOnes && allowPlusOnes ? 3 : 2;
    const steps = hasPlusOnes && allowPlusOnes ? [1, 2, 3] : [1, 3];
    
    return (
      <div className="flex items-center justify-center gap-2 mb-4">
        {steps.map((step, idx) => (
          <div
            key={step}
            className={cn(
              "h-2 rounded-full transition-all",
              step === currentStep ? "w-8 bg-primary" : "w-2 bg-muted"
            )}
          />
        ))}
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      {usingProfileData && (
        <Badge variant="secondary" className="gap-1.5">
          <Sparkles className="h-3 w-3" />
          {user ? 'Using your profile info' : 'Using saved info'}
        </Badge>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Full Name *</Label>
        <Input
          id="name"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          placeholder="Your name"
          required
          autoFocus={!isMobile}
          onFocus={handleInputFocus}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number *</Label>
        <PhoneInputWithCountry
          value={guestPhone}
          onChange={handlePhoneChange}
          countryCode={countryCode}
          onCountryChange={(country) => {
            setCountryCode(country || 'US');
            if (guestPhone) validatePhone(guestPhone, country || 'US');
          }}
          required
          placeholder={getExampleNumber(countryCode)}
          error={phoneError}
          onBlur={handlePhoneBlur}
          onFocus={handleInputFocus}
        />
        {consentChecking && guestPhone && guestPhone.length >= 10 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <span className="animate-pulse">Checking SMS preferences...</span>
          </p>
        )}
        {phoneValid && !consentChecking && hasExistingConsent && (
          <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-green-900 dark:text-green-100">
                📱 SMS notifications enabled
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                You opted in on {consentDate ? format(new Date(consentDate), 'MMM d, yyyy') : 'a previous event'}. 
                Reply STOP to any message to opt out.
              </p>
            </div>
          </div>
        )}
        {phoneValid && !consentChecking && !hasExistingConsent && (
          <div className="flex items-start space-x-2 p-2 bg-muted/50 rounded-md">
            <Checkbox 
              id="sms-optin-wizard"
              checked={smsOptIn}
              onCheckedChange={(checked) => setSmsOptIn(!!checked)}
              className="mt-0.5"
            />
            <Label htmlFor="sms-optin-wizard" className="text-xs text-muted-foreground leading-snug cursor-pointer">
              Receive event updates via text message. You can opt out anytime by replying STOP.
            </Label>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">
          Email {requireEmailForRsvp ? '*' : '(optional)'}
        </Label>
        <Input
          id="email"
          type="email"
          value={guestEmail}
          onChange={(e) => setGuestEmail(e.target.value)}
          placeholder="you@example.com"
          required={requireEmailForRsvp}
          onFocus={handleInputFocus}
        />
      </div>

      <div className="space-y-2">
        <Label>Attendance Status *</Label>
        <Select 
          value={status || ""} 
          onValueChange={(value) => {
            haptics.selection();
            setStatus(value as 'attending' | 'maybe' | 'not_attending');
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your response" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="attending">✓ Yes, I'll be there</SelectItem>
            <SelectItem value="maybe">? Maybe</SelectItem>
            <SelectItem value="not_attending">✗ Can't make it</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {allowPlusOnes && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <input
            type="checkbox"
            id="plus-ones"
            checked={hasPlusOnes}
            onChange={(e) => {
              haptics.light();
              setHasPlusOnes(e.target.checked);
              if (!e.target.checked) {
                setAdditionalGuests([]);
              }
            }}
            className="h-4 w-4"
          />
          <Label htmlFor="plus-ones" className="cursor-pointer">
            I'm bringing additional guests
            {maxPlusOnes && ` (max ${maxPlusOnes})`}
          </Label>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {maxPlusOnes 
          ? `You can bring up to ${maxPlusOnes} additional guest${maxPlusOnes !== 1 ? 's' : ''}`
          : "Add your additional guests below"}
      </p>

      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
        <input
          type="checkbox"
          id="guest-count-only"
          checked={guestCountOnly}
          onChange={(e) => {
            haptics.light();
            setGuestCountOnly(e.target.checked);
            if (e.target.checked) {
              setAdditionalGuestCount(additionalGuests.length || 1);
              setAdditionalGuests([]);
            } else {
              setAdditionalGuests(Array(additionalGuestCount).fill(""));
              setAdditionalGuestCount(0);
            }
          }}
          className="h-4 w-4"
        />
        <Label htmlFor="guest-count-only" className="cursor-pointer text-sm">
          Just add a headcount (names can be added later)
        </Label>
      </div>

      {guestCountOnly ? (
        <div className="space-y-2">
          <Label htmlFor="guest-count">Number of Additional Guests</Label>
          <Input
            id="guest-count"
            type="number"
            min="1"
            max={maxPlusOnes || 10}
            value={additionalGuestCount || ""}
            onChange={(e) => {
              const count = parseInt(e.target.value) || 0;
              if (!maxPlusOnes || count <= maxPlusOnes) {
                setAdditionalGuestCount(count);
              }
            }}
            placeholder="How many guests?"
            onFocus={handleInputFocus}
          />
          {additionalGuestCount > 0 && (
            <p className="text-xs text-muted-foreground">
              You'll be bringing {additionalGuestCount} additional guest{additionalGuestCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      ) : (
        <>
          {additionalGuests.map((guest, index) => (
            <div key={index} className="flex gap-2">
              <div className="flex-1 space-y-1">
                <Input
                  placeholder={`Guest ${index + 1} name`}
                  value={guest}
                  onChange={(e) => {
                    const newGuests = [...additionalGuests];
                    newGuests[index] = e.target.value;
                    setAdditionalGuests(newGuests);
                  }}
                  className={cn(
                    guest.trim().length >= 2 && "border-green-500"
                  )}
                  onFocus={handleInputFocus}
                />
                {guest.trim() && guest.trim().length < 2 && (
                  <p className="text-xs text-destructive">Name must be at least 2 characters</p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  haptics.light();
                  setAdditionalGuests(additionalGuests.filter((_, i) => i !== index));
                }}
              >
                ✕
              </Button>
            </div>
          ))}

          {(!maxPlusOnes || additionalGuests.length < maxPlusOnes) && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                haptics.light();
                setAdditionalGuests([...additionalGuests, ""]);
              }}
              className="w-full"
            >
              + {additionalGuests.length === 0 ? 'Add Guest' : 'Add Another Guest'}
              {maxPlusOnes && ` (${maxPlusOnes - additionalGuests.length} remaining)`}
            </Button>
          )}
        </>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Dietary Preferences</Label>
        <div className="flex flex-wrap gap-2">
          {['Vegetarian', 'Vegan', 'Gluten-free', 'Kosher', 'Nut-free'].map((pref) => {
            const value = pref.toLowerCase().replace('-', '_');
            const isSelected = dietaryPreferences.includes(value);
            
            return (
              <Button
                key={pref}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  haptics.light();
                  if (isSelected) {
                    setDietaryPreferences(dietaryPreferences.filter(p => p !== value));
                  } else {
                    setDietaryPreferences([...dietaryPreferences, value]);
                  }
                }}
                className="rounded-full"
              >
                {pref}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label htmlFor="dietary-other">Other</Label>
          <Input
            id="dietary-other"
            value={dietaryOther}
            onChange={(e) => setDietaryOther(e.target.value)}
            placeholder="Other preference"
            maxLength={100}
            onFocus={handleInputFocus}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="allergy">Allergies</Label>
          <Input
            id="allergy"
            value={dietaryAllergy}
            onChange={(e) => setDietaryAllergy(e.target.value)}
            placeholder="Allergy info"
            maxLength={100}
            onFocus={handleInputFocus}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="message">Message to Host</Label>
          <span className="text-xs text-muted-foreground">{message.length}/1000</span>
        </div>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Any questions or special requests?"
          rows={3}
          maxLength={1000}
          onFocus={handleInputFocus}
        />
      </div>
    </div>
  );

  const getContinueButtonText = () => {
    if (currentStep === 1) {
      if (hasPlusOnes && allowPlusOnes) return "Add Guest Details";
      return "Add Dietary Info";
    }
    if (currentStep === 2) {
      return "Add Dietary Info";
    }
    return "Save RSVP";
  };

  const renderButtons = () => {
    // Step 1: Show both "Save RSVP" and "Continue" options
    if (currentStep === 1) {
      return (
        <div className="flex gap-2 w-full">
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={loading || !canContinue()}
            className="flex-1"
          >
            {loading ? "Saving..." : "Save RSVP"}
          </Button>
          <Button
            variant="default"
            onClick={handleContinue}
            disabled={!canContinue()}
            className="flex-1 gap-2"
          >
            {getContinueButtonText()}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    // Step 2: Back + Save + Continue (Add Dietary Info)
    if (currentStep === 2) {
      return (
        <div className="flex gap-2 w-full">
          <Button 
            variant="outline" 
            onClick={handleBack}
            disabled={loading}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={loading || !canContinue()}
            className="flex-1"
          >
            {loading ? "Saving..." : "Save RSVP"}
          </Button>
          <Button
            variant="default"
            onClick={handleContinue}
            disabled={!canContinue()}
            className="flex-1 gap-2"
          >
            Add Dietary Info
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    // Step 3: Back + Save
    return (
      <div className="flex gap-2 w-full">
        <Button 
          variant="outline" 
          onClick={handleBack}
          disabled={loading}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          variant="default"
          onClick={handleSave}
          disabled={loading || !canContinue()}
          className="flex-1"
        >
          {loading ? "Saving..." : "Save RSVP"}
        </Button>
      </div>
    );
  };

  const content = (
    <>
      {renderStepIndicator()}
      <div key={currentStep} className={cn("transition-all duration-300", currentStep === 1 ? "animate-in slide-in-from-right" : "")}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>
    </>
  );

  // Desktop always uses Dialog
  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getStepTitle()}</DialogTitle>
            <DialogDescription>{getStepDescription()}</DialogDescription>
          </DialogHeader>
          {content}
          <DialogFooter>
            {renderButtons()}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile uses bottom Drawer for all steps
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent 
        className="h-[100dvh] overflow-hidden flex flex-col"
      >
        <DrawerHeader className="pb-3 flex-shrink-0">
          <DrawerTitle>{getStepTitle()}</DrawerTitle>
          <DrawerDescription>{getStepDescription()}</DrawerDescription>
        </DrawerHeader>
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-y-contain px-4 [@supports(-webkit-touch-callout:none)]:[-webkit-overflow-scrolling:touch] touch-pan-y pb-4" 
          data-vaul-no-drag
        >
          {content}
        </div>
        <DrawerFooter className="flex-shrink-0 pt-4 pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))] border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          {renderButtons()}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
