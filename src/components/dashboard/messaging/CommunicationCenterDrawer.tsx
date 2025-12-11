import { useState, useEffect } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Send,
  RefreshCw,
  Zap,
  AlertTriangle
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow, differenceInDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface CommunicationCenterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
}

interface SmsLogEntry {
  id: string;
  guest_id: string;
  guest_name?: string;
  reminder_type: string;
  sent_at: string;
  character_count: number | null;
  message_text: string | null;
  delivery_status?: string;
}

interface BroadcastEntry {
  id: string;
  target_audience: string;
  message_text: string;
  recipients_count: number;
  successful_count: number;
  failed_count: number;
  sent_at: string;
}

interface SmsLimits {
  bulkSent: number;
  bulkLimit: number;
  singleSent: number;
  singleLimit: number;
}

interface GuestSmsStatus {
  guestId: string;
  guestName: string;
  lastSentAt: string | null;
  sentToday: number;
  nextAvailable: Date | null;
}

export function CommunicationCenterDrawer({
  open,
  onOpenChange,
  eventId,
  eventName,
}: CommunicationCenterDrawerProps) {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [smsLogs, setSmsLogs] = useState<SmsLogEntry[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastEntry[]>([]);
  const [limits, setLimits] = useState<SmsLimits>({ bulkSent: 0, bulkLimit: 3, singleSent: 0, singleLimit: 10 });
  const [guestStatuses, setGuestStatuses] = useState<GuestSmsStatus[]>([]);

  useEffect(() => {
    if (open && eventId) {
      loadData();
    }
  }, [open, eventId]);

  const loadData = async () => {
    setLoading(true);
    
    try {
      // Load SMS logs with guest names
      const { data: logs } = await supabase
        .from('guest_sms_log')
        .select(`
          id,
          guest_id,
          reminder_type,
          sent_at,
          character_count,
          message_text,
          rsvps(guest_name)
        `)
        .eq('event_id', eventId)
        .order('sent_at', { ascending: false })
        .limit(50);

      const mappedLogs: SmsLogEntry[] = (logs || []).map((log: any) => ({
        id: log.id,
        guest_id: log.guest_id,
        guest_name: log.rsvps?.guest_name || 'Unknown Guest',
        reminder_type: log.reminder_type,
        sent_at: log.sent_at,
        character_count: log.character_count,
        message_text: log.message_text,
        delivery_status: 'sent', // Default to sent for now
      }));
      setSmsLogs(mappedLogs);

      // Load broadcasts
      const { data: broadcastData } = await supabase
        .from('sms_broadcasts')
        .select('*')
        .eq('event_id', eventId)
        .order('sent_at', { ascending: false });

      setBroadcasts(broadcastData || []);

      // Load event limits
      const { data: event } = await supabase
        .from('events')
        .select('sms_broadcasts_sent, sms_broadcast_limit, single_reminders_sent, single_reminder_limit')
        .eq('id', eventId)
        .single();

      if (event) {
        setLimits({
          bulkSent: event.sms_broadcasts_sent || 0,
          bulkLimit: event.sms_broadcast_limit || 3,
          singleSent: event.single_reminders_sent || 0,
          singleLimit: event.single_reminder_limit || 10,
        });
      }

      // Calculate guest SMS statuses (for "next available" display)
      const guestMap = new Map<string, GuestSmsStatus>();
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      mappedLogs.forEach(log => {
        const existing = guestMap.get(log.guest_id);
        const sentAt = new Date(log.sent_at);
        const sentToday = sentAt > yesterday ? 1 : 0;
        
        if (!existing) {
          guestMap.set(log.guest_id, {
            guestId: log.guest_id,
            guestName: log.guest_name || 'Unknown',
            lastSentAt: log.sent_at,
            sentToday: sentToday,
            nextAvailable: sentToday >= 2 ? addDays(sentAt, 1) : null,
          });
        } else {
          existing.sentToday += sentToday;
          if (existing.sentToday >= 2) {
            existing.nextAvailable = addDays(new Date(existing.lastSentAt!), 1);
          }
        }
      });

      setGuestStatuses(Array.from(guestMap.values()));

    } catch (error) {
      console.error('Error loading communication data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReminderTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      rsvp: 'RSVP Reminder',
      event_date: 'Event Day',
      item_claim: 'Item Reminder',
      payment: 'Payment Reminder',
      bulk_rsvp: 'Bulk RSVP',
      bulk: 'Bulk Message',
    };
    return labels[type] || type;
  };

  const getAudienceLabel = (audience: string) => {
    const labels: Record<string, string> = {
      attending: 'Attending Only',
      maybe: 'Maybe Only',
      attending_and_maybe: 'Attending & Maybe',
      all_invited: 'All Guests',
    };
    return labels[audience] || audience;
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle2 className="h-3 w-3 text-green-500" />;
      case 'failed':
        return <XCircle className="h-3 w-3 text-destructive" />;
      case 'queued':
        return <Clock className="h-3 w-3 text-amber-500" />;
      default:
        return <Send className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* SMS Remaining Widget */}
      <div className="p-4 bg-muted/50 rounded-lg mx-4 mb-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">SMS Quota</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={loadData}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center justify-between p-2 bg-background rounded border">
            <span className="text-muted-foreground">Bulk</span>
            <Badge variant={limits.bulkSent >= limits.bulkLimit ? "destructive" : "secondary"}>
              {limits.bulkLimit - limits.bulkSent} of {limits.bulkLimit}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-2 bg-background rounded border">
            <span className="text-muted-foreground">Direct</span>
            <Badge variant={limits.singleSent >= limits.singleLimit ? "destructive" : "secondary"}>
              {limits.singleLimit - limits.singleSent} of {limits.singleLimit}
            </Badge>
          </div>
        </div>

        {/* Boost Pack placeholder */}
        {false && (
          <div className="flex items-center gap-2 p-2 bg-primary/10 rounded border border-primary/20">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">Event Boost active — extra SMS unlocked</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="activity" className="flex-1 flex flex-col px-4">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="guests">Guest Status</TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="flex-1 mt-0">
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {/* Broadcasts */}
                {broadcasts.map((broadcast) => (
                  <div key={broadcast.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">Bulk Broadcast</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(broadcast.sent_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getAudienceLabel(broadcast.target_audience)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {broadcast.successful_count} sent
                      </Badge>
                      {broadcast.failed_count > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          <XCircle className="h-3 w-3 mr-1" />
                          {broadcast.failed_count} failed
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}

                {/* Individual SMS logs */}
                {smsLogs.map((log) => (
                  <div key={log.id} className="p-3 border rounded-lg space-y-1">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.delivery_status)}
                        <span className="font-medium text-sm">{log.guest_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.sent_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {getReminderTypeLabel(log.reminder_type)}
                      </Badge>
                      {log.character_count && (
                        <span className="text-xs text-muted-foreground">
                          {log.character_count} chars
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {broadcasts.length === 0 && smsLogs.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No messages sent yet</p>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="guests" className="flex-1 mt-0">
          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : guestStatuses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No SMS history for guests</p>
              </div>
            ) : (
              <div className="space-y-2">
                {guestStatuses.map((guest) => (
                  <div key={guest.guestId} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{guest.guestName}</p>
                      <p className="text-xs text-muted-foreground">
                        {guest.sentToday} sent today
                      </p>
                    </div>
                    <div className="text-right">
                      {guest.nextAvailable ? (
                        <div className="flex items-center gap-1 text-xs text-amber-600">
                          <Clock className="h-3 w-3" />
                          <span>
                            Available in {differenceInDays(guest.nextAvailable, new Date())} day(s)
                          </span>
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Available
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Pro Teaser */}
      <div className="p-4 border-t mt-auto">
        <p className="text-xs text-muted-foreground text-center">
          Unlimited messaging, delivery tracking, and scheduling coming with SimplifiedHost Pro.
        </p>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] pb-safe">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Communication Center
            </DrawerTitle>
            <DrawerDescription>
              Activity log and messaging status for {eventName}
            </DrawerDescription>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:max-w-[425px] p-0">
        <SheetHeader className="p-4 pb-0">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Communication Center
          </SheetTitle>
          <SheetDescription>
            Activity log and messaging status for {eventName}
          </SheetDescription>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}

export default CommunicationCenterDrawer;
