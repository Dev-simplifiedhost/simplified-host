import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CalendarIcon, Loader2, ArrowLeft, ArrowRight, Save, CheckCircle, Plus, X, ExternalLink, Sparkles, Share2, AlertCircle, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getTemplateById, type EventTemplate } from "@/lib/eventTemplates";
import { EditModeBanner } from "./EditModeBanner";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface EnhancedWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated?: (eventId: string) => void;
  draftEventId?: string | null;
  templateId?: string | null;
}

type Step = 1 | 2 | 3;

interface ContributionMethod {
  type: string;
  handle: string;
}

interface FormData {
  name: string;
  eventDate: Date | undefined;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  location: string;
  hostName: string;
  description: string;
  eventType: string;
  rsvpDeadline: Date | undefined;
  maxAttendees: string;
  noLimit: boolean;
  privacySetting: "public" | "invite_only";
  showGuestList: boolean;
  allowGuestItems: boolean;
  contributionGoal: string;
  showContributionGoal: boolean;
  contributionMethods: ContributionMethod[];
  contributionMessage: string;
  autoGenerateItems: boolean;
  enableTaskChecklist: boolean;
  welcomeAnnouncement: string;
  parkingInstructions: string;
  accessibilityInfo: string;
  dressCode: string;
  specialRequests: string;
}

export function EnhancedWizardDialog({ open, onOpenChange, onEventCreated, draftEventId, templateId }: EnhancedWizardDialogProps) {
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);
  const [eventId, setEventId] = useState<string | null>(draftEventId || null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [canViewPublicPage, setCanViewPublicPage] = useState(false);
  const [hasDuplicate, setHasDuplicate] = useState(false);
  const [isEditingPublished, setIsEditingPublished] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [originalData, setOriginalData] = useState<FormData | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const pendingCloseRef = useRef(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    eventDate: undefined,
    startTime: "18:00",
    endTime: "21:00",
    isAllDay: false,
    location: "",
    hostName: "",
    description: "",
    eventType: "",
    rsvpDeadline: undefined,
    maxAttendees: "",
    noLimit: true,
    privacySetting: "public",
    showGuestList: false,
    allowGuestItems: true,
    contributionGoal: "",
    showContributionGoal: false, // ✅ Default OFF as requested
    contributionMethods: [],
    contributionMessage: "",
    autoGenerateItems: false,
    enableTaskChecklist: false,
    welcomeAnnouncement: "Welcome to our event! We're so excited to have you join us.",
    parkingInstructions: "",
    accessibilityInfo: "",
    dressCode: "",
    specialRequests: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Compute if there are unsaved changes
  const hasUnsavedChanges = originalData !== null && JSON.stringify(formData) !== JSON.stringify(originalData);

  // Beforeunload protection for unsaved changes
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (open && draftEventId) {
      loadDraft(draftEventId);
    } else if (open && templateId) {
      loadTemplate(templateId);
    } else if (open) {
      loadUserProfile();
    }
  }, [open, draftEventId, templateId]);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.user_metadata?.full_name) {
        setFormData(prev => ({ ...prev, hostName: user.user_metadata.full_name }));
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const loadTemplate = async (id: string) => {
    const template = getTemplateById(id);
    if (!template) return;

    setSelectedTemplate(template);
    
    // Pre-fill form with template data
    setFormData(prev => ({
      ...prev,
      description: template.sampleDescription,
      themeColor: template.themeColor,
      allowGuestItems: template.defaultSettings.allowGuestItems,
      contributionGoal: template.defaultSettings.contributionGoal || "",
      showContributionGoal: template.defaultSettings.showContributionGoal,
      dressCode: template.defaultSettings.dressCode || "",
      specialRequests: template.defaultSettings.specialRequests || "",
    }));

    toast({
      title: `${template.name} template loaded!`,
      description: "We've pre-filled some details. Feel free to customize them.",
    });
  };

  const loadDraft = async (id: string) => {
    try {
      const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
      if (error) throw error;

      if (data) {
        setEventId(data.id);
        setIsEditingPublished(!data.is_draft);
        setIsArchived(data.is_archived ?? false);
        setCanViewPublicPage(!data.is_draft);
        const loadedData: FormData = {
          name: data.name || "",
          eventDate: data.event_date ? new Date(data.event_date) : undefined,
          startTime: data.start_time || "18:00",
          endTime: data.end_time || "21:00",
          isAllDay: data.is_all_day ?? false,
          location: data.location || "",
          hostName: data.host_name || "",
          description: data.description || "",
          eventType: data.event_type || "",
          rsvpDeadline: data.rsvp_deadline ? new Date(data.rsvp_deadline) : undefined,
          maxAttendees: data.max_attendees ? String(data.max_attendees) : "",
          noLimit: !data.max_attendees,
          privacySetting: (data.privacy_setting as "public" | "invite_only") || "public",
          showGuestList: data.show_guest_list ?? false,
          allowGuestItems: data.allow_guest_items ?? true,
          contributionGoal: data.contribution_goal ? String(data.contribution_goal) : "",
          showContributionGoal: data.show_contribution_goal ?? true,
          contributionMethods: (data.contribution_methods as any as ContributionMethod[]) || [],
          contributionMessage: data.contribution_message || "",
          autoGenerateItems: false,
          enableTaskChecklist: false,
          welcomeAnnouncement: data.welcome_announcement || "Welcome to our event! We're so excited to have you join us.",
          parkingInstructions: data.parking_instructions || "",
          accessibilityInfo: data.accessibility_info || "",
          dressCode: data.dress_code || "",
          specialRequests: data.special_requests || "",
        };
        setFormData(loadedData);
        setOriginalData(loadedData);
        setLastSaved(data.auto_saved_at ? new Date(data.auto_saved_at) : null);
      }
    } catch (error: any) {
      console.error("Error loading draft:", error);
    }
  };

  const autosave = useCallback(async () => {
    if (!formData.name) return;
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const eventData = {
        user_id: user.id,
        name: formData.name.trim().substring(0, 80),
        event_date: formData.eventDate?.toISOString() || null,
        start_time: formData.isAllDay ? null : formData.startTime,
        end_time: formData.isAllDay ? null : formData.endTime,
        is_all_day: formData.isAllDay,
        location: formData.location.trim().substring(0, 200) || null,
        host_name: formData.hostName.trim() || null,
        description: formData.description.trim().substring(0, 500) || null,
        event_type: formData.eventType || null,
        rsvp_deadline: formData.rsvpDeadline?.toISOString() || null,
        max_attendees: formData.noLimit ? null : (formData.maxAttendees ? parseInt(formData.maxAttendees) : null),
        privacy_setting: formData.privacySetting,
        show_guest_list: formData.showGuestList,
        allow_guest_items: formData.allowGuestItems,
        contribution_goal: formData.contributionGoal ? parseFloat(formData.contributionGoal) : 0,
        show_contribution_goal: formData.showContributionGoal,
        contribution_methods: formData.contributionMethods as any,
        contribution_message: formData.contributionMessage.trim() || null,
        welcome_announcement: formData.welcomeAnnouncement.trim() || null,
        parking_instructions: formData.parkingInstructions.trim() || null,
        accessibility_info: formData.accessibilityInfo.trim() || null,
        dress_code: formData.dressCode.trim() || null,
        special_requests: formData.specialRequests.trim() || null,
        is_draft: isEditingPublished ? false : true,
        auto_saved_at: new Date().toISOString(),
      };

      if (eventId) {
        const { error } = await supabase.from("events").update(eventData).eq("id", eventId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("events").insert(eventData).select().single();
        if (error) throw error;
        if (data) {
          setEventId(data.id);
          setCanViewPublicPage(true);
        }
      }

      setLastSaved(new Date());
    } catch (error: any) {
      console.error("Autosave error:", error);
    } finally {
      setSaving(false);
    }
  }, [formData, eventId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.name) autosave();
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, autosave]);

  // Check for duplicate events
  useEffect(() => {
    const checkDuplicate = async () => {
      if (!formData.name || !formData.eventDate) {
        setHasDuplicate(false);
        return;
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const eventDateStr = formData.eventDate.toISOString().split('T')[0];
        
        const { data, error } = await supabase
          .from('events')
          .select('id, name')
          .eq('user_id', user.id)
          .eq('name', formData.name.trim())
          .gte('event_date', eventDateStr)
          .lt('event_date', new Date(new Date(eventDateStr).getTime() + 24 * 60 * 60 * 1000).toISOString())
          .neq('id', eventId || '');

        setHasDuplicate(data && data.length > 0);
      } catch (error) {
        console.error('Error checking duplicates:', error);
      }
    };

    const debounceTimer = setTimeout(checkDuplicate, 500);
    return () => clearTimeout(debounceTimer);
  }, [formData.name, formData.eventDate, eventId]);

  const validateField = (field: string, value: any) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case "name":
        if (!value || value.trim().length === 0) {
          newErrors.name = "Event name is required";
        } else if (value.trim().length > 80) {
          newErrors.name = "Event name must be 80 characters or less";
        } else {
          delete newErrors.name;
        }
        break;
      case "eventDate":
        if (!value) {
          newErrors.eventDate = "Event date is required";
        } else if (value < new Date(new Date().setHours(0, 0, 0, 0))) {
          newErrors.eventDate = "Please select a valid future date";
        } else {
          delete newErrors.eventDate;
        }
        break;
      case "endTime":
        if (!formData.isAllDay && formData.startTime && value && value <= formData.startTime) {
          newErrors.endTime = "End time must be after start time";
        } else {
          delete newErrors.endTime;
        }
        break;
      case "location":
        if (!value || value.trim().length === 0) {
          newErrors.location = "Location is required";
        } else if (value.trim().length > 200) {
          newErrors.location = "Location must be 200 characters or less";
        } else {
          delete newErrors.location;
        }
        break;
      case "hostName":
        if (!value || value.trim().length === 0) {
          newErrors.hostName = "Host name is required";
        } else if (value.trim().length > 100) {
          newErrors.hostName = "Host name must be less than 100 characters";
        } else {
          delete newErrors.hostName;
        }
        break;
      case "rsvpDeadline":
        if (value && formData.eventDate && value > formData.eventDate) {
          newErrors.rsvpDeadline = "RSVP deadline cannot be after the event";
        } else {
          delete newErrors.rsvpDeadline;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  const canProceedToStep2 = () => {
    return formData.name && formData.eventDate && formData.location && formData.hostName &&
           !errors.name && !errors.eventDate && !errors.location && !errors.hostName;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!canProceedToStep2()) {
        // ✅ Show toast with missing fields
        const missingFields = [];
        if (!formData.name) missingFields.push("Event Name");
        if (!formData.eventDate) missingFields.push("Event Date");
        if (!formData.location) missingFields.push("Location");
        if (!formData.hostName) missingFields.push("Host Name");
        
        toast({ 
          title: "Missing Required Fields", 
          description: `Please complete: ${missingFields.join(", ")}`,
          variant: "destructive" 
        });
        
        // Highlight missing fields
        validateField("name", formData.name);
        validateField("eventDate", formData.eventDate);
        validateField("location", formData.location);
        validateField("hostName", formData.hostName);
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // ✅ Validate contribution goal if toggle is ON
      if (formData.showContributionGoal && (!formData.contributionGoal || parseFloat(formData.contributionGoal) <= 0)) {
        toast({ 
          title: "Invalid Contribution Goal", 
          description: "You have contribution goal toggled on. Please enter a goal amount greater than $0",
          variant: "destructive" 
        });
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as Step);
  };

  const handleSaveAndShare = async () => {
    // ✅ FIX: Publish the event instead of saving as draft
    validateField("name", formData.name);
    validateField("eventDate", formData.eventDate);
    validateField("location", formData.location);
    validateField("hostName", formData.hostName);
    
    if (!canProceedToStep2()) {
      const missingFields = [];
      if (!formData.name) missingFields.push("Event Name");
      if (!formData.eventDate) missingFields.push("Event Date");
      if (!formData.location) missingFields.push("Location");
      if (!formData.hostName) missingFields.push("Host Name");
      
      toast({ 
        title: "Missing Required Fields", 
        description: `Please complete: ${missingFields.join(", ")}`,
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Authentication required", description: "Please sign in to create an event", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const eventData = {
        user_id: user.id,
        name: formData.name.trim().substring(0, 80),
        event_date: formData.eventDate!.toISOString(),
        start_time: formData.isAllDay ? null : formData.startTime,
        end_time: formData.isAllDay ? null : formData.endTime,
        is_all_day: formData.isAllDay,
        location: formData.location.trim().substring(0, 200),
        host_name: formData.hostName.trim(),
        description: formData.description.trim().substring(0, 500) || null,
        event_type: formData.eventType || null,
        privacy_setting: formData.privacySetting,
        show_guest_list: formData.showGuestList,
        allow_guest_items: formData.allowGuestItems,
        is_draft: false, // ✅ PUBLISH IT!
        published_at: new Date().toISOString(),
      };

      let finalEventId: string | null = null;

      if (eventId) {
        const { error } = await supabase.from("events").update(eventData).eq("id", eventId);
        if (error) throw error;
        finalEventId = eventId;
      } else {
        const { data: event, error } = await supabase.from("events").insert(eventData).select().single();
        if (error) throw error;
        finalEventId = event?.id || null;
      }

      toast({ 
        title: "Event created!", 
        description: "Your event is now live and ready to share" 
      });
      
      if (finalEventId && onEventCreated) onEventCreated(finalEventId);
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: "", eventDate: undefined, startTime: "18:00", endTime: "21:00", isAllDay: false,
        location: "", hostName: "", description: "", eventType: "", rsvpDeadline: undefined, maxAttendees: "",
        noLimit: true, privacySetting: "public", showGuestList: false, allowGuestItems: true, contributionGoal: "",
        showContributionGoal: false, contributionMethods: [], contributionMessage: "",
        autoGenerateItems: false, enableTaskChecklist: false, welcomeAnnouncement: "Welcome to our event! We're so excited to have you join us.",
        parkingInstructions: "", accessibilityInfo: "", dressCode: "", specialRequests: "",
      });
      setErrors({});
      setCurrentStep(1);
      setEventId(null);
      setIsEditingPublished(false);
      setLastSaved(null);
    } catch (error: any) {
      console.error("Error creating event:", error);
      toast({ title: "Error", description: error.message || "Failed to create event. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndExit = async () => {
    await autosave();
    toast({ title: "Draft saved", description: "Your progress has been saved. You can continue later." });
    onOpenChange(false);
  };

  const handleViewPublicPage = () => {
    if (eventId) {
      window.open(`/event/${eventId}`, '_blank');
    }
  };

  const addContributionMethod = () => {
    setFormData(prev => ({
      ...prev,
      contributionMethods: [...prev.contributionMethods, { type: "", handle: "" }]
    }));
  };

  const removeContributionMethod = (index: number) => {
    setFormData(prev => ({
      ...prev,
      contributionMethods: prev.contributionMethods.filter((_, i) => i !== index)
    }));
  };

  const validatePaymentUrl = (type: string, handle: string): string | null => {
    if (!handle.trim()) return null;
    
    const trimmed = handle.trim();
    
    switch (type) {
      case 'venmo':
        // Accept venmo.com URLs or @username
        if (trimmed.startsWith('@')) return null;
        if (trimmed.includes('venmo.com/')) {
          try {
            new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
            return null;
          } catch {
            return "Please enter a valid Venmo URL (e.g., venmo.com/username) or @username";
          }
        }
        return "Please enter a Venmo URL (e.g., venmo.com/username) or @username";
      
      case 'cashapp':
        // Accept cash.app URLs or $cashtag
        if (trimmed.startsWith('$')) return null;
        if (trimmed.includes('cash.app/')) {
          try {
            new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
            return null;
          } catch {
            return "Please enter a valid Cash App URL (e.g., cash.app/$cashtag) or $cashtag";
          }
        }
        return "Please enter a Cash App URL (e.g., cash.app/$cashtag) or $cashtag";
      
      case 'zelle':
        // Zelle uses email or phone, no URL
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+?[\d\s\-()]+$/;
        if (emailRegex.test(trimmed) || phoneRegex.test(trimmed)) return null;
        return "Please enter a valid email or phone number for Zelle";
      
      case 'paypal':
        // Accept PayPal.me URLs or email
        if (trimmed.includes('@')) return null; // Email
        if (trimmed.includes('paypal.me/') || trimmed.includes('paypal.com/paypalme/')) {
          try {
            new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
            return null;
          } catch {
            return "Please enter a valid PayPal.me URL";
          }
        }
        return "Please enter a PayPal.me URL or email";
      
      default:
        return null;
    }
  };

  const updateContributionMethod = (index: number, field: "type" | "handle", value: string) => {
    setFormData(prev => ({
      ...prev,
      contributionMethods: prev.contributionMethods.map((method, i) =>
        i === index ? { ...method, [field]: value } : method
      )
    }));
  };

  const getPaymentPlaceholder = (type: string): string => {
    switch (type) {
      case 'venmo':
        return '@username or venmo.com/username';
      case 'cashapp':
        return '$cashtag or cash.app/$cashtag';
      case 'zelle':
        return 'email@example.com or phone number';
      case 'paypal':
        return 'paypal.me/username or email';
      default:
        return 'Enter payment details';
    }
  };

  const handlePublish = async () => {
    validateField("name", formData.name);
    validateField("eventDate", formData.eventDate);
    validateField("location", formData.location);
    validateField("hostName", formData.hostName);
    
    if (!canProceedToStep2()) {
      toast({ title: "Missing required fields", description: "Please complete all required fields in step 1", variant: "destructive" });
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Authentication required", description: "Please sign in to create an event", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const eventData = {
        user_id: user.id,
        name: formData.name.trim().substring(0, 80),
        event_date: formData.eventDate!.toISOString(),
        start_time: formData.isAllDay ? null : formData.startTime,
        end_time: formData.isAllDay ? null : formData.endTime,
        is_all_day: formData.isAllDay,
        location: formData.location.trim().substring(0, 200),
        host_name: formData.hostName.trim(),
        description: formData.description.trim().substring(0, 500) || null,
        event_type: formData.eventType || null,
        rsvp_deadline: formData.rsvpDeadline?.toISOString() || null,
        max_attendees: formData.noLimit ? null : (formData.maxAttendees ? parseInt(formData.maxAttendees) : null),
        privacy_setting: formData.privacySetting,
        show_guest_list: formData.showGuestList,
        allow_guest_items: formData.allowGuestItems,
        contribution_goal: formData.contributionGoal ? parseFloat(formData.contributionGoal) : 0,
        show_contribution_goal: formData.showContributionGoal,
        contribution_methods: formData.contributionMethods as any,
        contribution_message: formData.contributionMessage.trim() || null,
        welcome_announcement: formData.welcomeAnnouncement.trim() || null,
        parking_instructions: formData.parkingInstructions.trim() || null,
        accessibility_info: formData.accessibilityInfo.trim() || null,
        dress_code: formData.dressCode.trim() || null,
        special_requests: formData.specialRequests.trim() || null,
        is_draft: false,
        published_at: new Date().toISOString(),
      };

      let finalEventId: string | null = null;

      if (eventId) {
        const { error } = await supabase.from("events").update(eventData).eq("id", eventId);
        if (error) throw error;
        finalEventId = eventId;
        toast({ 
          title: isEditingPublished ? "Event updated!" : "Event published!", 
          description: isEditingPublished ? "Your changes have been saved" : "Your event is now live and ready to share" 
        });
        if (onEventCreated) onEventCreated(eventId);
      } else {
        const { data: event, error } = await supabase.from("events").insert(eventData).select().single();
        if (error) throw error;
        finalEventId = event?.id || null;
        toast({ title: "Event published!", description: "Your event is now live and ready to share" });
        if (onEventCreated && event) onEventCreated((event as any).id);
      }

      // Auto-generate items based on event type if enabled
      if (formData.autoGenerateItems && formData.eventType && finalEventId) {
        const itemsByType: Record<string, Array<{name: string, category: string, quantity: number}>> = {
          'birthday': [
            { name: "Birthday Cake", category: "Dessert", quantity: 1 },
            { name: "Decorations", category: "Supplies", quantity: 1 },
            { name: "Party Favors", category: "Supplies", quantity: 1 },
            { name: "Drinks", category: "Beverages", quantity: 1 },
            { name: "Plates & Utensils", category: "Supplies", quantity: 1 }
          ],
          'wedding': [
            { name: "Flowers", category: "Decor", quantity: 1 },
            { name: "Centerpieces", category: "Decor", quantity: 1 },
            { name: "Guest Book", category: "Supplies", quantity: 1 },
            { name: "Favors", category: "Supplies", quantity: 1 },
            { name: "Decorations", category: "Decor", quantity: 1 }
          ],
          'bridal-shower': [
            { name: "Champagne", category: "Drinks", quantity: 3 },
            { name: "Finger Sandwiches", category: "Food", quantity: 1 },
            { name: "Cupcakes", category: "Dessert", quantity: 2 },
            { name: "Decorations", category: "Supplies", quantity: 1 },
            { name: "Party Favors", category: "Supplies", quantity: 1 }
          ],
          'office-party': [
            { name: "Pizza", category: "Food", quantity: 5 },
            { name: "Soda & Water", category: "Drinks", quantity: 2 },
            { name: "Cookies & Brownies", category: "Dessert", quantity: 2 },
            { name: "Plates & Utensils", category: "Supplies", quantity: 1 },
            { name: "Decorations", category: "Supplies", quantity: 1 }
          ],
          'friendsgiving': [
            { name: "Turkey or Main Dish", category: "Food", quantity: 1 },
            { name: "Side Dishes", category: "Food", quantity: 3 },
            { name: "Desserts", category: "Dessert", quantity: 2 },
            { name: "Drinks", category: "Beverages", quantity: 2 },
            { name: "Plates & Utensils", category: "Supplies", quantity: 1 }
          ],
          'holiday-mixer': [
            { name: "Holiday Cookies", category: "Dessert", quantity: 3 },
            { name: "Hot Cocoa Bar", category: "Drinks", quantity: 1 },
            { name: "Cheese & Crackers", category: "Food", quantity: 2 },
            { name: "Holiday Decorations", category: "Decor", quantity: 1 },
            { name: "Holiday Music", category: "Entertainment", quantity: 1 }
          ],
          'fundraiser': [
            { name: "Donation Boxes", category: "Supplies", quantity: 1 },
            { name: "Promotional Materials", category: "Supplies", quantity: 1 },
            { name: "Refreshments", category: "Food", quantity: 1 },
            { name: "Thank You Cards", category: "Supplies", quantity: 1 }
          ],
          'other': [
            { name: "Food", category: "Food", quantity: 1 },
            { name: "Drinks", category: "Beverages", quantity: 1 },
            { name: "Decorations", category: "Decor", quantity: 1 },
            { name: "Music", category: "Entertainment", quantity: 1 }
          ]
        };

        const suggestedItems = itemsByType[formData.eventType] || itemsByType['other'];
        
        const itemsToInsert = suggestedItems.map(item => ({
          event_id: finalEventId,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          is_host_provided: false,
          is_guest_added: false
        }));

        const { error: itemsError } = await supabase
          .from('event_items')
          .insert(itemsToInsert);

        if (itemsError) {
          console.error('Error creating suggested items:', itemsError);
        } else {
          console.log(`Created ${itemsToInsert.length} suggested items`);
        }
      }

      // Auto-generate task checklist if enabled
      if (formData.enableTaskChecklist && formData.eventType && finalEventId) {
        const commonTasks = [
          { title: "Send invitations", timeline_group: "4+ weeks before", priority: "high" as const, due_relative_days: -28 },
          { title: "Book venue/confirm location", timeline_group: "4+ weeks before", priority: "high" as const, due_relative_days: -28 },
          { title: "Create guest list", timeline_group: "4+ weeks before", priority: "medium" as const, due_relative_days: -28 },
          { title: "Finalize guest count", timeline_group: "2 weeks before", priority: "high" as const, due_relative_days: -14 },
          { title: "Order supplies", timeline_group: "2 weeks before", priority: "medium" as const, due_relative_days: -14 },
          { title: "Plan menu", timeline_group: "2 weeks before", priority: "medium" as const, due_relative_days: -14 },
          { title: "Confirm RSVPs", timeline_group: "1 week before", priority: "high" as const, due_relative_days: -7 },
          { title: "Prepare shopping list", timeline_group: "1 week before", priority: "medium" as const, due_relative_days: -7 },
          { title: "Send reminder to guests", timeline_group: "1 week before", priority: "low" as const, due_relative_days: -7 },
          { title: "Set up venue", timeline_group: "1 day before", priority: "high" as const, due_relative_days: -1 },
          { title: "Prep food", timeline_group: "1 day before", priority: "medium" as const, due_relative_days: -1 },
          { title: "Final setup", timeline_group: "Day of", priority: "high" as const, due_relative_days: 0 },
          { title: "Welcome guests", timeline_group: "Day of", priority: "high" as const, due_relative_days: 0 }
        ];

        const tasksToInsert = commonTasks.map(task => ({
          event_id: finalEventId,
          title: task.title,
          status: 'todo' as const,
          priority: task.priority,
          due_relative_days: task.due_relative_days,
          created_by: user.id,
          is_template: false
        }));

        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksToInsert);

        if (tasksError) {
          console.error('Error creating task checklist:', tasksError);
        } else {
          console.log(`Created ${tasksToInsert.length} planning tasks`);
        }
      }

      // After creating event, if template has suggested items, create them too
      if (selectedTemplate && selectedTemplate.suggestedItems.length > 0 && finalEventId) {
        const itemsToInsert = selectedTemplate.suggestedItems.map(item => ({
          event_id: finalEventId,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          is_host_provided: true,
          is_guest_added: false,
        }));

        await supabase.from("event_items").insert(itemsToInsert);
        
        toast({
          title: "Event published with suggested items!",
          description: `Added ${selectedTemplate.suggestedItems.length} items from the ${selectedTemplate.name} template`,
        });
      }

      onOpenChange(false);
      setFormData({
        name: "", eventDate: undefined, startTime: "18:00", endTime: "21:00", isAllDay: false,
        location: "", hostName: "", description: "", eventType: "", rsvpDeadline: undefined, maxAttendees: "",
        noLimit: true, privacySetting: "public", showGuestList: false, allowGuestItems: true, contributionGoal: "",
        showContributionGoal: false, contributionMethods: [], contributionMessage: "",
        autoGenerateItems: false, enableTaskChecklist: false, welcomeAnnouncement: "Welcome to our event! We're so excited to have you join us.",
        parkingInstructions: "", accessibilityInfo: "", dressCode: "", specialRequests: "",
      });
      setErrors({});
      setCurrentStep(1);
      setEventId(null);
      setIsEditingPublished(false);
      setLastSaved(null);
    } catch (error: any) {
      console.error("Error publishing event:", error);
      toast({ title: "Error", description: error.message || "Failed to publish event. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const stepTitles = {
    1: "Essentials",
    2: "Sharing & Limits",
    3: "Enhancements" // ✅ Updated to match screenshot
  };

  const stepDescriptions = {
    1: "We'll save your event as a draft — you can refine details anytime.",
    2: "Control who can see and join your event.",
    3: "Add personal touches to make your event memorable."
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // ✅ Add "Are you sure?" confirmation if closing with unsaved changes
      if (!newOpen && currentStep > 1 && formData.name) {
        const confirmed = window.confirm(
          "Are you sure you want to close? Your progress has been auto-saved and you can continue later from 'My Events' page."
        );
        if (!confirmed) return;
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 sm:rounded-lg">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b shrink-0">
          {/* Title */}
          <div className="mb-4 flex items-center gap-2">
            <DialogTitle className="text-xl sm:text-2xl font-bold">
              {isEditingPublished ? "Edit Event" : draftEventId ? "Continue Draft" : "Create New Group Event"}
            </DialogTitle>
            {draftEventId && (
              <Badge variant="secondary" className="text-xs">{isEditingPublished ? 'Editing' : 'Draft'}</Badge>
            )}
          </div>

          {/* ✅ Step indicator - mimicking screenshot design */}
          <div className="flex items-center gap-1 sm:gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={cn(
                  "px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
                  currentStep === step 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {step}. {stepTitles[step]}
                </div>
                {step < 3 && (
                  <div className="px-1 text-muted-foreground">
                    <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Subtitle */}
          <DialogDescription className="text-sm mt-3 text-muted-foreground">
            {stepDescriptions[currentStep]}
          </DialogDescription>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <form className="space-y-6" role="form" aria-label="Create Event Form">
          {/* Step 1: Essentials */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event-name">
                  Event Name <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground ml-2">(max 80 characters)</span>
                </Label>
                <Input
                  id="event-name"
                  placeholder="e.g., Friendsgiving 2025, Office Holiday Mixer"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  onBlur={() => validateField("name", formData.name)}
                  className={errors.name ? "border-destructive" : ""}
                  maxLength={80}
                  aria-invalid={!!errors.name}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  {errors.name && <p className="text-destructive" role="alert">{errors.name}</p>}
                  <span className="ml-auto">{formData.name.length}/80</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="event-date">
                    Event Date <span className="text-destructive">*</span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="event-date"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.eventDate && "text-muted-foreground",
                          errors.eventDate && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.eventDate ? format(formData.eventDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.eventDate}
                        onSelect={(date) => {
                          setFormData({ ...formData, eventDate: date });
                          validateField("eventDate", date);
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.eventDate && <p className="text-sm text-destructive" role="alert">{errors.eventDate}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="start-time">Start Time</Label>
                  <Input
                    id="start-time"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    disabled={formData.isAllDay}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-time">End Time</Label>
                  <Input
                    id="end-time"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => {
                      setFormData({ ...formData, endTime: e.target.value });
                      validateField("endTime", e.target.value);
                    }}
                    disabled={formData.isAllDay}
                    className={errors.endTime ? "border-destructive" : ""}
                  />
                  {errors.endTime && <p className="text-sm text-destructive" role="alert">{errors.endTime}</p>}
                </div>

                <div className="col-span-2 flex items-center space-x-2">
                  <Switch
                    id="all-day"
                    checked={formData.isAllDay}
                    onCheckedChange={(checked) => setFormData({ ...formData, isAllDay: checked })}
                  />
                  <Label htmlFor="all-day" className="cursor-pointer">All-day event</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">
                  Location <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground ml-2">(max 200 characters)</span>
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., 123 Main St, or https://zoom.us/j/..."
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  onBlur={() => validateField("location", formData.location)}
                  className={errors.location ? "border-destructive" : ""}
                  maxLength={200}
                />
                {errors.location && <p className="text-sm text-destructive" role="alert">{errors.location}</p>}
                {formData.location.startsWith("http") && (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() => window.open(formData.location, "_blank")}
                  >
                    <ExternalLink className="mr-1 h-3 w-3" />
                    Test link
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="host-name">
                  Host Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="host-name"
                  placeholder="Your name"
                  value={formData.hostName}
                  onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                  onBlur={() => validateField("hostName", formData.hostName)}
                  className={errors.hostName ? "border-destructive" : ""}
                />
                {errors.hostName && <p className="text-sm text-destructive" role="alert">{errors.hostName}</p>}
                <p className="text-xs text-muted-foreground">Will be displayed as "Hosted by [Name]"</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-xs text-muted-foreground ml-2">(max 500 characters)</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Tell guests what to expect..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  maxLength={500}
                  aria-describedby="description-count"
                />
                <div id="description-count" className={cn(
                  "text-xs text-right transition-colors",
                  formData.description.length > 450 ? "text-amber-600 font-medium" : "text-muted-foreground"
                )}>
                  {formData.description.length}/500
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Settings */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">RSVP Settings</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="rsvp-deadline">
                    RSVP Deadline (Optional)
                    <span className="text-xs text-muted-foreground ml-2">
                      • Helpful for planning food quantities and seating
                    </span>
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="rsvp-deadline"
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !formData.rsvpDeadline && "text-muted-foreground")}
                        aria-label="Select RSVP deadline"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.rsvpDeadline ? format(formData.rsvpDeadline, "PPP") : <span>No deadline (guests can RSVP anytime)</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.rsvpDeadline}
                        onSelect={(date) => {
                          setFormData({ ...formData, rsvpDeadline: date });
                          validateField("rsvpDeadline", date);
                        }}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.rsvpDeadline && <p className="text-sm text-destructive" role="alert">{errors.rsvpDeadline}</p>}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="max-attendees">Maximum Attendees</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="no-limit"
                        checked={formData.noLimit}
                        onCheckedChange={(checked) => setFormData({ ...formData, noLimit: checked })}
                      />
                      <Label htmlFor="no-limit" className="cursor-pointer text-sm">No limit</Label>
                    </div>
                  </div>
                  <Input
                    id="max-attendees"
                    type="number"
                    placeholder="e.g., 50"
                    value={formData.maxAttendees}
                    onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                    disabled={formData.noLimit}
                    min="1"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow Guest Items</Label>
                    <p className="text-sm text-muted-foreground">Let guests add items to the event list</p>
                  </div>
                  <Switch
                    checked={formData.allowGuestItems}
                    onCheckedChange={(checked) => setFormData({ ...formData, allowGuestItems: checked })}
                    aria-label="Allow guests to add items"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-guest-list" className="text-base font-medium">
                      Show Guest List
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Display RSVP list publicly on event page
                    </p>
                  </div>
                  <Switch
                    id="show-guest-list"
                    checked={formData.showGuestList}
                    onCheckedChange={(checked) => setFormData({ ...formData, showGuestList: checked })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t space-y-4">
                <h3 className="font-medium">Contribution Settings</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <Label>Show Contribution Goal</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Use this when you want guests to contribute financially towards your event (e.g., group gifts, shared expenses, fundraisers). The goal amount will be visible to all guests.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-sm text-muted-foreground">Display a fundraising goal to guests</p>
                  </div>
                  <Switch
                    checked={formData.showContributionGoal}
                    onCheckedChange={(checked) => setFormData({ ...formData, showContributionGoal: checked })}
                    aria-label="Show contribution goal"
                  />
                </div>

                {formData.showContributionGoal && (
                  <div className="space-y-2">
                    <Label htmlFor="contribution-goal">
                      Contribution Goal <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="contribution-goal"
                      type="number"
                      placeholder="100.00"
                      value={formData.contributionGoal}
                      onChange={(e) => setFormData({ ...formData, contributionGoal: e.target.value })}
                      min="0.01"
                      step="0.01"
                      aria-required="true"
                    />
                    {formData.showContributionGoal && (!formData.contributionGoal || parseFloat(formData.contributionGoal) <= 0) && (
                      <p className="text-xs text-destructive">You have contribution goal toggled on. Please enter a goal amount greater than $0</p>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Contribution Methods</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addContributionMethod}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Method
                    </Button>
                  </div>

                  {formData.contributionMethods.map((method, index) => {
                    const validationError = method.type && method.handle ? validatePaymentUrl(method.type, method.handle) : null;
                    const formatHint = method.type && !method.handle ? getPaymentPlaceholder(method.type) : null;
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex gap-2">
                          <Select
                            value={method.type}
                            onValueChange={(value) => updateContributionMethod(index, "type", value)}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="venmo">Venmo</SelectItem>
                              <SelectItem value="zelle">Zelle</SelectItem>
                              <SelectItem value="cashapp">Cash App</SelectItem>
                              <SelectItem value="paypal">PayPal</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder={getPaymentPlaceholder(method.type)}
                            value={method.handle}
                            onChange={(e) => updateContributionMethod(index, "handle", e.target.value)}
                            className={validationError ? "border-destructive" : ""}
                            aria-label={`Payment handle for ${method.type || 'payment method'}`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeContributionMethod(index)}
                            aria-label="Remove payment method"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        {formatHint && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            💡 {formatHint}
                          </p>
                        )}
                        {validationError && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {validationError}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contribution-message">Public Message (optional)</Label>
                  <Textarea
                    id="contribution-message"
                    placeholder="e.g., Help us cover the cost of food and drinks!"
                    value={formData.contributionMessage}
                    onChange={(e) => setFormData({ ...formData, contributionMessage: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Enhancements */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* ✅ Event Type moved to Step 3 */}
              <div className="space-y-2">
                <Label htmlFor="event-type">Event Type (Optional)</Label>
                <Select
                  value={formData.eventType}
                  onValueChange={(value) => setFormData({ ...formData, eventType: value })}
                >
                  <SelectTrigger id="event-type">
                    <SelectValue placeholder="Select event type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="birthday">Birthday Party</SelectItem>
                    <SelectItem value="wedding">Wedding</SelectItem>
                    <SelectItem value="bridal-shower">Bridal Shower</SelectItem>
                    <SelectItem value="office-party">Corporate Event</SelectItem>
                    <SelectItem value="friendsgiving">Social Gathering</SelectItem>
                    <SelectItem value="holiday-mixer">Holiday Party</SelectItem>
                    <SelectItem value="fundraiser">Fundraiser</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select a type to unlock Quick Setup features below
                </p>
              </div>

              {/* ✅ Inline alert when Event Type is missing */}
              {!formData.eventType && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 shrink-0" />
                    💡 Want auto-generated items and tasks? Select an Event Type above to unlock Quick Setup!
                  </p>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold">Quick Setup</h3>
                
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-generate-items" className="text-base font-medium">
                      Auto-generate suggested items
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      We'll create a starter item list based on your event type
                    </p>
                  </div>
                  <Switch
                    id="auto-generate-items"
                    checked={formData.autoGenerateItems}
                    onCheckedChange={(checked) => setFormData({ ...formData, autoGenerateItems: checked })}
                    disabled={!formData.eventType}
                    aria-label="Auto-generate suggested items"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label htmlFor="enable-task-checklist" className="text-base font-medium">
                      Enable Task Checklist
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Add a planning checklist with common tasks and timelines
                    </p>
                  </div>
                  <Switch
                    id="enable-task-checklist"
                    checked={formData.enableTaskChecklist}
                    onCheckedChange={(checked) => setFormData({ ...formData, enableTaskChecklist: checked })}
                    disabled={!formData.eventType}
                    aria-label="Enable task checklist"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold">Guest Communication</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="welcome-announcement">
                    Welcome Announcement (Optional)
                  </Label>
                  <Textarea
                    id="welcome-announcement"
                    placeholder="Greet your guests with a custom message..."
                    value={formData.welcomeAnnouncement}
                    onChange={(e) => setFormData({ ...formData, welcomeAnnouncement: e.target.value })}
                    maxLength={500}
                    rows={4}
                    className="resize-none"
                    aria-describedby="welcome-announcement-hint"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <span id="welcome-announcement-hint" className="text-muted-foreground">
                      This message will appear at the top of your event page
                    </span>
                    <span className={cn(
                      "transition-colors",
                      formData.welcomeAnnouncement.length > 450 ? "text-amber-600 font-medium" : "text-muted-foreground"
                    )}>
                      {formData.welcomeAnnouncement.length}/500
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-medium">Additional Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="parking">Parking Instructions</Label>
                  <Textarea
                    id="parking"
                    placeholder="Street parking available on Main St..."
                    value={formData.parkingInstructions}
                    onChange={(e) => setFormData({ ...formData, parkingInstructions: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dress-code">Dress Code</Label>
                  <Input
                    id="dress-code"
                    placeholder="e.g., Casual, Business Casual, Formal"
                    value={formData.dressCode}
                    onChange={(e) => setFormData({ ...formData, dressCode: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="special-requests">Special Requests</Label>
                  <Textarea
                    id="special-requests"
                    placeholder="Please bring a dish to share, no gifts please..."
                    value={formData.specialRequests}
                    onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>

              {/* ✅ Event Summary/Review Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-lg font-semibold">Review Your Event</h3>
                <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Event Name:</span>
                      <p className="font-medium">{formData.name || "Not set"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date:</span>
                      <p className="font-medium">{formData.eventDate ? format(formData.eventDate, "PPP") : "Not set"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Location:</span>
                      <p className="font-medium">{formData.location || "Not set"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Host:</span>
                      <p className="font-medium">{formData.hostName || "Not set"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Privacy:</span>
                      <p className="font-medium">{formData.privacySetting === "public" ? "Public" : "Invite Only"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Event Type:</span>
                      <p className="font-medium">{formData.eventType || "Not specified"}</p>
                    </div>
                  </div>
                  
                  {/* Preview button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      // Auto-save first to get event ID
                      await autosave();
                      if (eventId) {
                        window.open(`/event/${eventId}`, '_blank');
                      } else {
                        toast({
                          title: "Please wait",
                          description: "Saving your event first...",
                        });
                      }
                    }}
                    disabled={!formData.name || !canViewPublicPage}
                    className="w-full"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Preview Event Page
                  </Button>
                </div>
              </div>
            </div>
          )}

          </form>
        </div>

        {/* Bottom CTA bar */}
        <div className="bg-background border-t px-4 sm:px-6 py-4 shrink-0">
          {/* Duplicate warning banner */}
          {hasDuplicate && (
            <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900 dark:text-amber-100">
                <strong>Heads up:</strong> you already have an event with this name on that date.
              </p>
            </div>
          )}

          {/* Autosave status */}
          <div className="flex items-center justify-end mb-3 min-h-[16px]">
            {saving && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving draft...
              </span>
            )}
            {!saving && lastSaved && (
              <span className="text-xs text-muted-foreground">
                Saved {Math.round((new Date().getTime() - lastSaved.getTime()) / 1000)}s ago
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            {currentStep > 1 && (
              <Button 
                type="button"
                variant="outline" 
                onClick={handleBack} 
                disabled={loading}
                className="w-full sm:w-auto order-3 sm:order-1"
                aria-label="Go back to previous step"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}

            {currentStep === 1 && (
              <Button 
                type="button"
                variant="outline" 
                onClick={handleSaveAndShare}
                disabled={loading || !canProceedToStep2()}
                className="w-full sm:flex-1 order-2"
                title="Publish this event with essential details. You can add more later."
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save & Continue (Quick Create)
              </Button>
            )}

            {currentStep < 3 ? (
              <Button 
                type="button"
                onClick={handleNext} 
                disabled={loading || (currentStep === 1 && !canProceedToStep2())} 
                className="w-full sm:flex-1 order-1 sm:order-3"
                aria-label="Go to next step"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                type="button"
                onClick={handlePublish} 
                disabled={loading || !canProceedToStep2()} 
                className="w-full sm:flex-1 order-1"
                aria-label="Publish event"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditingPublished ? 'Updating...' : 'Publishing...'}
                  </>
                ) : (
                  <>
                    {isEditingPublished ? 'Update Event' : 'Publish & Share 🎉'}
                    <Share2 className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
