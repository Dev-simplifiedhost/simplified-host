import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Phone, 
  Mail, 
  Edit2, 
  Trash2, 
  Bell,
  DollarSign,
  Package,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  AlertTriangle,
  Leaf,
  Loader2,
  Users,
  Send
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { formatPhoneNumber } from "@/lib/phoneFormat";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GuestData, GuestActivity, ReadinessStatus } from "./GuestCard";
import { 
  canSendRsvpReminder, 
  canSendPaymentReminder,
  recordRsvpReminderSent,
  recordPaymentReminderSent,
  formatDaysRemaining,
  getLastRsvpReminderDate
} from "@/lib/guestReminders";
import { cn } from "@/lib/utils";

interface GuestDetailsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: GuestData | null;
  activity: GuestActivity;
  readinessStatus: ReadinessStatus;
  contributionsEnabled: boolean;
  isArchived?: boolean;
  eventId?: string;
  eventName?: string;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateRsvp: (status: GuestData['rsvp_status']) => void;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'attending':
      return { icon: CheckCircle2, label: 'Going', color: 'text-green-600', bgColor: 'bg-green-100' };
    case 'maybe':
      return { icon: HelpCircle, label: 'Maybe', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    case 'not_attending':
      return { icon: XCircle, label: 'Not Going', color: 'text-red-600', bgColor: 'bg-red-100' };
    default:
      return { icon: Clock, label: 'No Response', color: 'text-muted-foreground', bgColor: 'bg-muted' };
  }
};

export const GuestDetailsDrawer = ({
  open,
  onOpenChange,
  guest,
  activity,
  readinessStatus,
  contributionsEnabled,
  isArchived = false,
  eventId,
  eventName,
  onEdit,
  onDelete,
  onUpdateRsvp,
}: GuestDetailsDrawerProps) => {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sendingRsvpReminder, setSendingRsvpReminder] = useState(false);
  const [sendingPaymentReminder, setSendingPaymentReminder] = useState(false);

  if (!guest) return null;

  const statusConfig = getStatusConfig(guest.rsvp_status);
  const rsvpReminderCheck = canSendRsvpReminder(guest.id);
  const paymentReminderCheck = canSendPaymentReminder(guest.id);
  const lastRsvpReminder = getLastRsvpReminderDate(guest.id);
  const additionalGuestCount = guest.additional_guests?.length || 0;
  const isPlusOne = guest.source === 'plus_one';
  const hasPhone = !!guest.guest_phone;

  const handleSendRsvpReminder = async () => {
    if (!rsvpReminderCheck.allowed || isArchived || !hasPhone) {
      if (!hasPhone) {
        toast({
          title: "Cannot send reminder",
          description: "No phone number available for this guest",
          variant: "destructive"
        });
        return;
      }
      toast({
        title: "Cooldown Active",
        description: `You can remind this guest again in ${formatDaysRemaining(rsvpReminderCheck.daysRemaining || 0)}`,
        variant: "destructive"
      });
      return;
    }
    
    setSendingRsvpReminder(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-payment-reminder', {
        body: {
          claim_id: guest.id,
          event_id: eventId,
          contributor_name: guest.guest_name,
          contributor_phone: guest.guest_phone,
          country_code: guest.country_code || 'US',
          event_name: eventName,
          host_name: 'Host'
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      recordRsvpReminderSent(guest.id);
      toast({
        title: "Reminder Sent",
        description: `RSVP reminder sent to ${guest.guest_name}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to send reminder",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setSendingRsvpReminder(false);
    }
  };

  const handleSendPaymentReminder = async () => {
    if (!paymentReminderCheck.allowed || isArchived || !hasPhone) {
      if (!hasPhone) {
        toast({
          title: "Cannot send reminder",
          description: "No phone number available for this guest",
          variant: "destructive"
        });
        return;
      }
      toast({
        title: "Cooldown Active",
        description: `You can remind this guest again in ${formatDaysRemaining(paymentReminderCheck.daysRemaining || 0)}`,
        variant: "destructive"
      });
      return;
    }
    
    setSendingPaymentReminder(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-payment-reminder', {
        body: {
          claim_id: guest.id,
          event_id: eventId,
          contributor_name: guest.guest_name,
          contributor_phone: guest.guest_phone,
          country_code: guest.country_code || 'US',
          event_name: eventName,
          host_name: 'Host'
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      recordPaymentReminderSent(guest.id);
      toast({
        title: "Reminder Sent",
        description: `Payment reminder sent to ${guest.guest_name}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to send reminder",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setSendingPaymentReminder(false);
    }
  };

  const content = (
    <div className="space-y-6 p-4">
      {/* Guest Header */}
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className={cn("text-lg font-medium", statusConfig.bgColor, statusConfig.color)}>
            {getInitials(guest.guest_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold truncate">{guest.guest_name}</h3>
              {isPlusOne && (
                <Badge variant="secondary" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  +1
                </Badge>
              )}
            </div>
            {!isArchived && (
              <Button variant="ghost" size="icon" className="flex-shrink-0" onClick={onEdit}>
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          {guest.guest_phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Phone className="h-3.5 w-3.5" />
              {formatPhoneNumber(guest.guest_phone, guest.country_code || 'US')}
            </div>
          )}
          {guest.guest_email && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{guest.guest_email}</span>
            </div>
          )}
          {additionalGuestCount > 0 && (
            <Badge variant="outline" className="mt-2">
              +{additionalGuestCount} additional guest{additionalGuestCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* RSVP Status Management */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">RSVP Status</h4>
        <div className="flex flex-wrap gap-2">
          {(['attending', 'maybe', 'not_attending', 'no_response'] as const).map(status => {
            const config = getStatusConfig(status);
            const isActive = guest.rsvp_status === status;
            return (
              <Button
                key={status}
                variant={isActive ? "default" : "outline"}
                size="sm"
                className={cn("h-9", isActive && config.bgColor)}
                onClick={() => onUpdateRsvp(status)}
              >
                <config.icon className={cn("h-4 w-4 mr-1.5", isActive ? "text-inherit" : config.color)} />
                {config.label}
              </Button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Activity Overview */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Activity</h4>
        <div className="space-y-2">
          {activity.claimedItems.length > 0 ? (
            <div className="flex items-start gap-2">
              <Package className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">Claimed:</span>{' '}
                {activity.claimedItems.map(i => `${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ''}`).join(', ')}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              No items claimed
            </div>
          )}

          {activity.hasContributed ? (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm">
                <span className="font-medium">Contributed:</span> ${activity.contributionAmount}
              </span>
            </div>
          ) : contributionsEnabled ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              No contribution yet
            </div>
          ) : null}

          {(guest.dietary_preferences?.length || 0) > 0 || guest.dietary_allergy ? (
            <div className="flex items-start gap-2">
              <Leaf className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">Dietary:</span>{' '}
                {[...(guest.dietary_preferences || []), guest.dietary_allergy].filter(Boolean).join(', ')}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Leaf className="h-4 w-4" />
              No dietary info
            </div>
          )}

          {/* Status flags */}
          {readinessStatus === 'needs_rsvp' && activity.claimedItems.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              Claimed items but hasn't RSVP'd
            </div>
          )}
          {guest.rsvp_status === 'attending' && (guest.dietary_preferences?.length || 0) === 0 && !guest.dietary_allergy && (
            <div className="flex items-center gap-2 text-sm text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              Going but missing dietary info
            </div>
          )}
        </div>
      </div>

      {/* Host Notes */}
      {guest.message && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Host Notes (private)</h4>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
              {guest.message}
            </p>
          </div>
        </>
      )}

      {/* Timeline */}
      <Separator />
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Timeline</h4>
        <div className="space-y-1 text-sm text-muted-foreground">
          <p>• RSVP'd {formatDistanceToNow(new Date(guest.created_at), { addSuffix: true })}</p>
          {guest.updated_at !== guest.created_at && (
            <p>• Updated {formatDistanceToNow(new Date(guest.updated_at), { addSuffix: true })}</p>
          )}
          {lastRsvpReminder && (
            <p>• Last reminder {formatDistanceToNow(lastRsvpReminder, { addSuffix: true })}</p>
          )}
        </div>
      </div>

      <Separator />

      {/* Actions */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium">Actions</h4>
        <div className="flex flex-col gap-2">
          <Button 
            variant="outline" 
            className="justify-start h-11"
            onClick={handleSendRsvpReminder}
            disabled={!rsvpReminderCheck.allowed}
          >
            <Bell className="h-4 w-4 mr-2" />
            Send RSVP Reminder
            {!rsvpReminderCheck.allowed && (
              <span className="ml-auto text-xs text-muted-foreground">
                {formatDaysRemaining(rsvpReminderCheck.daysRemaining || 0)} left
              </span>
            )}
          </Button>

          {contributionsEnabled && (
            <Button 
              variant="outline" 
              className="justify-start h-11"
              onClick={handleSendPaymentReminder}
              disabled={!paymentReminderCheck.allowed}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Send Payment Reminder
              {!paymentReminderCheck.allowed && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {formatDaysRemaining(paymentReminderCheck.daysRemaining || 0)} left
                </span>
              )}
            </Button>
          )}

          <Button 
            variant="ghost" 
            className="justify-start h-11 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove Guest
          </Button>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Guest?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {guest.guest_name}'s RSVP. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Guest Details</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto pb-safe">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[450px] overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>Guest Details</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
};
