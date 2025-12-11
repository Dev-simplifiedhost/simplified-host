import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, XCircle, HelpCircle, Users, Calendar, Clock, Search, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import { rsvpFormSchema } from "@/lib/formValidation";
import { sanitizeName, sanitizeEmail, sanitizeLongText } from "@/lib/sanitization";
import { cleanPhoneNumber, getExampleNumber, validatePhoneNumber } from "@/lib/phoneFormat";
import { PhoneInputWithCountry } from "@/components/ui/phone-input";
import { cn } from "@/lib/utils";
import { z } from "zod";

interface RSVPFormProps {
  eventId: string;
  eventName: string;
  eventDate: string | null;
  startTime: string | null;
  maxAttendees: number | null;
  rsvpDeadline: string | null;
  onOpenWizard?: () => void;
}

export const RSVPForm = ({ 
  eventId, 
  eventName, 
  eventDate, 
  startTime,
  maxAttendees,
  rsvpDeadline,
  onOpenWizard
}: RSVPFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { verifyRecaptcha } = useRecaptcha();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'attending' | 'maybe' | 'not_attending' | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [message, setMessage] = useState("");
  const [additionalGuests, setAdditionalGuests] = useState<string[]>([]);
  const [attendeeCount, setAttendeeCount] = useState(0);
  const [existingRsvp, setExistingRsvp] = useState<any>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [allowPlusOnes, setAllowPlusOnes] = useState(false);
  const [maxPlusOnes, setMaxPlusOnes] = useState<number | null>(null);
  const [requireEmailForRsvp, setRequireEmailForRsvp] = useState(false);
  const [phoneError, setPhoneError] = useState<string>("");
  const [phoneValid, setPhoneValid] = useState<boolean>(false);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [dietaryOther, setDietaryOther] = useState("");
  const [dietaryAllergy, setDietaryAllergy] = useState("");
  const [findRsvpDialogOpen, setFindRsvpDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchCountryCode, setSearchCountryCode] = useState("US");
  const [usingProfileData, setUsingProfileData] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [realtimeErrors, setRealtimeErrors] = useState<Record<string, string>>({});
  const [hasExistingConsent, setHasExistingConsent] = useState(false);
  const [consentChecking, setConsentChecking] = useState(false);
  const [consentDate, setConsentDate] = useState<string | null>(null);
  const [smsOptIn, setSmsOptIn] = useState(true);

  // Check for existing RSVP on mount
  useEffect(() => {
    const token = localStorage.getItem(`rsvp_token_${eventId}`);
    if (token) {
      setGuestToken(token);
      loadExistingRsvp(token);
    }
    loadAttendeeCount();
  }, [eventId]);

  // Load event settings (allow_plus_ones, max_plus_ones)
  useEffect(() => {
    const loadEventSettings = async () => {
      const { data } = await supabase
        .from('events')
        .select('allow_plus_ones, max_plus_ones')
        .eq('id', eventId)
        .single();
      
      if (data) {
        setAllowPlusOnes(data.allow_plus_ones);
        setMaxPlusOnes(data.max_plus_ones);
      }
    };
    
    loadEventSettings();
  }, [eventId]);

  // Auto-focus on name field when form loads (only if no existing RSVP)
  useEffect(() => {
    if (!existingRsvp && nameInputRef.current && !guestName) {
      // Delay to ensure page has loaded
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [existingRsvp, guestName]);

  // Auto-fill form for authenticated users
  useEffect(() => {
    const loadProfileData = async () => {
      if (user && !existingRsvp) {
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
  }, [user, existingRsvp]);

  // Load saved guest info from localStorage for non-authenticated users
  useEffect(() => {
    if (!user && !existingRsvp) {
      const savedGuestInfo = localStorage.getItem('saved_guest_info');
      if (savedGuestInfo) {
        try {
          const parsed = JSON.parse(savedGuestInfo);
          if (parsed.name && !guestName) {
            setGuestName(parsed.name);
            setUsingProfileData(true);
          }
          if (parsed.email && !guestEmail) {
            setGuestEmail(parsed.email);
            setUsingProfileData(true);
          }
          if (parsed.phone && !guestPhone) {
            setGuestPhone(parsed.phone);
            setUsingProfileData(true);
          }
          if (parsed.countryCode && !countryCode) {
            setCountryCode(parsed.countryCode);
          }
        } catch (error) {
          console.error('Failed to parse saved guest info:', error);
        }
      }
    }
  }, [user, existingRsvp]);

  const loadEventSettings = async () => {
    const { data } = await supabase
      .from('events')
      .select('allow_plus_ones, require_email_for_rsvp')
      .eq('id', eventId)
      .single();
    
    if (data) {
      setAllowPlusOnes(data.allow_plus_ones ?? true);
      setRequireEmailForRsvp((data as any).require_email_for_rsvp || false);
    }
  };

  const loadExistingRsvp = async (token: string) => {
    const { data, error } = await supabase
.rpc('get_my_rsvp_full', {
        p_event_id: eventId,
        p_guest_token: token
      })
      .maybeSingle();

    if (data && !error) {
      const r: any = data as any;
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
      
      // Parse additional_guests from JSONB array
      const guests = (r as any).additional_guests as string[] | null;
      setAdditionalGuests(guests && Array.isArray(guests) ? guests : []);
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

  const handleFindRsvp = async () => {
    if (!searchName.trim() || !searchPhone.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both your name and phone number",
        variant: "destructive"
      });
      return;
    }

    const cleanedPhone = cleanPhoneNumber(searchPhone);
    
    const { data: rsvp, error } = await supabase
      .rpc('find_my_rsvp', {
        p_event_id: eventId,
        p_guest_name: searchName.trim(),
        p_guest_phone: cleanedPhone,
        p_country_code: searchCountryCode
      })
      .maybeSingle();

    if (error || !rsvp) {
      toast({
        title: "RSVP Not Found",
        description: "No RSVP found with that name and phone number combination",
        variant: "destructive"
      });
      return;
    }

    // Load the RSVP
    localStorage.setItem(`rsvp_token_${eventId}`, rsvp.guest_token);
    setGuestToken(rsvp.guest_token);
    setExistingRsvp(rsvp);
    setStatus(rsvp.rsvp_status as 'attending' | 'maybe' | 'not_attending');
    setGuestName(rsvp.guest_name);
    setGuestEmail(rsvp.guest_email || "");
    setGuestPhone(rsvp.guest_phone || "");
    setCountryCode(rsvp.country_code || "US");
    setMessage(rsvp.message || "");
    setDietaryPreferences(rsvp.dietary_preferences || []);
    setDietaryOther(rsvp.dietary_other || "");
    setDietaryAllergy(rsvp.dietary_allergy || "");
    
    // Parse additional_guests from JSONB array
    const guests = (rsvp as any).additional_guests as string[] | null;
    setAdditionalGuests(guests && Array.isArray(guests) ? guests : []);

    setFindRsvpDialogOpen(false);
    toast({
      title: "RSVP Found!",
      description: "Your RSVP has been loaded successfully"
    });
  };

  const handlePhoneChange = (value: string) => {
    setGuestPhone(value);
    if (phoneError) {
      setPhoneError("");
    }
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

  const handlePhoneBlur = () => {
    if (guestPhone) {
      validatePhone(guestPhone, countryCode);
      checkGlobalConsent(guestPhone, countryCode);
    }
  };

  // Real-time validation functions
  const validateNameRealtime = (value: string) => {
    if (!value.trim()) {
      return "Name is required";
    }
    if (value.length > 100) {
      return "Name must be less than 100 characters";
    }
    return "";
  };

  const validateEmailRealtime = (value: string) => {
    if (requireEmailForRsvp && !value.trim()) {
      return "Email is required";
    }
    if (!value.trim()) {
      return ""; // Email is optional when not required
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Please enter a valid email address";
    }
    if (value.length > 255) {
      return "Email must be less than 255 characters";
    }
    return "";
  };

  const validateMessageRealtime = (value: string) => {
    if (value.length > 1000) {
      return "Message must be less than 1000 characters";
    }
    return "";
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
  };

  const handleNameChange = (value: string) => {
    setGuestName(value);
    if (touchedFields.name) {
      const error = validateNameRealtime(value);
      setRealtimeErrors(prev => ({ ...prev, name: error }));
    }
  };

  const handleEmailChange = (value: string) => {
    setGuestEmail(value);
    if (touchedFields.email) {
      const error = validateEmailRealtime(value);
      setRealtimeErrors(prev => ({ ...prev, email: error }));
    }
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    if (touchedFields.message) {
      const error = validateMessageRealtime(value);
      setRealtimeErrors(prev => ({ ...prev, message: error }));
    }
  };

  const handleQuickRsvp = async (newStatus: 'attending' | 'maybe' | 'not_attending') => {
    setStatus(newStatus);
    
    // Check if authenticated user has all required fields populated
    const hasRequiredFields = guestName.trim() && guestPhone.trim() && phoneValid;
    
    if (user && hasRequiredFields && canSubmit) {
      // Auto-submit for authenticated users with complete info
      // Create a synthetic form event
      const syntheticEvent = { preventDefault: () => {} } as React.FormEvent;
      
      // Temporarily override status since React state updates are async
      const currentFormStatus = newStatus;
      
      // Wait a brief moment for state to update
      setTimeout(async () => {
        setLoading(true);
        setValidationErrors({});
        
        // Validate phone before submission
        if (!validatePhone(guestPhone, countryCode)) {
          toast({
            title: "Invalid Phone Number",
            description: phoneError,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
        
        // Sanitize inputs
        const sanitizedData = {
          guestName: sanitizeName(guestName),
          guestEmail: guestEmail ? sanitizeEmail(guestEmail) : '',
          guestPhone: cleanPhoneNumber(guestPhone),
          rsvpStatus: currentFormStatus,
          message: sanitizeLongText(message, 1000),
          additionalGuests: additionalGuests.map(g => sanitizeName(g)).filter(g => g.trim()),
        };

        // Validate inputs
        try {
          rsvpFormSchema.parse(sanitizedData);
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
              description: "Please check your input and try again",
              variant: "destructive"
            });
            setLoading(false);
            return;
          }
        }

        try {
          // Verify reCAPTCHA
          const isHuman = await verifyRecaptcha('rsvp_submit');
          if (!isHuman) {
            setLoading(false);
            return;
          }
          
          if (existingRsvp) {
            // Update existing RSVP
            const { error } = await supabase
              .from('rsvps')
              .update({
                guest_name: sanitizedData.guestName,
                guest_email: sanitizedData.guestEmail || null,
                guest_phone: sanitizedData.guestPhone,
                country_code: countryCode,
                rsvp_status: currentFormStatus,
                message: sanitizedData.message || null,
                additional_guests: sanitizedData.additionalGuests.length > 0 ? sanitizedData.additionalGuests : [],
                dietary_preferences: dietaryPreferences,
                dietary_other: sanitizeLongText(dietaryOther, 100) || null,
                dietary_allergy: sanitizeLongText(dietaryAllergy, 100) || null,
              })
              .eq('guest_token', guestToken!);

          if (error) throw error;

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
            description: `Your response has been updated to: ${getStatusLabel(currentFormStatus)}`
          });
          } else {
            // Create new RSVP
            const { data, error } = await supabase
              .from('rsvps')
              .insert({
                event_id: eventId,
                guest_name: sanitizedData.guestName,
                guest_email: sanitizedData.guestEmail || null,
                guest_phone: sanitizedData.guestPhone,
                country_code: countryCode,
                rsvp_status: currentFormStatus,
                message: sanitizedData.message || null,
                additional_guests: sanitizedData.additionalGuests.length > 0 ? sanitizedData.additionalGuests : [],
                dietary_preferences: dietaryPreferences,
                dietary_other: sanitizeLongText(dietaryOther, 100) || null,
                dietary_allergy: sanitizeLongText(dietaryAllergy, 100) || null,
                source: 'quick_rsvp'
              })
              .select()
              .single();

            if (error) throw error;

            // Save token to localStorage
            localStorage.setItem(`rsvp_token_${eventId}`, data.guest_token);
            setGuestToken(data.guest_token);
            setExistingRsvp(data);

            toast({
              title: "RSVP Confirmed! ✓",
              description: `Thanks, ${sanitizedData.guestName}! You're marked as ${getStatusLabel(currentFormStatus)}.`
            });
          }

          loadAttendeeCount();
        } catch (error: any) {
          console.error('RSVP submission error:', error);
          
          // If update failed with RLS error, clear state and prompt retry
          if (existingRsvp && error.message?.includes('row-level security')) {
            console.log('RLS error detected - clearing state for retry');
            setExistingRsvp(null);
            setGuestToken(null);
            localStorage.removeItem(`rsvp_token_${eventId}`);
            
            toast({
              title: "Please Try Again",
              description: "We encountered an issue updating your RSVP. Please resubmit your response.",
              variant: "default"
            });
            setLoading(false);
            return;
          }
          
          // Parse error message for user-friendly display
          let errorMessage = "Failed to submit RSVP. Please try again.";
          
          if (error.message?.includes('row-level security')) {
            errorMessage = "Unable to save your RSVP. Please try refreshing the page and submitting again.";
          } else if (error.message?.includes('duplicate key')) {
            errorMessage = "You've already submitted an RSVP for this event.";
          } else if (error.message?.includes('foreign key')) {
            errorMessage = "This event is no longer available.";
          } else if (error.message?.includes('violates check constraint')) {
            errorMessage = "Some of the information provided is invalid. Please check your entries.";
          }
          
          toast({
            title: "Unable to Submit RSVP",
            description: errorMessage,
            variant: "destructive"
          });
        } finally {
          setLoading(false);
        }
      }, 50);
    } else {
      // Scroll to form to complete other required fields
      setTimeout(() => {
        const formElement = document.querySelector('form');
        formElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});
    
    // Validate phone before submission
    if (!validatePhone(guestPhone, countryCode)) {
      toast({
        title: "Invalid Phone Number",
        description: phoneError,
        variant: "destructive",
      });
      return;
    }
    
    // Sanitize inputs
    const sanitizedData = {
      guestName: sanitizeName(guestName),
      guestEmail: guestEmail ? sanitizeEmail(guestEmail) : '',
      guestPhone: cleanPhoneNumber(guestPhone),
      rsvpStatus: status,
      message: sanitizeLongText(message, 1000),
      additionalGuests: additionalGuests.map(g => sanitizeName(g)).filter(g => g.trim()),
    };

    // Validate inputs
    try {
      rsvpFormSchema.parse(sanitizedData);
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
          description: "Please check your input and try again",
          variant: "destructive"
        });
        return;
      }
    }

    if (!status || !sanitizedData.guestName || !sanitizedData.guestPhone) {
      toast({
        title: "Missing information",
        description: "Please select your RSVP status, enter your name and phone number",
        variant: "destructive"
      });
      return;
    }

    // Check deadline
    if (rsvpDeadline && new Date(rsvpDeadline) < new Date()) {
      toast({
        title: "RSVP Closed",
        description: "The RSVP deadline has passed",
        variant: "destructive"
      });
      return;
    }

    // Check capacity
    if (maxAttendees && attendeeCount >= maxAttendees && status === 'attending' && !existingRsvp) {
      toast({
        title: "Event Full",
        description: "This event has reached maximum capacity",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Verify reCAPTCHA
      const isHuman = await verifyRecaptcha('rsvp_submit');
      if (!isHuman) {
        setLoading(false);
        return;
      }
      
      // Defensive check: ensure state consistency before proceeding
      if (existingRsvp && !guestToken) {
        console.log('State inconsistency detected - treating as new RSVP');
        setExistingRsvp(null);
        localStorage.removeItem(`rsvp_token_${eventId}`);
      }
      
      if (existingRsvp) {
        // Update existing RSVP
        const { error } = await supabase
          .from('rsvps')
          .update({
            guest_name: sanitizedData.guestName,
            guest_email: sanitizedData.guestEmail || null,
            guest_phone: sanitizedData.guestPhone,
            country_code: countryCode,
            rsvp_status: status,
            message: sanitizedData.message || null,
            additional_guests: sanitizedData.additionalGuests.length > 0 ? sanitizedData.additionalGuests : [],
            dietary_preferences: dietaryPreferences,
            dietary_other: sanitizeLongText(dietaryOther, 100) || null,
            dietary_allergy: sanitizeLongText(dietaryAllergy, 100) || null,
          })
          .eq('guest_token', guestToken!);

        if (error) throw error;

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
          description: `Your response has been updated to: ${getStatusLabel(status)}`
        });
      } else {
        // Create new RSVP
        const { data, error } = await supabase
          .from('rsvps')
          .insert({
            event_id: eventId,
            guest_name: sanitizedData.guestName,
            guest_email: sanitizedData.guestEmail || null,
            guest_phone: sanitizedData.guestPhone,
            country_code: countryCode,
            rsvp_status: status,
            message: sanitizedData.message || null,
            additional_guests: sanitizedData.additionalGuests.length > 0 ? sanitizedData.additionalGuests : [],
            dietary_preferences: dietaryPreferences,
            dietary_other: sanitizeLongText(dietaryOther, 100) || null,
            dietary_allergy: sanitizeLongText(dietaryAllergy, 100) || null,
            source: 'link'
          })
          .select()
          .single();

        if (error) throw error;

        // Save token to localStorage
        localStorage.setItem(`rsvp_token_${eventId}`, data.guest_token);
        setGuestToken(data.guest_token);
        setExistingRsvp(data);

        // Save guest info for future events (non-authenticated users only)
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
          guest_token: data.guest_token,
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
          title: "RSVP Confirmed! ✓",
          description: `Thanks, ${sanitizedData.guestName}! You're marked as ${getStatusLabel(status)}.`
        });
      }

      loadAttendeeCount();
    } catch (error: any) {
      console.error('RSVP submission error:', error);
      
      // If update failed with RLS error, clear state and prompt retry
      if (existingRsvp && error.message?.includes('row-level security')) {
        console.log('RLS error detected - clearing state for retry');
        setExistingRsvp(null);
        setGuestToken(null);
        localStorage.removeItem(`rsvp_token_${eventId}`);
        
        toast({
          title: "Please Try Again",
          description: "We encountered an issue updating your RSVP. Please resubmit your response.",
          variant: "default"
        });
        setLoading(false);
        return;
      }
      
      // Parse error message for user-friendly display
      let errorMessage = "Failed to submit RSVP. Please try again.";
      
      if (error.message?.includes('row-level security')) {
        errorMessage = "Unable to save your RSVP. Please try refreshing the page and submitting again.";
      } else if (error.message?.includes('duplicate key')) {
        errorMessage = "You've already submitted an RSVP for this event.";
      } else if (error.message?.includes('foreign key')) {
        errorMessage = "This event is no longer available.";
      } else if (error.message?.includes('violates check constraint')) {
        errorMessage = "Some of the information provided is invalid. Please check your entries.";
      }
      
      toast({
        title: "Unable to Submit RSVP",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (s: string) => {
    switch (s) {
      case 'attending': return 'Attending';
      case 'maybe': return 'Maybe';
      case 'not_attending': return 'Not Attending';
      default: return '';
    }
  };

  const clearSavedInfo = () => {
    localStorage.removeItem('saved_guest_info');
    setGuestName('');
    setGuestEmail('');
    setGuestPhone('');
    setCountryCode('US');
    setUsingProfileData(false);
    toast({
      title: "Info Cleared",
      description: "Your saved information has been cleared"
    });
  };

  const isDeadlinePassed = rsvpDeadline && new Date(rsvpDeadline) < new Date();
  const isEventFull = maxAttendees && attendeeCount >= maxAttendees;
  const canSubmit = !isDeadlinePassed && (!isEventFull || existingRsvp);

  // Get field status for visual feedback
  const getFieldStatus = (fieldName: string, error: string) => {
    if (!touchedFields[fieldName]) return null;
    return error ? 'error' : 'success';
  };

  // Show wizard button if onOpenWizard is provided
  if (onOpenWizard) {
    return (
      <Card className="border">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Users className="h-4 w-4" />
            RSVP to {eventName}
          </CardTitle>
          <CardDescription className="text-xs space-y-1">
            {eventDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(new Date(eventDate), "PPP")}</span>
                {startTime && (
                  <>
                    <Clock className="h-3.5 w-3.5 ml-1" />
                    <span>{format(new Date(`2000-01-01T${startTime}`), "h:mm a")}</span>
                  </>
                )}
              </div>
            )}
            {rsvpDeadline && (
              <div className="flex items-center gap-1">
                <span>RSVP by {format(new Date(rsvpDeadline), "MMM d")}</span>
                {isDeadlinePassed && <span className="text-destructive">(Closed)</span>}
              </div>
            )}
            {maxAttendees && (
              <div>
                {attendeeCount} / {maxAttendees} spots
                {isEventFull && <span className="text-destructive ml-1">(Full)</span>}
              </div>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              {existingRsvp 
                ? "You've already RSVP'd to this event. Click below to update your response."
                : "Let us know if you can make it!"}
            </p>
            <Button 
              onClick={onOpenWizard}
              disabled={!canSubmit}
              size="lg"
              className="w-full max-w-xs"
            >
              {existingRsvp ? "Update RSVP" : "RSVP Now"}
            </Button>
            {existingRsvp && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg inline-block">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Current status: <strong>{getStatusLabel(existingRsvp.rsvp_status)}</strong></span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <Users className="h-4 w-4" />
          RSVP to {eventName}
        </CardTitle>
        <CardDescription className="text-xs space-y-1">
          {eventDate && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>{format(new Date(eventDate), "PPP")}</span>
              {startTime && (
                <>
                  <Clock className="h-3.5 w-3.5 ml-1" />
                  <span>{format(new Date(`2000-01-01T${startTime}`), "h:mm a")}</span>
                </>
              )}
            </div>
          )}
          {rsvpDeadline && (
            <div className="flex items-center gap-1">
              <span>RSVP by {format(new Date(rsvpDeadline), "MMM d")}</span>
              {isDeadlinePassed && <span className="text-destructive">(Closed)</span>}
            </div>
          )}
          {maxAttendees && (
            <div>
              {attendeeCount} / {maxAttendees} spots
              {isEventFull && <span className="text-destructive ml-1">(Full)</span>}
            </div>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Find My RSVP Banner */}
        {!existingRsvp && (
          <Card className="border-2 border-primary/20 bg-primary/5">
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">Already RSVP'd?</h4>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Retrieve your previous response to update or view details
                  </p>
                </div>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => setFindRsvpDialogOpen(true)}
                  className="shrink-0"
                >
                  <Search className="h-3.5 w-3.5 mr-1.5" />
                  Find RSVP
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Data Badge */}
        {usingProfileData && (
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <Sparkles className="h-3 w-3" />
              {user ? 'Using your profile info' : 'Using info from previous RSVP'}
            </Badge>
            {!user && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSavedInfo}
                className="h-6 text-xs"
              >
                Not you?
              </Button>
            )}
          </div>
        )}

        {/* Quick RSVP Buttons */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Quick RSVP</Label>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={status === 'attending' ? 'default' : 'outline'}
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => handleQuickRsvp('attending')}
              disabled={!canSubmit || loading}
            >
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-xs font-semibold">I'll be there</span>
            </Button>
            
            <Button
              type="button"
              variant={status === 'maybe' ? 'default' : 'outline'}
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => handleQuickRsvp('maybe')}
              disabled={!canSubmit || loading}
            >
              <HelpCircle className="h-5 w-5" />
              <span className="text-xs font-semibold">Maybe</span>
            </Button>
            
            <Button
              type="button"
              variant={status === 'not_attending' ? 'default' : 'outline'}
              className="h-auto py-3 flex flex-col items-center gap-1"
              onClick={() => handleQuickRsvp('not_attending')}
              disabled={!canSubmit || loading}
            >
              <XCircle className="h-5 w-5" />
              <span className="text-xs font-semibold">Can't make it</span>
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* 2-Column Grid: Name and Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs">Full Name *</Label>
              <div className="relative">
                <Input
                  ref={nameInputRef}
                  id="name"
                  type="text"
                  value={guestName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={() => handleFieldBlur('name')}
                  placeholder="Your name"
                  required
                  disabled={!canSubmit}
                  maxLength={100}
                  className={`h-8 text-sm pr-8 ${
                    getFieldStatus('name', realtimeErrors.name) === 'error' 
                      ? 'border-destructive focus-visible:ring-destructive' 
                      : getFieldStatus('name', realtimeErrors.name) === 'success'
                      ? 'border-green-500 focus-visible:ring-green-500'
                      : ''
                  }`}
                  autoComplete="name"
                  enterKeyHint="next"
                />
                {touchedFields.name && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {realtimeErrors.name ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : guestName.trim() ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : null}
                  </div>
                )}
              </div>
              {touchedFields.name && realtimeErrors.name && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  {realtimeErrors.name}
                </p>
              )}
              {validationErrors.guestName && (
                <p className="text-xs text-destructive">{validationErrors.guestName}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs">
                Email {requireEmailForRsvp && '*'}
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  value={guestEmail}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  onBlur={() => handleFieldBlur('email')}
                  placeholder="you@example.com"
                  required={requireEmailForRsvp}
                  disabled={!canSubmit}
                  maxLength={255}
                  className={`h-8 text-sm pr-8 ${
                    getFieldStatus('email', realtimeErrors.email) === 'error' 
                      ? 'border-destructive focus-visible:ring-destructive' 
                      : getFieldStatus('email', realtimeErrors.email) === 'success'
                      ? 'border-green-500 focus-visible:ring-green-500'
                      : ''
                  }`}
                  autoComplete="email"
                  enterKeyHint="next"
                />
                {touchedFields.email && guestEmail && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    {realtimeErrors.email ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                )}
              </div>
              {touchedFields.email && realtimeErrors.email && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  {realtimeErrors.email}
                </p>
              )}
              {validationErrors.guestEmail && (
                <p className="text-xs text-destructive">{validationErrors.guestEmail}</p>
              )}
            </div>
          </div>

          {/* 2-Column Grid: Phone and Attendance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-xs">Phone *</Label>
              <PhoneInputWithCountry
                value={guestPhone}
                onChange={handlePhoneChange}
                countryCode={countryCode}
                onCountryChange={(country) => {
                  setCountryCode(country || 'US');
                  if (guestPhone) {
                    validatePhone(guestPhone, country || 'US');
                  }
                }}
                disabled={!canSubmit}
                required
                placeholder={getExampleNumber(countryCode)}
                error={phoneError}
                onBlur={handlePhoneBlur}
              />
              {consentChecking && guestPhone && guestPhone.length >= 10 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <span className="animate-pulse">Checking SMS preferences...</span>
                </p>
              )}
              {phoneValid && !consentChecking && hasExistingConsent && (
                <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800 mt-1">
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
                <div className="flex items-start space-x-2 p-2 bg-muted/50 rounded-md mt-1">
                  <Checkbox 
                    id="sms-optin"
                    checked={smsOptIn}
                    onCheckedChange={(checked) => setSmsOptIn(!!checked)}
                    className="mt-0.5"
                    disabled={!canSubmit}
                  />
                  <Label htmlFor="sms-optin" className="text-xs text-muted-foreground leading-snug cursor-pointer">
                    Receive event updates via text message. You can opt out anytime by replying STOP.
                  </Label>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Attendance *</Label>
              <Select 
                value={status || ""} 
                onValueChange={(value) => setStatus(value as 'attending' | 'maybe' | 'not_attending')}
                disabled={!canSubmit}
              >
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Select response" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="attending">Yes</SelectItem>
                  <SelectItem value="maybe">Maybe</SelectItem>
                  <SelectItem value="not_attending">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dietary Preferences */}
          <div className="space-y-1.5">
            <Label className="text-xs">Dietary Preferences</Label>
            <div className="flex flex-wrap gap-1">
              {[
                'Vegetarian',
                'Vegan',
                'Gluten-free',
                'Kosher',
                'Nut-free'
              ].map((pref) => {
                const value = pref.toLowerCase().replace('-', '_');
                const isSelected = dietaryPreferences.includes(value);
                
                return (
                  <Button
                    key={pref}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (isSelected) {
                        setDietaryPreferences(dietaryPreferences.filter(p => p !== value));
                      } else {
                        setDietaryPreferences([...dietaryPreferences, value]);
                      }
                    }}
                    disabled={!canSubmit}
                    className="rounded-full h-6 text-xs px-2.5"
                  >
                    {pref}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* 2-Column Grid: Other and Allergy */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="dietary-other" className="text-xs">Other</Label>
              <Input
                id="dietary-other"
                type="text"
                value={dietaryOther}
                onChange={(e) => setDietaryOther(e.target.value)}
                placeholder="Other preference"
                disabled={!canSubmit}
                maxLength={100}
                className="h-8 text-sm"
                autoComplete="off"
                enterKeyHint="next"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="allergy" className="text-xs">Allergy (if any)</Label>
              <Input
                id="allergy"
                type="text"
                value={dietaryAllergy}
                onChange={(e) => setDietaryAllergy(e.target.value)}
                placeholder="Allergy info"
                disabled={!canSubmit}
                maxLength={100}
                className="h-8 text-sm"
                autoComplete="off"
                enterKeyHint="next"
              />
            </div>
          </div>

          {/* Message to Host */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="message" className="text-xs">Message to Host (optional)</Label>
              <span className={`text-xs ${message.length > 900 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {message.length}/1000
              </span>
            </div>
            <div className="relative">
              <Textarea
                id="message"
                value={message}
                onChange={(e) => handleMessageChange(e.target.value)}
                onBlur={() => handleFieldBlur('message')}
                placeholder="Any questions or special requests?"
                disabled={!canSubmit}
                rows={2}
                maxLength={1000}
                className={`text-xs resize-none ${
                  touchedFields.message && realtimeErrors.message
                    ? 'border-destructive focus-visible:ring-destructive'
                    : ''
                }`}
                autoComplete="off"
                enterKeyHint="done"
              />
            </div>
            {touchedFields.message && realtimeErrors.message && (
              <p className="text-xs text-destructive">{realtimeErrors.message}</p>
            )}
            {validationErrors.message && (
              <p className="text-xs text-destructive">{validationErrors.message}</p>
            )}
          </div>

          {/* Additional Guests Section */}
          {allowPlusOnes && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Additional Guests</Label>
                {maxPlusOnes && (
                  <span className="text-xs text-muted-foreground">
                    {additionalGuests.length} of {maxPlusOnes} added
                  </span>
                )}
              </div>

              {additionalGuests.map((guest, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="relative">
                      <Input
                        placeholder={`Guest ${index + 1} name`}
                        value={guest}
                        onChange={(e) => {
                          const newGuests = [...additionalGuests];
                          newGuests[index] = e.target.value;
                          setAdditionalGuests(newGuests);
                        }}
                        onBlur={() => {
                          const trimmed = guest.trim();
                          if (!trimmed) {
                            setValidationErrors(prev => ({ ...prev, [`additionalGuest${index}`]: "Please enter a guest name" }));
                          } else if (trimmed.length < 2) {
                            setValidationErrors(prev => ({ ...prev, [`additionalGuest${index}`]: "Name must be at least 2 characters" }));
                          } else if (trimmed.length > 100) {
                            setValidationErrors(prev => ({ ...prev, [`additionalGuest${index}`]: "Name must be less than 100 characters" }));
                          } else {
                            setValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors[`additionalGuest${index}`];
                              return newErrors;
                            });
                          }
                        }}
                        disabled={!canSubmit}
                        className={cn(
                          "h-8 text-sm",
                          validationErrors[`additionalGuest${index}`] && "border-destructive focus-visible:ring-destructive"
                        )}
                      />
                      {!validationErrors[`additionalGuest${index}`] && guest.trim().length >= 2 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">✓</span>
                      )}
                    </div>
                    {validationErrors[`additionalGuest${index}`] && (
                      <p className="text-xs text-destructive">{validationErrors[`additionalGuest${index}`]}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      const newGuests = additionalGuests.filter((_, i) => i !== index);
                      setAdditionalGuests(newGuests);
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors[`additionalGuest${index}`];
                        return newErrors;
                      });
                    }}
                    disabled={!canSubmit}
                    className="shrink-0 h-8 w-8"
                  >
                    ✕
                  </Button>
                </div>
              ))}

              {(!maxPlusOnes || additionalGuests.length < maxPlusOnes) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdditionalGuests([...additionalGuests, ""])}
                  disabled={!canSubmit}
                  className="w-full h-8 text-sm"
                >
                  + {additionalGuests.length === 0 ? 'Add Guest' : 'Add Another Guest'}
                  {maxPlusOnes && ` (${maxPlusOnes - additionalGuests.length} remaining)`}
                </Button>
              )}
            </div>
          )}

          {/* RSVP Submit Button */}
          <div className="space-y-1.5">
            <Button 
              type="submit" 
              disabled={loading || !canSubmit} 
              className="w-full h-10 font-semibold text-sm"
            >
              {loading ? "Submitting..." : existingRsvp ? "Update RSVP" : "Submit RSVP"}
            </Button>
            
            {/* Status Badge */}
            {existingRsvp && (
              <div className="flex items-center justify-center gap-2 p-1.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-md">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">
                  RSVP Submitted: {getStatusLabel(existingRsvp.rsvp_status)}
                </span>
              </div>
            )}
          </div>

          {/* Status Card */}
          {existingRsvp && (
            <Card className="border bg-muted/50">
              <CardContent className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setExistingRsvp(null);
                      setGuestToken(null);
                      localStorage.removeItem(`rsvp_token_${eventId}`);
                    }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                  <div>
                    <p className="font-medium text-sm">
                      Your RSVP: {getStatusLabel(existingRsvp.rsvp_status)}
                    </p>
                    {canSubmit && (
                      <p className="text-xs text-muted-foreground">
                        Update your response above anytime
                      </p>
                    )}
                  </div>
                </div>
                {canSubmit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Update
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </form>
      </CardContent>

      {/* Find RSVP Dialog */}
      <Dialog open={findRsvpDialogOpen} onOpenChange={setFindRsvpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find My RSVP
            </DialogTitle>
            <DialogDescription>
              Enter your name and phone number to retrieve your RSVP
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="search-name">Full Name</Label>
              <Input
                id="search-name"
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Your name"
                className="h-9"
                autoComplete="name"
                enterKeyHint="next"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="search-phone">Phone Number</Label>
              <PhoneInputWithCountry
                value={searchPhone}
                onChange={setSearchPhone}
                countryCode={searchCountryCode}
                onCountryChange={(country) => setSearchCountryCode(country || 'US')}
                placeholder={getExampleNumber(searchCountryCode)}
              />
            </div>
            <Button onClick={handleFindRsvp} className="w-full">
              Search
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};