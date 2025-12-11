import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Bell, Send, Calendar, Clock, Trash2, Settings, TrendingUp } from "lucide-react";
import { format, addDays } from "date-fns";

interface RemindersTabProps {
  eventId: string;
  eventDate: string | null;
  rsvpDeadline: string | null;
  hideSettings?: boolean;
  onOpenSettings?: () => void;
}

interface Reminder {
  id: string;
  reminder_type: string;
  scheduled_for: string;
  status: string;
  message_title: string | null;
  message_template: string;
  sent_at: string | null;
  created_at: string;
}

export function RemindersTab({ eventId, eventDate, rsvpDeadline, hideSettings = false, onOpenSettings }: RemindersTabProps) {
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderSettings, setReminderSettings] = useState({
    rsvp_reminder_days: 3,
    item_reminder_days: 2,
    contribution_reminder_days: 1,
    thank_you_delay_days: 1,
    custom_messages: {} as Record<string, string>
  });
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewReminderDialog, setShowNewReminderDialog] = useState(false);
  const [newReminder, setNewReminder] = useState({
    type: "custom",
    title: "",
    message: "",
    scheduledFor: ""
  });

  useEffect(() => {
    loadEventSettings();
    loadReminders();
    subscribeToReminders();
  }, [eventId]);

  const loadEventSettings = async () => {
    const { data } = await supabase
      .from("events")
      .select("reminders_enabled, reminder_settings")
      .eq("id", eventId)
      .single();

    if (data) {
      setRemindersEnabled(data.reminders_enabled ?? true);
      if (data.reminder_settings && typeof data.reminder_settings === 'object') {
        setReminderSettings(data.reminder_settings as typeof reminderSettings);
      }
    }
  };

  const loadReminders = async () => {
    const { data } = await supabase
      .from("reminders")
      .select("*")
      .eq("event_id", eventId)
      .order("scheduled_for", { ascending: true });

    if (data) {
      setReminders(data);
    }
  };

  const subscribeToReminders = () => {
    const channel = supabase
      .channel(`reminders-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reminders",
          filter: `event_id=eq.${eventId}`
        },
        () => loadReminders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const updateEventSettings = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("events")
      .update({
        reminders_enabled: remindersEnabled,
        reminder_settings: reminderSettings
      })
      .eq("id", eventId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update reminder settings",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Settings updated",
        description: "Your reminder preferences have been saved"
      });
    }
    setLoading(false);
  };

  const createReminder = async () => {
    if (!newReminder.message.trim()) {
      toast({
        title: "Message required",
        description: "Please enter a reminder message",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("reminders")
      .insert({
        event_id: eventId,
        reminder_type: newReminder.type,
        message_title: newReminder.title || null,
        message_template: newReminder.message,
        scheduled_for: newReminder.scheduledFor || new Date().toISOString(),
        status: "pending"
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create reminder",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Reminder scheduled",
        description: "Your reminder has been created successfully"
      });
      setShowNewReminderDialog(false);
      setNewReminder({ type: "custom", title: "", message: "", scheduledFor: "" });
    }
    setLoading(false);
  };

  const cancelReminder = async (reminderId: string) => {
    const { error } = await supabase
      .from("reminders")
      .update({ status: "cancelled" })
      .eq("id", reminderId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to cancel reminder",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Reminder cancelled",
        description: "The reminder has been cancelled"
      });
    }
  };

  const sendReminderNow = async (reminderId: string) => {
    toast({
      title: "Sending reminder",
      description: "This feature will be available soon with email integration"
    });
  };

  const getReminderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      rsvp: "RSVP Reminder",
      item: "Item Reminder",
      contribution: "Contribution Reminder",
      thank_you: "Thank You",
      custom: "Custom Reminder",
      announcement: "Announcement",
      item_followup: "Item Followup (Auto)"
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: "outline",
      sent: "default",
      cancelled: "secondary",
      failed: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const pendingReminders = reminders.filter(r => r.status === "pending");
  const sentReminders = reminders.filter(r => r.status === "sent");

  return (
    <div className="space-y-6">
      {hideSettings && onOpenSettings && (
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
          <div>
            <p className="text-sm font-medium">Need to adjust reminder timings?</p>
            <p className="text-xs text-muted-foreground">Configure automated reminder schedules in event settings</p>
          </div>
          <Button variant="outline" size="sm" onClick={onOpenSettings}>
            <Settings className="h-4 w-4 mr-2" />
            Open Settings
          </Button>
        </div>
      )}
      {!hideSettings && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Automated Reminders
                </CardTitle>
                <CardDescription>
                  Keep your guests informed with timely notifications
                </CardDescription>
              </div>
              <Switch
                checked={remindersEnabled}
                onCheckedChange={setRemindersEnabled}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {remindersEnabled && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>RSVP Reminder (days before deadline)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={reminderSettings.rsvp_reminder_days}
                      onChange={(e) => setReminderSettings({
                        ...reminderSettings,
                        rsvp_reminder_days: parseInt(e.target.value) || 3
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Item Reminder (days before event)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={reminderSettings.item_reminder_days}
                      onChange={(e) => setReminderSettings({
                        ...reminderSettings,
                        item_reminder_days: parseInt(e.target.value) || 2
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contribution Reminder (days before event)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={reminderSettings.contribution_reminder_days}
                      onChange={(e) => setReminderSettings({
                        ...reminderSettings,
                        contribution_reminder_days: parseInt(e.target.value) || 1
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Thank You Message (days after event)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="7"
                      value={reminderSettings.thank_you_delay_days}
                      onChange={(e) => setReminderSettings({
                        ...reminderSettings,
                        thank_you_delay_days: parseInt(e.target.value) || 1
                      })}
                    />
                  </div>
                </div>
                <Button onClick={updateEventSettings} disabled={loading}>
                  <Settings className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="scheduled" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scheduled">
            Scheduled ({pendingReminders.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({sentReminders.length})
          </TabsTrigger>
          <TabsTrigger value="performance">
            Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Upcoming Reminders</h3>
            <Dialog open={showNewReminderDialog} onOpenChange={setShowNewReminderDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminder Now
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Manual Reminder</DialogTitle>
                  <DialogDescription>
                    Send a custom reminder to your guests
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Reminder Type</Label>
                    <Select value={newReminder.type} onValueChange={(value) => setNewReminder({ ...newReminder, type: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rsvp">RSVP Reminder</SelectItem>
                        <SelectItem value="item">Item Reminder</SelectItem>
                        <SelectItem value="contribution">Contribution Reminder</SelectItem>
                        <SelectItem value="custom">Custom Message</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Title (optional)</Label>
                    <Input
                      placeholder="Reminder title"
                      value={newReminder.title}
                      onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      placeholder="Your reminder message..."
                      maxLength={500}
                      value={newReminder.message}
                      onChange={(e) => setNewReminder({ ...newReminder, message: e.target.value })}
                    />
                    <p className="text-sm text-muted-foreground">
                      {newReminder.message.length}/500 characters
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Schedule For (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={newReminder.scheduledFor}
                      onChange={(e) => setNewReminder({ ...newReminder, scheduledFor: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewReminderDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createReminder} disabled={loading}>
                    Create Reminder
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {pendingReminders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No scheduled reminders</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingReminders.map((reminder) => (
                <Card key={reminder.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{getReminderTypeLabel(reminder.reminder_type)}</Badge>
                          {getStatusBadge(reminder.status)}
                          {reminder.reminder_type === 'item_followup' && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                              Auto-Generated
                            </Badge>
                          )}
                        </div>
                        {reminder.message_title && (
                          <h4 className="font-semibold mb-1">{reminder.message_title}</h4>
                        )}
                        <p className="text-sm text-muted-foreground mb-2">
                          {reminder.message_template}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(reminder.scheduled_for), "MMM d, yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(reminder.scheduled_for), "h:mm a")}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => sendReminderNow(reminder.id)}>
                          <Send className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => cancelReminder(reminder.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {sentReminders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Send className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No sent reminders yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sentReminders.map((reminder) => (
                <Card key={reminder.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{getReminderTypeLabel(reminder.reminder_type)}</Badge>
                      {getStatusBadge(reminder.status)}
                    </div>
                    {reminder.message_title && (
                      <h4 className="font-semibold mb-1">{reminder.message_title}</h4>
                    )}
                    <p className="text-sm text-muted-foreground mb-2">
                      {reminder.message_template}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Send className="h-3 w-3" />
                        Sent {reminder.sent_at ? format(new Date(reminder.sent_at), "MMM d 'at' h:mm a") : "N/A"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="performance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Reminder Performance
              </CardTitle>
              <CardDescription>
                Track engagement with your reminders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Total Sent</p>
                  <p className="text-2xl font-bold">{sentReminders.length}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{pendingReminders.length}</p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                  <p className="text-2xl font-bold">
                    {reminders.filter(r => r.status === "cancelled").length}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Detailed analytics (open rates, action rates) will be available with email integration
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
