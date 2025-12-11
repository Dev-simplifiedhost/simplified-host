import { useState, useEffect } from "react";
import { ArrowLeft, Smartphone, MessageSquare, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationPreferences {
  host_rsvp_received: boolean;
  host_item_claimed: boolean;
  host_payment_received: boolean;
  host_message_received: boolean;
  guest_announcements: boolean;
  guest_reminders: boolean;
  guest_rsvp_confirmation: boolean;
  guest_claim_confirmation: boolean;
  push_notifications: boolean;
  sms_enabled: boolean;
  email_frequency: 'instant' | 'daily' | 'weekly' | 'off';
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  host_rsvp_received: false,
  host_item_claimed: false,
  host_payment_received: true,
  host_message_received: true,
  guest_announcements: true,
  guest_reminders: true,
  guest_rsvp_confirmation: false,
  guest_claim_confirmation: false,
  push_notifications: true,
  sms_enabled: true,
  email_frequency: 'weekly',
};

interface NotificationsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

export function NotificationsSheet({
  open,
  onOpenChange,
  userId,
}: NotificationsSheetProps) {
  const isMobile = useIsMobile();
  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadPreferences();
    }
  }, [open, userId]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", userId)
        .single();

      if (error) throw error;

      if (data?.notification_preferences) {
        const dbPrefs = data.notification_preferences as Partial<NotificationPreferences>;
        setPrefs({ ...DEFAULT_PREFERENCES, ...dbPrefs });
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          notification_preferences: JSON.parse(JSON.stringify(prefs)),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (error) throw error;

      toast.success("Preferences saved");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const updatePref = (key: keyof NotificationPreferences, value: boolean | string) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b bg-background pt-safe">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onOpenChange(false)}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold flex-1">Notifications</h2>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="py-4 space-y-6">
            {/* Channels Section */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">
                Channels
              </p>
              <div className="bg-card border-y divide-y divide-border">
                <div className="flex items-center justify-between px-4 h-14">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Push Notifications</p>
                      <p className="text-xs text-muted-foreground">In-app alerts</p>
                    </div>
                  </div>
                  <Switch
                    checked={prefs.push_notifications}
                    onCheckedChange={(v) => updatePref("push_notifications", v)}
                  />
                </div>
                <div className="flex items-center justify-between px-4 h-14">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">SMS</p>
                      <p className="text-xs text-muted-foreground">Text messages</p>
                    </div>
                  </div>
                  <Switch
                    checked={prefs.sms_enabled}
                    onCheckedChange={(v) => updatePref("sms_enabled", v)}
                  />
                </div>
                <div className="flex items-center justify-between px-4 h-14">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email Frequency</p>
                    </div>
                  </div>
                  <Select
                    value={prefs.email_frequency}
                    onValueChange={(v) => updatePref("email_frequency", v)}
                  >
                    <SelectTrigger className="w-24 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instant">Instant</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* As a Host Section */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">
                As a Host
              </p>
              <div className="bg-card border-y divide-y divide-border">
                <div className="flex items-center justify-between px-4 h-14">
                  <div>
                    <p className="text-sm font-medium">Payment Received</p>
                    <p className="text-xs text-muted-foreground">When guests contribute</p>
                  </div>
                  <Switch
                    checked={prefs.host_payment_received}
                    onCheckedChange={(v) => updatePref("host_payment_received", v)}
                  />
                </div>
                <div className="flex items-center justify-between px-4 h-14">
                  <div>
                    <p className="text-sm font-medium">New Messages</p>
                    <p className="text-xs text-muted-foreground">Guest messages</p>
                  </div>
                  <Switch
                    checked={prefs.host_message_received}
                    onCheckedChange={(v) => updatePref("host_message_received", v)}
                  />
                </div>
                <div className="flex items-center justify-between px-4 h-14">
                  <div>
                    <p className="text-sm font-medium">New RSVPs</p>
                    <p className="text-xs text-muted-foreground">When guests respond</p>
                  </div>
                  <Switch
                    checked={prefs.host_rsvp_received}
                    onCheckedChange={(v) => updatePref("host_rsvp_received", v)}
                  />
                </div>
                <div className="flex items-center justify-between px-4 h-14">
                  <div>
                    <p className="text-sm font-medium">Item Claims</p>
                    <p className="text-xs text-muted-foreground">When guests claim items</p>
                  </div>
                  <Switch
                    checked={prefs.host_item_claimed}
                    onCheckedChange={(v) => updatePref("host_item_claimed", v)}
                  />
                </div>
              </div>
            </div>

            {/* As a Guest Section */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-2">
                As a Guest
              </p>
              <div className="bg-card border-y divide-y divide-border">
                <div className="flex items-center justify-between px-4 h-14">
                  <div>
                    <p className="text-sm font-medium">Announcements</p>
                    <p className="text-xs text-muted-foreground">Updates from hosts</p>
                  </div>
                  <Switch
                    checked={prefs.guest_announcements}
                    onCheckedChange={(v) => updatePref("guest_announcements", v)}
                  />
                </div>
                <div className="flex items-center justify-between px-4 h-14">
                  <div>
                    <p className="text-sm font-medium">Reminders</p>
                    <p className="text-xs text-muted-foreground">Before events start</p>
                  </div>
                  <Switch
                    checked={prefs.guest_reminders}
                    onCheckedChange={(v) => updatePref("guest_reminders", v)}
                  />
                </div>
                <div className="flex items-center justify-between px-4 h-14">
                  <div>
                    <p className="text-sm font-medium">RSVP Confirmation</p>
                    <p className="text-xs text-muted-foreground">Confirm your response</p>
                  </div>
                  <Switch
                    checked={prefs.guest_rsvp_confirmation}
                    onCheckedChange={(v) => updatePref("guest_rsvp_confirmation", v)}
                  />
                </div>
                <div className="flex items-center justify-between px-4 h-14">
                  <div>
                    <p className="text-sm font-medium">Claim Confirmation</p>
                    <p className="text-xs text-muted-foreground">When you claim items</p>
                  </div>
                  <Switch
                    checked={prefs.guest_claim_confirmation}
                    onCheckedChange={(v) => updatePref("guest_claim_confirmation", v)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="shrink-0 border-t bg-background px-4 py-4 pb-safe">
        <Button onClick={handleSave} disabled={saving || loading} className="w-full h-12">
          {saving ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[100dvh] p-0">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0">
        {content}
      </DialogContent>
    </Dialog>
  );
}
