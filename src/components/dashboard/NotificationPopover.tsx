import { Bell, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { NotificationDashboard } from "./NotificationDashboard";
import { useNotifications } from "@/hooks/useNotifications";
import { useSmartNotifications } from "@/hooks/useSmartNotifications";
import { useNotificationDismissals } from "@/hooks/useNotificationDismissals";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface NotificationPopoverProps {
  events?: any[];
}

export function NotificationPopover({ events = [] }: NotificationPopoverProps) {
  const { pendingPaymentsCount, unreadMessagesCount, newCommentsCount } = useNotifications();
  const { getDismissedIds } = useNotificationDismissals();
  const smartNotifications = useSmartNotifications(events, [], getDismissedIds());
  
  const dbUnread = pendingPaymentsCount + unreadMessagesCount + newCommentsCount;
  const smartCount = smartNotifications.filter(n => n.priority <= 2).length;
  const totalUnread = dbUnread + smartCount;
  const hasUrgent = smartNotifications.some(n => n.priority === 1);
  
  const isMobile = useIsMobile();

  const triggerButton = (
    <Button 
      variant="ghost" 
      size="sm" 
      className={cn(
        "relative gap-2 h-9",
        hasUrgent && "animate-pulse"
      )}
    >
      <Bell className="h-4 w-4" />
      <span>Notifications</span>
      {totalUnread > 0 && (
        <Badge 
          variant={hasUrgent ? "destructive" : "secondary"} 
          className="h-5 px-1.5 text-xs ml-1"
        >
          {totalUnread}
        </Badge>
      )}
      {smartCount > 0 && (
        <Sparkles className="h-3 w-3 text-amber-500 absolute -top-1 -right-1" />
      )}
    </Button>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          {triggerButton}
        </DrawerTrigger>
        <DrawerContent className="h-[85vh]">
          <DrawerHeader className="border-b">
            <DrawerTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
              {totalUnread > 0 && (
                <Badge variant={hasUrgent ? "destructive" : "secondary"} className="h-5 px-2 text-xs">
                  {totalUnread}
                </Badge>
              )}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden">
            <NotificationDashboard events={events} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent 
        className="w-[420px] p-0" 
        align="end"
        sideOffset={8}
      >
        <NotificationDashboard events={events} />
      </PopoverContent>
    </Popover>
  );
}
