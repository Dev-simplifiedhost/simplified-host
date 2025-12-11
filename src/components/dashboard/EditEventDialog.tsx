import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CalendarIcon, Loader2, Smartphone } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { InstallInstructionsModal } from "@/components/install";

interface EditEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  onEventUpdated?: () => void;
}

export function EditEventDialog({ open, onOpenChange, eventId, onEventUpdated }: EditEventDialogProps) {
  const [loading, setLoading] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    eventDate: undefined as Date | undefined,
    location: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { isMobile, isInstalled, hasPromptBeenShown, markPromptShown } = useInstallPrompt();

  useEffect(() => {
    if (open && eventId) {
      loadEvent();
    }
  }, [open, eventId]);

  const loadEvent = async () => {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name || "",
          eventDate: data.event_date ? new Date(data.event_date) : undefined,
          location: data.location || "",
          description: data.description || "",
        });
      }
    } catch (error: any) {
      console.error("Error loading event:", error);
      toast({
        title: "Error",
        description: "Failed to load event details",
        variant: "destructive",
      });
    }
  };

  const validateField = (field: string, value: any) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case "name":
        if (!value || value.trim().length === 0) {
          newErrors.name = "Event name is required";
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
        } else {
          delete newErrors.location;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required fields
    validateField("name", formData.name);
    validateField("eventDate", formData.eventDate);
    validateField("location", formData.location);
    
    if (!formData.name || !formData.eventDate || !formData.location) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.eventDate < new Date()) {
      toast({
        title: "Invalid date",
        description: "Event date must be in the future",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from("events")
        .update({
          name: formData.name.trim(),
          event_date: formData.eventDate.toISOString(),
          location: formData.location.trim(),
          description: formData.description.trim() || null,
        })
        .eq("id", eventId);

      if (error) throw error;

      toast({
        title: "Event updated!",
        description: "Your changes have been saved",
      });

      onOpenChange(false);
      
      // Show install prompt for mobile users (once per device)
      if (isMobile && !isInstalled && !hasPromptBeenShown('event_edited')) {
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
          markPromptShown('event_edited');
        }, 1500);
      }
      
      if (onEventUpdated) {
        onEventUpdated();
      }
    } catch (error: any) {
      console.error("Error updating event:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>
            Update your event details. Changes will be visible to all guests.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-event-name">
              Event Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-event-name"
              placeholder="e.g., Summer BBQ Party"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                validateField("name", e.target.value);
              }}
              onBlur={() => validateField("name", formData.name)}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-event-date">
              Event Date <span className="text-destructive">*</span>
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="edit-event-date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.eventDate && "text-muted-foreground",
                    errors.eventDate && "border-destructive"
                  )}
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
              <p className="text-sm text-destructive">{errors.eventDate}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-event-location">
              Location <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-event-location"
              placeholder="e.g., Central Park or Virtual (Zoom)"
              value={formData.location}
              onChange={(e) => {
                setFormData({ ...formData, location: e.target.value });
                validateField("location", e.target.value);
              }}
              onBlur={() => validateField("location", formData.location)}
              className={errors.location ? "border-destructive" : ""}
            />
            {errors.location && (
              <p className="text-sm text-destructive">{errors.location}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-event-description">Description (optional)</Label>
            <Textarea
              id="edit-event-description"
              placeholder="Tell guests what to expect..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name || !formData.eventDate || !formData.location}
              className="flex-1"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
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
