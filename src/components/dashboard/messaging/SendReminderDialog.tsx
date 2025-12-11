import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, AlertTriangle, Phone } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ReminderTypeSelector } from "./ReminderTypeSelector";
import { MessagingLimitModal } from "./MessagingLimitModal";
import {
  type ReminderType,
  SMS_TEMPLATES,
  substituteVariables,
  validateCharacterLimit,
  validateRequiredLinks,
  formatDateForSms,
  getLinkVariableDisplayName,
} from "@/lib/smsTemplates";
import { trackSmsSent, trackPaywallShown } from "@/lib/smsAnalytics";

interface Guest {
  id: string;
  guest_name: string;
  guest_phone: string | null;
  country_code: string | null;
  guest_token: string;
}

interface SendReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  eventDate: string | null;
  eventCode: string;
  guest?: Guest;
  allowGuestItems?: boolean;
  singleRemindersSent: number;
  singleReminderLimit: number;
  onSuccess?: () => void;
}

export function SendReminderDialog({
  open,
  onOpenChange,
  eventId,
  eventName,
  eventDate,
  eventCode,
  guest,
  allowGuestItems = true,
  singleRemindersSent,
  singleReminderLimit,
  onSuccess,
}: SendReminderDialogProps) {
  const isMobile = useIsMobile();
  const [selectedType, setSelectedType] = useState<ReminderType | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);

  const remainingReminders = singleReminderLimit - singleRemindersSent;
  const hasRemindersLeft = remainingReminders > 0;

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedType(null);
      setCustomMessage('');
      setDailyLimitReached(false);
    }
  }, [open]);

  // Check 24-hour limit for guest when type is selected
  useEffect(() => {
    if (!guest || !selectedType) return;
    
    const checkDailyLimit = async () => {
      const { data, error } = await supabase.rpc('check_guest_sms_limit', {
        p_event_id: eventId,
        p_guest_id: guest.id,
      });
      
      if (!error && data && typeof data === 'object' && 'allowed' in data && !data.allowed) {
        setDailyLimitReached(true);
      } else {
        setDailyLimitReached(false);
      }
    };
    
    checkDailyLimit();
  }, [guest, selectedType, eventId]);

  const handleSend = async () => {
    if (!selectedType || !guest) return;
    
    // Validate guest has phone number
    if (!guest.guest_phone) {
      toast({
        title: "No phone number available",
        description: "This guest doesn't have a phone number on file.",
        variant: "destructive",
      });
      return;
    }

    // Check event-level limit
    if (!hasRemindersLeft) {
      setShowLimitModal(true);
      await trackPaywallShown(eventId, 'single_limit');
      return;
    }

    // Check 24-hour limit
    if (dailyLimitReached) {
      toast({
        title: "Daily limit reached",
        description: "You've already sent this guest a reminder today.",
        variant: "destructive",
      });
      await trackPaywallShown(eventId, 'daily_guest_limit');
      return;
    }

    // Validate message character limit
    const charValidation = validateCharacterLimit(customMessage);
    if (!charValidation.valid) {
      toast({
        title: "Message too long",
        description: `SMS must be under 155 characters.`,
        variant: "destructive",
      });
      return;
    }

    // Validate required link variables are present
    const linkValidation = validateRequiredLinks(customMessage, selectedType);
    if (!linkValidation.valid) {
      toast({
        title: "Required link missing",
        description: `Please restore the ${linkValidation.missingLinks.map(getLinkVariableDisplayName).join(', ')}.`,
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      // Substitute variables
      const finalMessage = substituteVariables(customMessage, {
        eventName,
        eventDate: eventDate ? formatDateForSms(eventDate) : 'TBD',
        eventCode,
        guestToken: guest.guest_token,
      });

      // Send via edge function
      const { data, error } = await supabase.functions.invoke('send-guest-reminder', {
        body: {
          eventId,
          guestId: guest.id,
          reminderType: selectedType,
          message: finalMessage,
          guestPhone: guest.guest_phone,
          countryCode: guest.country_code || 'US',
        },
      });

      if (error) throw error;

      if (data?.error === 'daily_limit_reached') {
        toast({
          title: "Daily limit reached",
          description: "You've already sent this guest a reminder today.",
          variant: "destructive",
        });
        return;
      }

      if (data?.error === 'single_limit_reached') {
        setShowLimitModal(true);
        await trackPaywallShown(eventId, 'single_limit');
        return;
      }

      // Track analytics
      await trackSmsSent(eventId, selectedType, guest.id, finalMessage.length);

      toast({
        title: "Reminder sent",
        description: `${SMS_TEMPLATES[selectedType].name} sent to ${guest.guest_name}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to send reminder:', error);
      toast({
        title: "Couldn't send message",
        description: "Message couldn't be sent. Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const content = (
    <div className="space-y-4">
      {/* Quota Display */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <span className="text-sm text-muted-foreground">Reminders remaining</span>
        <Badge variant={hasRemindersLeft ? "secondary" : "destructive"}>
          {remainingReminders} of {singleReminderLimit}
        </Badge>
      </div>

      {/* Guest Info */}
      {guest && (
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-medium">
              {guest.guest_name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{guest.guest_name}</p>
            {guest.guest_phone ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {guest.guest_phone}
              </p>
            ) : (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                No phone number
              </p>
            )}
          </div>
        </div>
      )}

      {/* Daily Limit Warning */}
      {dailyLimitReached && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 dark:text-amber-400">
            You've already sent this guest a reminder today.
          </p>
        </div>
      )}

      {/* Reminder Type Selector */}
      <ReminderTypeSelector
        selectedType={selectedType}
        onSelectType={setSelectedType}
        customMessage={customMessage}
        onCustomMessageChange={setCustomMessage}
        showItemReminder={allowGuestItems}
        disabled={dailyLimitReached || !guest?.guest_phone}
      />

      {/* Pro Teaser */}
      <p className="text-xs text-muted-foreground text-center">
        Advanced messaging—two-way chat, unlimited reminders, scheduling, and custom templates—coming soon with SimplifiedHost Pro.
      </p>
    </div>
  );

  const footer = (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        className="flex-1"
      >
        Cancel
      </Button>
      <Button
        onClick={handleSend}
        disabled={!selectedType || isSending || dailyLimitReached || !guest?.guest_phone}
        className="flex-1"
      >
        {isSending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Send Reminder
          </>
        )}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="pb-safe">
            <DrawerHeader>
              <DrawerTitle>Send Reminder</DrawerTitle>
              <DrawerDescription>
                Choose a reminder type to send to {guest?.guest_name}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4">{content}</div>
            <DrawerFooter>{footer}</DrawerFooter>
          </DrawerContent>
        </Drawer>
        
        <MessagingLimitModal
          open={showLimitModal}
          onOpenChange={setShowLimitModal}
          variant="single"
          eventId={eventId}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Reminder</DialogTitle>
            <DialogDescription>
              Choose a reminder type to send to {guest?.guest_name}
            </DialogDescription>
          </DialogHeader>
          {content}
          <DialogFooter>{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
      
      <MessagingLimitModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        variant="single"
        eventId={eventId}
      />
    </>
  );
}
