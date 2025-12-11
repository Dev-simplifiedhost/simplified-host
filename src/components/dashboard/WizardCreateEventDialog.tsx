import { useState, useEffect, useCallback } from "react";
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
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CalendarIcon, Loader2, ArrowLeft, ArrowRight, Save, CheckCircle, HelpCircle, Smartphone } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { InstallInstructionsModal } from "@/components/install";

interface WizardCreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventCreated?: (eventId: string) => void;
  draftEventId?: string | null;
}

type Step = 1 | 2 | 3;

interface FormData {
  name: string;
  eventDate: Date | undefined;
  location: string;
  description: string;
  allowGuestItems: boolean;
  contributionGoal: string;
  showContributionGoal: boolean;
}

export function WizardCreateEventDialog({ 
  open, 
  onOpenChange, 
  onEventCreated,
  draftEventId 
}: WizardCreateEventDialogProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eventId, setEventId] = useState<string | null>(draftEventId || null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    eventDate: undefined,
    location: "",
    description: "",
    allowGuestItems: true,
    contributionGoal: "",
    showContributionGoal: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { isMobile, isInstalled, hasPromptBeenShown, markPromptShown } = useInstallPrompt();

  // Load draft if provided
  useEffect(() => {
    if (open && draftEventId) {
      loadDraft(draftEventId);
    }
  }, [open, draftEventId]);

  const loadDraft = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setEventId(data.id);
        setFormData({
          name: data.name || "",
          eventDate: data.event_date ? new Date(data.event_date) : undefined,
          location: data.location || "",
          description: data.description || "",
          allowGuestItems: data.allow_guest_items ?? true,
          contributionGoal: data.contribution_goal ? String(data.contribution_goal) : "",
          showContributionGoal: data.show_contribution_goal ?? true,
        });
        setLastSaved(data.auto_saved_at ? new Date(data.auto_saved_at) : null);
      }
    } catch (error: any) {
      console.error("Error loading draft:", error);
    }
  };

  // Autosave functionality
  const autosave = useCallback(async () => {
    if (!formData.name) return; // Don't save empty drafts
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const eventData = {
        user_id: user.id,
        name: formData.name.trim(),
        event_date: formData.eventDate?.toISOString() || null,
        location: formData.location.trim() || null,
        description: formData.description.trim() || null,
        allow_guest_items: formData.allowGuestItems,
        contribution_goal: formData.contributionGoal ? parseFloat(formData.contributionGoal) : 0,
        show_contribution_goal: formData.showContributionGoal,
        is_draft: true,
        auto_saved_at: new Date().toISOString(),
      };

      if (eventId) {
        // Update existing draft
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", eventId);

        if (error) throw error;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from("events")
          .insert(eventData)
          .select()
          .single();

        if (error) throw error;
        if (data) setEventId(data.id);
      }

      setLastSaved(new Date());
    } catch (error: any) {
      console.error("Autosave error:", error);
    } finally {
      setSaving(false);
    }
  }, [formData, eventId]);

  // Autosave on pause (2 seconds after typing stops)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.name) {
        autosave();
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [formData, autosave]);

  const validateField = (field: string, value: any) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case "name":
        if (!value || value.trim().length === 0) {
          newErrors.name = "Event name is required";
        } else if (value.trim().length > 100) {
          newErrors.name = "Event name must be less than 100 characters";
        } else {
          delete newErrors.name;
        }
        break;
      case "eventDate":
        if (!value) {
          newErrors.eventDate = "Event date is required";
        } else if (value < new Date()) {
          newErrors.eventDate = "Event date must be in the future";
        } else {
          delete newErrors.eventDate;
        }
        break;
      case "location":
        if (!value || value.trim().length === 0) {
          newErrors.location = "Location is required";
        } else if (value.trim().length > 200) {
          newErrors.location = "Location must be less than 200 characters";
        } else {
          delete newErrors.location;
        }
        break;
      case "contributionGoal":
        if (value && isNaN(parseFloat(value))) {
          newErrors.contributionGoal = "Must be a valid number";
        } else if (value && parseFloat(value) <= 0) {
          newErrors.contributionGoal = "You have contribution goal toggled on. Please enter a goal amount greater than $0";
        } else {
          delete newErrors.contributionGoal;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  const canProceedToStep2 = () => {
    return formData.name && formData.eventDate && formData.location && !errors.name && !errors.eventDate && !errors.location;
  };

  const canProceedToStep3 = () => {
    return canProceedToStep2();
  };

  const handleNext = () => {
    if (currentStep === 1 && canProceedToStep2()) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate contribution goal if toggle is ON
      if (formData.showContributionGoal && (!formData.contributionGoal || parseFloat(formData.contributionGoal) <= 0)) {
        toast({
          title: "Invalid Contribution Goal",
          description: "You have contribution goal toggled on. Please enter a goal amount greater than $0",
          variant: "destructive",
        });
        return;
      }
      if (canProceedToStep3()) {
        setCurrentStep(3);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleSaveAndExit = async () => {
    await autosave();
    toast({
      title: "Draft saved",
      description: "Your progress has been saved. You can continue later.",
    });
    onOpenChange(false);
  };

  const handlePublish = async () => {
    // Validate all required fields
    validateField("name", formData.name);
    validateField("eventDate", formData.eventDate);
    validateField("location", formData.location);
    
    if (!canProceedToStep2()) {
      toast({
        title: "Missing required fields",
        description: "Please complete all required fields in step 1",
        variant: "destructive",
      });
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to create an event",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const eventData = {
        user_id: user.id,
        name: formData.name.trim(),
        event_date: formData.eventDate!.toISOString(),
        location: formData.location.trim(),
        description: formData.description.trim() || null,
        allow_guest_items: formData.allowGuestItems,
        contribution_goal: formData.contributionGoal ? parseFloat(formData.contributionGoal) : 0,
        show_contribution_goal: formData.showContributionGoal,
        is_draft: false,
        published_at: new Date().toISOString(),
      };

      if (eventId) {
        // Update existing draft to published
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", eventId);

        if (error) throw error;

        toast({
          title: "Event published!",
          description: "Your event is now live and ready to share",
        });

        if (onEventCreated) {
          onEventCreated(eventId);
        }
      } else {
        // Create new published event
        const { data: event, error } = await supabase
          .from("events")
          .insert(eventData)
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Event published!",
          description: "Your event is now live and ready to share",
        });

        if (onEventCreated && event) {
          onEventCreated(event.id);
        }
      }

      onOpenChange(false);
      
      // Show install prompt for mobile users
      if (isMobile && !isInstalled && !hasPromptBeenShown('event_created')) {
        setTimeout(() => {
          toast({
            title: "Tip",
            description: "Add SimplifiedHost to your home screen for quick access while planning.",
            action: (
              <Button 
                size="sm" 
                onClick={() => setInstallModalOpen(true)}
                className="gap-1"
              >
                <Smartphone className="h-3 w-3" />
                Add Now
              </Button>
            ),
          });
          markPromptShown('event_created');
        }, 1500);
      }
      
      // Reset form
      setFormData({
        name: "",
        eventDate: undefined,
        location: "",
        description: "",
        allowGuestItems: true,
        contributionGoal: "",
        showContributionGoal: false,
      });
      setErrors({});
      setCurrentStep(1);
      setEventId(null);
      setLastSaved(null);
    } catch (error: any) {
      console.error("Error publishing event:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to publish event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const progressPercentage = (currentStep / 3) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Event - Step {currentStep} of 3</DialogTitle>
          <DialogDescription>
            {currentStep === 1 && "Start with the essentials"}
            {currentStep === 2 && "Configure sharing and limits"}
            {currentStep === 3 && "Add enhancements (optional)"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        <div className="space-y-2">
          <Progress value={progressPercentage} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className={currentStep === 1 ? "font-medium text-foreground" : ""}>Essentials</span>
            <span className={currentStep === 2 ? "font-medium text-foreground" : ""}>Sharing & Limits</span>
            <span className={currentStep === 3 ? "font-medium text-foreground" : ""}>Enhancements</span>
          </div>
        </div>

        {/* Autosave indicator */}
        {lastSaved && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Saved {format(lastSaved, "h:mm a")}</span>
              </>
            )}
          </div>
        )}
        
        <form className="space-y-6">
          {/* Step 1: Essentials */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wizard-event-name">
                  Event Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="wizard-event-name"
                  placeholder="e.g., Summer BBQ Party"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                  }}
                  onBlur={() => validateField("name", formData.name)}
                  className={errors.name ? "border-destructive" : ""}
                  aria-invalid={!!errors.name}
                  aria-describedby={errors.name ? "name-error" : undefined}
                />
                {errors.name && (
                  <p id="name-error" className="text-sm text-destructive" role="alert">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="wizard-event-date">
                  Event Date & Time <span className="text-destructive">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="wizard-event-date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.eventDate && "text-muted-foreground",
                        errors.eventDate && "border-destructive"
                      )}
                      aria-invalid={!!errors.eventDate}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.eventDate ? (
                        format(formData.eventDate, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
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
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {errors.eventDate && (
                  <p className="text-sm text-destructive" role="alert">{errors.eventDate}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="wizard-event-location">
                  Location <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="wizard-event-location"
                  placeholder="e.g., Central Park or Virtual (Zoom)"
                  value={formData.location}
                  onChange={(e) => {
                    setFormData({ ...formData, location: e.target.value });
                  }}
                  onBlur={() => validateField("location", formData.location)}
                  className={errors.location ? "border-destructive" : ""}
                  aria-invalid={!!errors.location}
                />
                {errors.location && (
                  <p className="text-sm text-destructive" role="alert">{errors.location}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="wizard-event-description">Description</Label>
                <Textarea
                  id="wizard-event-description"
                  placeholder="Tell guests what to expect..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Sharing & Limits */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allow-guest-items">Allow Guest Items</Label>
                  <p className="text-sm text-muted-foreground">
                    Let guests add items to the event list
                  </p>
                </div>
                <Switch
                  id="allow-guest-items"
                  checked={formData.allowGuestItems}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, allowGuestItems: checked })
                  }
                />
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-3">Contribution Settings</p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contribution-goal">Contribution Goal (optional)</Label>
                    <Input
                      id="contribution-goal"
                      type="number"
                      placeholder="0.00"
                      value={formData.contributionGoal}
                      onChange={(e) => {
                        setFormData({ ...formData, contributionGoal: e.target.value });
                      }}
                      onBlur={() => validateField("contributionGoal", formData.contributionGoal)}
                      className={errors.contributionGoal ? "border-destructive" : ""}
                      min="0"
                      step="0.01"
                    />
                    {errors.contributionGoal && (
                      <p className="text-sm text-destructive" role="alert">{errors.contributionGoal}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="show-contribution-goal">Show Contribution Goal</Label>
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
                      <p className="text-sm text-muted-foreground">
                        Display the goal publicly to guests
                      </p>
                    </div>
                    <Switch
                      id="show-contribution-goal"
                      checked={formData.showContributionGoal}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, showContributionGoal: checked })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Enhancements */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Review Your Event</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    <span className="font-medium">{formData.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>{" "}
                    <span className="font-medium">
                      {formData.eventDate ? format(formData.eventDate, "PPP") : "Not set"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location:</span>{" "}
                    <span className="font-medium">{formData.location}</span>
                  </div>
                  {formData.description && (
                    <div>
                      <span className="text-muted-foreground">Description:</span>{" "}
                      <span className="font-medium">{formData.description}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Settings</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Guest Items:</span>{" "}
                    <span className="font-medium">{formData.allowGuestItems ? "Allowed" : "Not allowed"}</span>
                  </div>
                  {formData.contributionGoal && (
                    <div>
                      <span className="text-muted-foreground">Contribution Goal:</span>{" "}
                      <span className="font-medium">${formData.contributionGoal}</span>
                      {formData.showContributionGoal && " (visible to guests)"}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 border-2 border-primary rounded-lg bg-primary/5">
                <p className="text-sm font-medium text-foreground">
                  Ready to publish? Your event will be visible to guests once you click "Publish Event".
                </p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveAndExit}
              disabled={loading || saving}
            >
              <Save className="mr-2 h-4 w-4" />
              Save & Exit
            </Button>
            
            <div className="flex-1" />

            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={loading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}

            {currentStep < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                disabled={
                  loading ||
                  (currentStep === 1 && !canProceedToStep2()) ||
                  (currentStep === 2 && !canProceedToStep3())
                }
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handlePublish}
                disabled={loading || !canProceedToStep2()}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Publish Event
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
      
      <InstallInstructionsModal 
        open={installModalOpen} 
        onOpenChange={setInstallModalOpen} 
      />
    </Dialog>
  );
}
