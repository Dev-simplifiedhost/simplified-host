import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2, CheckCircle2, Info } from "lucide-react";
import { cleanPhoneNumber } from "@/lib/phoneFormat";

interface MessageHostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  requireEmail?: boolean;
}

export function MessageHostDialog({
  open,
  onOpenChange,
  eventId,
  requireEmail = false,
}: MessageHostDialogProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const contentRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasExistingConsent, setHasExistingConsent] = useState(false);
  const [checkingConsent, setCheckingConsent] = useState(false);
  const [showSmsInfo, setShowSmsInfo] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  // Auto-populate form with RSVP data
  useEffect(() => {
    if (!open) return;
    
    const autoPopulateFromRsvp = async () => {
      const guestToken = localStorage.getItem(`rsvp_token_${eventId}`);
      if (!guestToken) return;

      try {
        const { data, error } = await supabase
          .rpc('get_my_rsvp_full', {
            p_event_id: eventId,
            p_guest_token: guestToken
          })
          .maybeSingle();

        if (data && !error) {
          setFormData(prev => ({
            ...prev,
            name: (data as any).guest_name || prev.name,
            email: (data as any).guest_email || prev.email,
            phone: (data as any).guest_phone || prev.phone,
          }));
        }
      } catch (error) {
        console.error("Error loading RSVP data:", error);
      }
    };

    autoPopulateFromRsvp();
  }, [open, eventId]);

  const checkGlobalConsent = async (phone: string) => {
    if (!phone || phone.length < 10) return;
    
    setCheckingConsent(true);
    const cleanedPhone = cleanPhoneNumber(phone);
    
    try {
      const { data: hasConsent } = await supabase.rpc('check_sms_consent_global', {
        p_phone: cleanedPhone,
        p_country_code: 'US'
      });
      
      setHasExistingConsent(hasConsent === true);
      setShowSmsInfo(true);
    } catch (error) {
      console.error('Error checking SMS consent:', error);
    } finally {
      setCheckingConsent(false);
    }
  };

  const handlePhoneBlur = () => {
    if (formData.phone) {
      checkGlobalConsent(formData.phone);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.from("host_messages").insert({
        event_id: eventId,
        sender_name: formData.name,
        sender_email: formData.email,
        sender_phone: formData.phone,
        message_subject: formData.subject || null,
        message_body: formData.message,
        priority: "normal",
      });

      if (error) throw error;

      // Save SMS consent if new
      if (!hasExistingConsent && formData.phone) {
        const guestToken = localStorage.getItem(`rsvp_token_${eventId}`) || crypto.randomUUID();
        
        await supabase.from('guest_preferences').upsert({
          event_id: eventId,
          guest_token: guestToken,
          guest_email: formData.email || null,
          guest_phone: cleanPhoneNumber(formData.phone),
          country_code: 'US',
          sms_enabled: true,
          sms_consent_given_at: new Date().toISOString(),
          email_enabled: true,
          push_enabled: true
        });
      }

      toast({
        title: "Message sent!",
        description: "The host will receive your message and can reply directly.",
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!isMobile) return;
    
    const el = e.currentTarget;
    const container = contentRef.current;
    if (!container) return;
    
    setTimeout(() => {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }, 150);
  };

  const content = (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Your Name *</Label>
        <Input
          id="name"
          required
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          onFocus={handleInputFocus}
        />
      </div>
      <div>
        <Label htmlFor="email">Email {requireEmail && "*"}</Label>
        <Input
          id="email"
          type="email"
          required={requireEmail}
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
          onFocus={handleInputFocus}
        />
      </div>
      <div>
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          type="tel"
          required
          value={formData.phone}
          onChange={(e) => {
            setFormData({ ...formData, phone: e.target.value });
            setHasExistingConsent(false);
            setShowSmsInfo(false);
          }}
          onBlur={handlePhoneBlur}
          onFocus={handleInputFocus}
        />
        {showSmsInfo && formData.phone.length >= 10 && (
          <>
            {hasExistingConsent ? (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 p-2 bg-green-50 dark:bg-green-950 rounded-md border border-green-200 dark:border-green-800 mt-2">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs">Host can reply via SMS (you opted in previously)</span>
              </div>
            ) : (
              <div className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800 mt-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                    The host can reply to your message via SMS
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    By providing your phone number, you consent to receiving SMS replies from the host. 
                    Reply STOP to opt out anytime.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div>
        <Label htmlFor="subject">Subject (optional)</Label>
        <Input
          id="subject"
          placeholder="Quick question about..."
          value={formData.subject}
          onChange={(e) =>
            setFormData({ ...formData, subject: e.target.value })
          }
          onFocus={handleInputFocus}
        />
      </div>
      <div>
        <Label htmlFor="message">Message *</Label>
        <Textarea
          id="message"
          required
          maxLength={1000}
          placeholder="Hi! I wanted to ask..."
          value={formData.message}
          onChange={(e) =>
            setFormData({ ...formData, message: e.target.value })
          }
          onFocus={handleInputFocus}
        />
      </div>
    </div>
  );

  const footer = (
    <form onSubmit={handleSubmit}>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Sending...
          </>
        ) : (
          "Send Message"
        )}
      </Button>
    </form>
  );

  // Desktop uses Dialog
  if (!isMobile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Message the Host</DialogTitle>
            <DialogDescription>
              Send a direct message to the event organizer
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {content}
          </div>
          <div className="pt-4">
            {footer}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Mobile uses Drawer
  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="h-[85dvh] overflow-hidden">
        <DrawerHeader className="pb-3">
          <DrawerTitle>Message the Host</DrawerTitle>
          <DrawerDescription>
            Send a direct message to the event organizer
          </DrawerDescription>
        </DrawerHeader>
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto overscroll-y-contain px-6 pb-[calc(env(safe-area-inset-bottom)+96px)] [@supports(-webkit-touch-callout:none)]:[-webkit-overflow-scrolling:touch]"
          data-vaul-no-drag
        >
          {content}
        </div>
        <DrawerFooter className="pt-2 pb-[max(1rem,calc(env(safe-area-inset-bottom)+1rem))]">
          {footer}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
