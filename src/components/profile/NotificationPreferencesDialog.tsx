import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Bell, Mail, MessageSquare, Smartphone } from "lucide-react";

interface NotificationPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NotificationPrefs {
  // Host notifications
  host_rsvp_received: boolean;
  host_item_claimed: boolean;
  host_payment_received: boolean;
  host_message_received: boolean;
  // Guest notifications
  guest_announcements: boolean;
  guest_reminders: boolean;
  guest_rsvp_confirmation: boolean;
  guest_claim_confirmation: boolean;
  // Global channel settings
  push_notifications: boolean;
  sms_enabled: boolean;
  email_frequency: 'instant' | 'daily' | 'weekly' | 'off';
}

const DEFAULT_PREFS: NotificationPrefs = {
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

export function NotificationPreferencesDialog({
  open,
  onOpenChange,
}: NotificationPreferencesDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    if (open && user) {
      loadPreferences();
    }
  }, [open, user]);

  const loadPreferences = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data?.notification_preferences) {
        const dbPrefs = data.notification_preferences as Record<string, unknown>;
        setPrefs({
          ...DEFAULT_PREFS,
          ...dbPrefs,
        });
      }
    } catch (error) {
      console.error("Error loading preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          notification_preferences: JSON.parse(JSON.stringify(prefs)),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Notification preferences saved");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const updatePref = (key: keyof NotificationPrefs, value: boolean | string) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notification Preferences</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </DialogTitle>
          <DialogDescription>
            Choose what notifications you receive and how
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Global Channel Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Notification Channels
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">In-app alerts</p>
                </div>
                <Switch
                  checked={prefs.push_notifications}
                  onCheckedChange={(v) => updatePref("push_notifications", v)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <MessageSquare className="h-3 w-3" />
                    SMS Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">Text message updates</p>
                </div>
                <Switch
                  checked={prefs.sms_enabled}
                  onCheckedChange={(v) => updatePref("sms_enabled", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    Email Frequency
                  </Label>
                  <p className="text-xs text-muted-foreground">How often to receive emails</p>
                </div>
                <Select
                  value={prefs.email_frequency}
                  onValueChange={(v) => updatePref("email_frequency", v)}
                >
                  <SelectTrigger className="w-28 h-9">
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
            </CardContent>
          </Card>

          <Separator />

          {/* Host Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">As a Host</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Payment Received</Label>
                  <p className="text-xs text-muted-foreground">When guests contribute</p>
                </div>
                <Switch
                  checked={prefs.host_payment_received}
                  onCheckedChange={(v) => updatePref("host_payment_received", v)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">New Messages</Label>
                  <p className="text-xs text-muted-foreground">Guest messages to host</p>
                </div>
                <Switch
                  checked={prefs.host_message_received}
                  onCheckedChange={(v) => updatePref("host_message_received", v)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">New RSVPs</Label>
                  <p className="text-xs text-muted-foreground">When guests respond</p>
                </div>
                <Switch
                  checked={prefs.host_rsvp_received}
                  onCheckedChange={(v) => updatePref("host_rsvp_received", v)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Item Claims</Label>
                  <p className="text-xs text-muted-foreground">When guests claim items</p>
                </div>
                <Switch
                  checked={prefs.host_item_claimed}
                  onCheckedChange={(v) => updatePref("host_item_claimed", v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Guest Notifications */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">As a Guest</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Event Announcements</Label>
                  <p className="text-xs text-muted-foreground">Updates from hosts</p>
                </div>
                <Switch
                  checked={prefs.guest_announcements}
                  onCheckedChange={(v) => updatePref("guest_announcements", v)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Event Reminders</Label>
                  <p className="text-xs text-muted-foreground">Before event starts</p>
                </div>
                <Switch
                  checked={prefs.guest_reminders}
                  onCheckedChange={(v) => updatePref("guest_reminders", v)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">RSVP Confirmation</Label>
                  <p className="text-xs text-muted-foreground">Confirm your response</p>
                </div>
                <Switch
                  checked={prefs.guest_rsvp_confirmation}
                  onCheckedChange={(v) => updatePref("guest_rsvp_confirmation", v)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Claim Confirmation</Label>
                  <p className="text-xs text-muted-foreground">When you claim items</p>
                </div>
                <Switch
                  checked={prefs.guest_claim_confirmation}
                  onCheckedChange={(v) => updatePref("guest_claim_confirmation", v)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
