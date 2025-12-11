import { useNavigate } from "react-router-dom";
import { 
  Clock, Calendar, TrendingUp, Bell, Package, CheckSquare, 
  AlertTriangle, MoreHorizontal, Check, Archive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { SmartNotification } from "@/hooks/useSmartNotifications";

interface SmartNotificationItemProps {
  notification: SmartNotification;
  onDismiss: (id: string, duration: "session" | "day" | "permanent") => void;
}

const iconMap: Record<SmartNotification["type"], React.ElementType> = {
  rsvp_deadline_approaching: Clock,
  event_starting_soon: Calendar,
  event_tomorrow: Calendar,
  low_rsvp_warning: TrendingUp,
  high_activity_burst: Bell,
  items_not_setup: Package,
  tasks_stalled: CheckSquare,
  event_recently_updated: Bell,
  post_event_wrapup: Archive,
};

const priorityColors: Record<number, string> = {
  1: "border-l-destructive",
  2: "border-l-amber-500",
  3: "border-l-blue-500",
};

export function SmartNotificationItem({ notification, onDismiss }: SmartNotificationItemProps) {
  const navigate = useNavigate();
  const Icon = iconMap[notification.type] || AlertTriangle;
  
  const handleAction = () => {
    navigate(notification.actionRoute);
    onDismiss(notification.id, "session");
  };
  
  return (
    <div 
      className={cn(
        "p-3 rounded-lg border border-l-4 bg-card hover:bg-muted/50 transition-colors",
        priorityColors[notification.priority]
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "p-2 rounded-full shrink-0",
          notification.priority === 1 ? "bg-destructive/10 text-destructive" :
          notification.priority === 2 ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" :
          "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        )}>
          <Icon className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-medium text-sm">{notification.title}</h4>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
            </span>
          </div>
          
          {notification.eventName && (
            <p className="text-sm text-primary font-medium mt-0.5">
              {notification.eventName}
            </p>
          )}
          
          <p className="text-sm text-muted-foreground mt-1">
            {notification.message}
          </p>
          
          <div className="flex items-center gap-2 mt-3">
            <Button 
              size="sm" 
              variant="secondary"
              className="h-8 text-xs"
              onClick={handleAction}
            >
              {notification.actionLabel}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onDismiss(notification.id, "session")}>
                  <Check className="h-4 w-4 mr-2" />
                  Dismiss
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDismiss(notification.id, "day")}>
                  <Clock className="h-4 w-4 mr-2" />
                  Dismiss for today
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDismiss(notification.id, "permanent")}>
                  <Archive className="h-4 w-4 mr-2" />
                  Don't show again
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
