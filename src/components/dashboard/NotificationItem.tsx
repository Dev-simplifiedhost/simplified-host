import { DollarSign, MessageSquare, MessageCircle, Circle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { haptics } from "@/lib/haptics";
import type { Notification } from "@/hooks/useNotifications";

interface NotificationItemProps {
  notification: Notification;
  onQuickAction: (notification: Notification) => void;
  onMarkAsRead: (id: string) => void;
  onMarkAsUnread: (id: string) => void;
}

export function NotificationItem({
  notification,
  onQuickAction,
  onMarkAsRead,
  onMarkAsUnread,
}: NotificationItemProps) {
  const getIcon = () => {
    switch (notification.notification_type) {
      case "payment_pending":
        return <DollarSign className="h-5 w-5 text-green-600" />;
      case "new_message":
        return <MessageSquare className="h-5 w-5 text-blue-600" />;
      case "new_comment":
        return <MessageCircle className="h-5 w-5 text-purple-600" />;
      case "item_released":
        return <Package className="h-5 w-5 text-orange-600" />;
      default:
        return <Circle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTitle = () => {
    switch (notification.notification_type) {
      case "payment_pending":
        return `Payment from ${notification.metadata.contributor_name}`;
      case "new_message":
        return `Message from ${notification.metadata.sender_name}`;
      case "new_comment":
        return `Comment by ${notification.metadata.commenter_name}`;
      case "item_released":
        return `RSVP Changed - Items Released`;
      default:
        return "Notification";
    }
  };

  const getActionLabel = () => {
    switch (notification.notification_type) {
      case "payment_pending":
        return "Verify";
      case "new_message":
        return "Reply";
      case "new_comment":
        return "Review";
      case "item_released":
        return null; // No action needed for item releases
      default:
        return "View";
    }
  };

  const getMessage = () => {
    if (notification.notification_type === "item_released") {
      const { guest_name, rsvp_status } = notification.metadata;
      return `${guest_name} changed RSVP to "${rsvp_status === "cant_go" ? "Can't Go" : "Not Responded"}" — item contributions released`;
    }
    return notification.metadata.preview;
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors",
        !notification.is_read && "bg-accent/20 border-primary/20"
      )}
    >
      {/* Priority indicator */}
      {notification.priority <= 2 && !notification.is_read && (
        <Circle className="h-2 w-2 fill-red-500 text-red-500 mt-2 flex-shrink-0" />
      )}

      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{getTitle()}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {notification.metadata.event_name}
            </p>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>

        {/* Preview text */}
        {(notification.metadata.preview || notification.notification_type === "item_released") && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
            {getMessage()}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          {getActionLabel() && (
            <Button
              size="sm"
              variant="default"
              className="h-10 md:h-8"
              onClick={() => {
                haptics.light();
                onQuickAction(notification);
              }}
            >
              {getActionLabel()}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-10 md:h-8"
            onClick={() => {
              haptics.selection();
              notification.is_read
                ? onMarkAsUnread(notification.id)
                : onMarkAsRead(notification.id);
            }}
          >
            {notification.is_read ? "Mark unread" : "Mark read"}
          </Button>
        </div>
      </div>
    </div>
  );
}
