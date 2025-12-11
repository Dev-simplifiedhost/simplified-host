import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, CheckCircle, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { EditModeBanner } from "./EditModeBanner";
import { UnsavedChangesDialog } from "./UnsavedChangesDialog";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

interface MobileCreateEventFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated?: (eventId: string) => void;
  draftEventId?: string | null;
}

type Step = 1 | 2 | 3;

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
  allowGuestItems: boolean;
  showGuestList: boolean;
  autoGenerateItems: boolean;
  enableTaskChecklist: boolean;
}

const stepLabels: Record<Step, string> = {
  1: "Essentials",
  2: "Settings",
  3: "Extras"
};

const getInitialFormData = (): FormData => ({
  name: "",
  eventDate: undefined,
  startTime: "18:00",
  endTime: "21:00",
  isAllDay: false,
  location: "",
  hostName: "",
  description: "",
  eventType: "",
  allowGuestItems: true,
  showGuestList: false,
  autoGenerateItems: false,
  enableTaskChecklist: false,
});

export function MobileCreateEventFlow({ 
  open, 
  onOpenChange, 
  onEventCreated,
  draftEventId 
}: MobileCreateEventFlowProps) {
  const navigate = useNavigate();
  const { isOnline } = useNetworkStatus();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eventId, setEventId] = useState<string | null>(draftEventId || null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formData, setFormData] = useState<FormData>(getInitialFormData());
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Edit mode state - preserves published status
  const [isEditingPublished, setIsEditingPublished] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [originalData, setOriginalData] = useState<FormData | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const pendingCloseRef = useRef(false);

  // Compute if there are unsaved changes
  const hasUnsavedChanges = originalData !== null && JSON.stringify(formData) !== JSON.stringify(originalData);

  // Load draft if provided
  useEffect(() => {
    if (open && draftEventId) {
      loadDraft(draftEventId);
    } else if (open) {
      loadUserProfile();
    }
  }, [open, draftEventId]);

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

  const loadDraft = async (id: string) => {
    try {
      const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
      if (error) throw error;

      if (data) {
        setEventId(data.id);
        // CRITICAL: Track if we're editing a published event
        setIsEditingPublished(!data.is_draft);
        setIsArchived(data.is_archived ?? false);
        
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
          allowGuestItems: data.allow_guest_items ?? true,
          showGuestList: data.show_guest_list ?? false,
          autoGenerateItems: false,
          enableTaskChecklist: false,
        };
        
        setFormData(loadedData);
        // Store original data for unsaved changes detection
        setOriginalData(loadedData);
        setLastSaved(data.auto_saved_at ? new Date(data.auto_saved_at) : null);
      }
    } catch (error: any) {
      console.error("Error loading draft:", error);
    }
  };

  // Autosave functionality - FIXED: preserves published status
  const autosave = useCallback(async () => {
    if (!formData.name) return;
    // Don't autosave for published events - use explicit save
    if (isEditingPublished) return;
    
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
        allow_guest_items: formData.allowGuestItems,
        show_guest_list: formData.showGuestList,
        // CRITICAL FIX: Only set is_draft: true for new drafts, not published events
        is_draft: true,
        auto_saved_at: new Date().toISOString(),
      };

      if (eventId) {
        const { error } = await supabase.from("events").update(eventData).eq("id", eventId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("events").insert(eventData).select().single();
        if (error) throw error;
        if (data) setEventId(data.id);
      }

      setLastSaved(new Date());
    } catch (error: any) {
      console.error("Autosave error:", error);
    } finally {
      setSaving(false);
    }
  }, [formData, eventId, isEditingPublished]);

  // Autosave on pause - only for new drafts
  useEffect(() => {
    if (isEditingPublished) return; // Skip autosave for published events
    const timer = setTimeout(() => {
      if (formData.name) autosave();
    }, 2000);
    return () => clearTimeout(timer);
  }, [formData, autosave, isEditingPublished]);

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Required";
    if (!formData.eventDate) newErrors.eventDate = "Required";
    if (!formData.location.trim()) newErrors.location = "Required";
    if (!formData.hostName.trim()) newErrors.hostName = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) {
        toast({ title: "Please complete required fields", variant: "destructive" });
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    } else {
      handleClose();
    }
  };

  // Handle close with unsaved changes protection
  const handleClose = () => {
    if (isEditingPublished && hasUnsavedChanges) {
      setShowUnsavedDialog(true);
      pendingCloseRef.current = true;
      return;
    }
    onOpenChange(false);
  };

  // Handle cancel edit - revert to original data
  const handleCancelEdit = () => {
    if (originalData) {
      setFormData(originalData);
    }
    toast({ title: "Changes discarded." });
    setShowUnsavedDialog(false);
    onOpenChange(false);
  };

  // Handle save for published events (explicit save)
  const handleSaveEdit = async () => {
    if (!validateStep1()) {
      toast({ title: "Please complete required fields", variant: "destructive" });
      setShowUnsavedDialog(false);
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please sign in", variant: "destructive" });
        navigate("/auth");
        return;
      }

      const eventData = {
        name: formData.name.trim().substring(0, 80),
        event_date: formData.eventDate!.toISOString(),
        start_time: formData.isAllDay ? null : formData.startTime,
        end_time: formData.isAllDay ? null : formData.endTime,
        is_all_day: formData.isAllDay,
        location: formData.location.trim().substring(0, 200),
        host_name: formData.hostName.trim(),
        description: formData.description.trim().substring(0, 500) || null,
        event_type: formData.eventType || null,
        allow_guest_items: formData.allowGuestItems,
        show_guest_list: formData.showGuestList,
        // CRITICAL: Preserve publish status - don't change is_draft or is_archived
        auto_saved_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("events").update(eventData).eq("id", eventId);
      if (error) throw error;

      // Contextual toasts based on what changed
      if (originalData) {
        if (originalData.eventDate?.toISOString() !== formData.eventDate?.toISOString()) {
          toast({ title: "Event schedule updated." });
        }
        if (originalData.location !== formData.location) {
          toast({ title: "Address updated for guests." });
        }
      }
      
      toast({ title: "Event updated successfully." });
      setOriginalData(formData); // Update original to new saved state
      setShowUnsavedDialog(false);
      
      if (pendingCloseRef.current) {
        pendingCloseRef.current = false;
        onOpenChange(false);
      }
    } catch (error: any) {
      console.error("Error saving event:", error);
      toast({ 
        title: "Unable to save changes", 
        description: "Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleQuickCreate = async () => {
    if (!validateStep1()) {
      toast({ title: "Please complete required fields", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please sign in", variant: "destructive" });
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
        is_draft: false,
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

      toast({ title: "Event created!", description: "Your event is now live" });
      if (finalEventId && onEventCreated) onEventCreated(finalEventId);
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error creating event:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!validateStep1()) {
      toast({ title: "Missing required fields", variant: "destructive" });
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please sign in", variant: "destructive" });
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
        allow_guest_items: formData.allowGuestItems,
        show_guest_list: formData.showGuestList,
        is_draft: false,
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

      // Auto-generate items if enabled
      if (formData.autoGenerateItems && formData.eventType && finalEventId) {
        await generateItems(finalEventId, formData.eventType, user.id);
      }

      // Generate tasks if enabled
      if (formData.enableTaskChecklist && formData.eventType && finalEventId) {
        await generateTasks(finalEventId, user.id);
      }

      toast({ title: "Event published!", description: "Your event is ready to share" });
      if (finalEventId && onEventCreated) onEventCreated(finalEventId);
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error("Error publishing event:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const generateItems = async (eventId: string, eventType: string, userId: string) => {
    const itemsByType: Record<string, Array<{name: string, category: string, quantity: number}>> = {
      'birthday': [
        { name: "Birthday Cake", category: "Dessert", quantity: 1 },
        { name: "Decorations", category: "Supplies", quantity: 1 },
        { name: "Drinks", category: "Beverages", quantity: 1 },
      ],
      'wedding': [
        { name: "Flowers", category: "Decor", quantity: 1 },
        { name: "Guest Book", category: "Supplies", quantity: 1 },
      ],
      'friendsgiving': [
        { name: "Main Dish", category: "Food", quantity: 1 },
        { name: "Side Dishes", category: "Food", quantity: 3 },
        { name: "Desserts", category: "Dessert", quantity: 2 },
      ],
      'other': [
        { name: "Food", category: "Food", quantity: 1 },
        { name: "Drinks", category: "Beverages", quantity: 1 },
      ]
    };

    const items = itemsByType[eventType] || itemsByType['other'];
    const itemsToInsert = items.map(item => ({
      event_id: eventId,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      is_host_provided: false,
      is_guest_added: false
    }));

    await supabase.from('event_items').insert(itemsToInsert);
  };

  const generateTasks = async (eventId: string, userId: string) => {
    const tasks = [
      { title: "Send invitations", priority: "high" as const, due_relative_days: -28 },
      { title: "Finalize guest count", priority: "high" as const, due_relative_days: -14 },
      { title: "Confirm RSVPs", priority: "high" as const, due_relative_days: -7 },
      { title: "Final setup", priority: "high" as const, due_relative_days: 0 },
    ];

    const tasksToInsert = tasks.map(task => ({
      event_id: eventId,
      title: task.title,
      status: 'todo' as const,
      priority: task.priority,
      due_relative_days: task.due_relative_days,
      created_by: userId,
      is_template: false
    }));

    await supabase.from('tasks').insert(tasksToInsert);
  };

  const resetForm = () => {
    setFormData(getInitialFormData());
    setErrors({});
    setCurrentStep(1);
    setEventId(null);
    setLastSaved(null);
    setIsEditingPublished(false);
    setIsArchived(false);
    setOriginalData(null);
    pendingCloseRef.current = false;
  };

  const progressPercentage = (currentStep / 3) * 100;

  // Handle drawer open change with unsaved changes protection
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && isEditingPublished && hasUnsavedChanges) {
      setShowUnsavedDialog(true);
      pendingCloseRef.current = true;
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <>
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onDiscard={handleCancelEdit}
        onSave={handleSaveEdit}
        onCancel={() => {
          setShowUnsavedDialog(false);
          pendingCloseRef.current = false;
        }}
        isSaving={saving}
      />
      
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="h-[100dvh] max-h-[100dvh] flex flex-col p-0 rounded-none">
        {/* Header with safe area */}
        <div className="shrink-0 bg-background border-b pt-safe">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-muted-foreground h-12 px-2 -ml-2"
              aria-label={currentStep === 1 ? "Close" : "Go back"}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="text-sm">{currentStep === 1 ? "Close" : "Back"}</span>
            </button>
            
            <span className="text-sm font-medium">
              Step {currentStep} of 3: {stepLabels[currentStep]}
            </span>
            
            {/* Draft saved indicator */}
            <div className="w-20 text-right">
              {saving ? (
                <span className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                </span>
              ) : lastSaved ? (
                <span className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  Saved
                </span>
              ) : null}
            </div>
          </div>
          
          {/* Progress bar */}
          <Progress value={progressPercentage} className="h-1 rounded-none" />
        </div>

        {/* Edit Mode Banner for published events */}
        {isEditingPublished && (
          <div className="px-4 pt-4">
            <EditModeBanner
              isEditing={isEditingPublished}
              hasUnsavedChanges={hasUnsavedChanges}
              isSaving={saving}
              onSave={handleSaveEdit}
              onCancel={handleCancelEdit}
              isArchived={isArchived}
              isOnline={isOnline}
            />
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 space-y-6">
            {/* Step 1: Essentials */}
            {currentStep === 1 && (
              <>
                {/* Event Basics Section */}
                <section className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Event Basics
                  </h3>
                  <div className="bg-muted/30 rounded-xl p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="mobile-event-name" className="text-sm">
                        Event Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="mobile-event-name"
                        placeholder="e.g., Summer BBQ Party"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={cn("h-12", errors.name && "border-destructive")}
                        maxLength={80}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm">
                        Event Date <span className="text-destructive">*</span>
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className={cn(
                          "w-full h-12 justify-start text-left font-normal",
                          !formData.eventDate && "text-muted-foreground",
                          errors.eventDate && "border-destructive"
                        )}
                      >
                        {formData.eventDate ? format(formData.eventDate, "PPP") : "Pick a date"}
                      </Button>
                      {showDatePicker && (
                        <div className="border rounded-lg p-2 bg-background">
                          <Calendar
                            mode="single"
                            selected={formData.eventDate}
                            onSelect={(date) => {
                              setFormData({ ...formData, eventDate: date });
                              setShowDatePicker(false);
                              setErrors(prev => ({ ...prev, eventDate: "" }));
                            }}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            className="pointer-events-auto"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="mobile-start-time" className="text-sm">Start Time</Label>
                        <Input
                          id="mobile-start-time"
                          type="time"
                          value={formData.startTime}
                          onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                          disabled={formData.isAllDay}
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mobile-end-time" className="text-sm">End Time</Label>
                        <Input
                          id="mobile-end-time"
                          type="time"
                          value={formData.endTime}
                          onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                          disabled={formData.isAllDay}
                          className="h-12"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <Label htmlFor="mobile-all-day" className="text-sm cursor-pointer">
                        All-day event
                      </Label>
                      <Switch
                        id="mobile-all-day"
                        checked={formData.isAllDay}
                        onCheckedChange={(checked) => setFormData({ ...formData, isAllDay: checked })}
                      />
                    </div>
                  </div>
                </section>

                {/* Location & Host Section */}
                <section className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Location & Host
                  </h3>
                  <div className="bg-muted/30 rounded-xl p-4 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="mobile-location" className="text-sm">
                        Location <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="mobile-location"
                        placeholder="e.g., 123 Main St or Zoom link"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        className={cn("h-12", errors.location && "border-destructive")}
                        maxLength={200}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobile-host-name" className="text-sm">
                        Host Name <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="mobile-host-name"
                        placeholder="Your name"
                        value={formData.hostName}
                        onChange={(e) => setFormData({ ...formData, hostName: e.target.value })}
                        className={cn("h-12", errors.hostName && "border-destructive")}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobile-description" className="text-sm">
                        Description
                      </Label>
                      <Textarea
                        id="mobile-description"
                        placeholder="Optional: Add context—menu, dress code, parking, etc."
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        maxLength={500}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {formData.description.length}/500
                      </p>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* Step 2: Settings */}
            {currentStep === 2 && (
              <section className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Guest Settings
                </h3>
                <div className="bg-muted/30 rounded-xl p-4 space-y-1">
                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <div>
                      <p className="text-sm font-medium">Allow Guest Items</p>
                      <p className="text-xs text-muted-foreground">Let guests suggest items to bring</p>
                    </div>
                    <Switch
                      checked={formData.allowGuestItems}
                      onCheckedChange={(checked) => setFormData({ ...formData, allowGuestItems: checked })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">Show Guest List</p>
                      <p className="text-xs text-muted-foreground">Display RSVPs on event page</p>
                    </div>
                    <Switch
                      checked={formData.showGuestList}
                      onCheckedChange={(checked) => setFormData({ ...formData, showGuestList: checked })}
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Step 3: Extras */}
            {currentStep === 3 && (
              <>
                <section className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Event Type
                  </h3>
                  <div className="bg-muted/30 rounded-xl p-4">
                    <Select
                      value={formData.eventType}
                      onValueChange={(value) => setFormData({ ...formData, eventType: value })}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select event type (optional)" />
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
                  </div>
                </section>

                {formData.eventType && (
                  <section className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Quick Setup
                    </h3>
                    <div className="bg-muted/30 rounded-xl p-4 space-y-1">
                      <div className="flex items-center justify-between py-3 border-b border-border/50">
                        <div>
                          <p className="text-sm font-medium">Auto-generate items</p>
                          <p className="text-xs text-muted-foreground">Create starter item list</p>
                        </div>
                        <Switch
                          checked={formData.autoGenerateItems}
                          onCheckedChange={(checked) => setFormData({ ...formData, autoGenerateItems: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium">Enable task checklist</p>
                          <p className="text-xs text-muted-foreground">Add planning tasks</p>
                        </div>
                        <Switch
                          checked={formData.enableTaskChecklist}
                          onCheckedChange={(checked) => setFormData({ ...formData, enableTaskChecklist: checked })}
                        />
                      </div>
                    </div>
                  </section>
                )}

                {/* Review Summary */}
                <section className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Review
                  </h3>
                  <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Event</span>
                      <span className="text-sm font-medium">{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Date</span>
                      <span className="text-sm font-medium">
                        {formData.eventDate ? format(formData.eventDate, "MMM d, yyyy") : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Location</span>
                      <span className="text-sm font-medium truncate ml-4 max-w-[180px]">
                        {formData.location || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Host</span>
                      <span className="text-sm font-medium">{formData.hostName || "—"}</span>
                    </div>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>

        {/* Sticky bottom CTA with safe area */}
        <div className="shrink-0 border-t bg-background px-4 py-4 pb-safe">
          {/* Sticky Save/Cancel for published events */}
          {isEditingPublished ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={saving}
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={saving || !isOnline}
                className="flex-1 h-12"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          ) : (
            <>
              {currentStep === 1 && (
                <div className="space-y-3">
                  <Button
                    onClick={handleNext}
                    disabled={loading}
                    className="w-full h-12 text-base"
                  >
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                  <button
                    onClick={handleQuickCreate}
                    disabled={loading}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    {loading ? "Creating..." : "Quick Create (Skip details)"}
                  </button>
                </div>
              )}

              {currentStep === 2 && (
                <Button
                  onClick={handleNext}
                  disabled={loading}
                  className="w-full h-12 text-base"
                >
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}

              {currentStep === 3 && (
                <Button
                  onClick={handlePublish}
                  disabled={loading}
                  className="w-full h-12 text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    "Publish & Share"
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
    </>
  );
}
