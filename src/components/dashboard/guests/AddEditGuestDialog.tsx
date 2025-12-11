import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { PhoneInputWithCountry } from "@/components/ui/phone-input";
import { useIsMobile } from "@/hooks/use-mobile";
import { GuestData } from "./GuestCard";
import { cn } from "@/lib/utils";

interface AddEditGuestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest?: GuestData | null;
  onSave: (data: Partial<GuestData>) => Promise<void>;
}

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut Allergy',
  'Kosher',
  'Halal',
];

export const AddEditGuestDialog = ({
  open,
  onOpenChange,
  guest,
  onSave,
}: AddEditGuestDialogProps) => {
  const isMobile = useIsMobile();
  const isEditing = !!guest;

  const [formData, setFormData] = useState({
    guest_name: '',
    guest_phone: '',
    country_code: 'US',
    guest_email: '',
    dietary_preferences: [] as string[],
    dietary_allergy: '',
    rsvp_status: 'no_response' as GuestData['rsvp_status'],
    message: '', // Host notes
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (guest) {
      setFormData({
        guest_name: guest.guest_name || '',
        guest_phone: guest.guest_phone || '',
        country_code: guest.country_code || 'US',
        guest_email: guest.guest_email || '',
        dietary_preferences: guest.dietary_preferences || [],
        dietary_allergy: guest.dietary_allergy || '',
        rsvp_status: guest.rsvp_status || 'no_response',
        message: guest.message || '',
      });
    } else {
      setFormData({
        guest_name: '',
        guest_phone: '',
        country_code: 'US',
        guest_email: '',
        dietary_preferences: [],
        dietary_allergy: '',
        rsvp_status: 'no_response',
        message: '',
      });
    }
  }, [guest, open]);

  const toggleDietary = (option: string) => {
    setFormData(prev => ({
      ...prev,
      dietary_preferences: prev.dietary_preferences.includes(option)
        ? prev.dietary_preferences.filter(d => d !== option)
        : [...prev.dietary_preferences, option]
    }));
  };

  const handleSave = async () => {
    if (!formData.guest_name.trim()) return;
    
    setSaving(true);
    try {
      await onSave({
        ...formData,
        guest_name: formData.guest_name.trim(),
        guest_email: formData.guest_email.trim() || null,
        guest_phone: formData.guest_phone || null,
        country_code: formData.country_code,
        dietary_preferences: formData.dietary_preferences.length > 0 ? formData.dietary_preferences : null,
        dietary_allergy: formData.dietary_allergy.trim() || null,
        message: formData.message.trim() || null,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const content = (
    <div className="space-y-6 px-1">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="guest-name">Name *</Label>
        <Input
          id="guest-name"
          value={formData.guest_name}
          onChange={(e) => setFormData(prev => ({ ...prev, guest_name: e.target.value }))}
          placeholder="Guest name"
          className="h-12"
        />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label>Phone (recommended)</Label>
        <PhoneInputWithCountry
          value={formData.guest_phone}
          onChange={(value) => setFormData(prev => ({ 
            ...prev, 
            guest_phone: value || '',
          }))}
          placeholder="(555) 123-4567"
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="guest-email">Email (optional)</Label>
        <Input
          id="guest-email"
          type="email"
          value={formData.guest_email}
          onChange={(e) => setFormData(prev => ({ ...prev, guest_email: e.target.value }))}
          placeholder="guest@example.com"
          className="h-12"
        />
      </div>

      {/* Dietary Preferences */}
      <div className="space-y-2">
        <Label>Dietary Preferences</Label>
        <div className="flex flex-wrap gap-2">
          {DIETARY_OPTIONS.map(option => (
            <Badge
              key={option}
              variant={formData.dietary_preferences.includes(option) ? "default" : "outline"}
              className={cn(
                "cursor-pointer h-8 px-3 transition-colors",
                formData.dietary_preferences.includes(option) && "bg-primary text-primary-foreground"
              )}
              onClick={() => toggleDietary(option)}
            >
              {option}
            </Badge>
          ))}
        </div>
        <Input
          placeholder="Other allergies or restrictions..."
          value={formData.dietary_allergy}
          onChange={(e) => setFormData(prev => ({ ...prev, dietary_allergy: e.target.value }))}
          className="mt-2 h-12"
        />
      </div>

      {/* RSVP Status */}
      <div className="space-y-2">
        <Label>RSVP Status</Label>
        <RadioGroup
          value={formData.rsvp_status}
          onValueChange={(value) => setFormData(prev => ({ 
            ...prev, 
            rsvp_status: value as GuestData['rsvp_status'] 
          }))}
          className="flex flex-wrap gap-3"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="attending" id="rsvp-attending" />
            <Label htmlFor="rsvp-attending" className="cursor-pointer">Going</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="maybe" id="rsvp-maybe" />
            <Label htmlFor="rsvp-maybe" className="cursor-pointer">Maybe</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="not_attending" id="rsvp-not" />
            <Label htmlFor="rsvp-not" className="cursor-pointer">Not Going</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no_response" id="rsvp-none" />
            <Label htmlFor="rsvp-none" className="cursor-pointer">No Response</Label>
          </div>
        </RadioGroup>
      </div>

      {/* Host Notes */}
      <div className="space-y-2">
        <Label htmlFor="host-notes">Host Notes (private)</Label>
        <Textarea
          id="host-notes"
          value={formData.message}
          onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
          placeholder="Private notes about this guest..."
          rows={3}
        />
      </div>
    </div>
  );

  const footer = (
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)}>
        Cancel
      </Button>
      <Button 
        onClick={handleSave} 
        disabled={!formData.guest_name.trim() || saving}
      >
        {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Guest'}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <DrawerTitle>{isEditing ? 'Edit Guest' : 'Add Guest'}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            {content}
          </div>
          <DrawerFooter className="flex-row gap-2 pb-safe">
            {footer}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Guest' : 'Add Guest'}</DialogTitle>
        </DialogHeader>
        {content}
        <DialogFooter>
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
