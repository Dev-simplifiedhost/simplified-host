import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, AlertTriangle, Clock, Calendar, TrendingUp, Package, CheckSquare, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SmartNotification } from "@/hooks/useSmartNotifications";

interface SmartBannerProps {
  notifications: SmartNotification[];
  onDismiss: (id: string, duration: "session" | "day" | "permanent") => void;
  className?: string;
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
  post_event_wrapup: Calendar,
};

const priorityStyles: Record<number, string> = {
  1: "bg-destructive/10 border-destructive/30 text-destructive",
  2: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200",
  3: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200",
};

export function SmartBanner({ notifications, onDismiss, className }: SmartBannerProps) {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Only show priority 1 and 2 notifications in banner
  const bannerNotifications = notifications.filter(n => n.priority <= 2);
  
  if (bannerNotifications.length === 0) return null;
  
  const notification = bannerNotifications[currentIndex % bannerNotifications.length];
  const Icon = iconMap[notification.type] || AlertTriangle;
  
  const handleAction = () => {
    navigate(notification.actionRoute);
  };
  
  const handleDismiss = () => {
    onDismiss(notification.id, "session");
    // Move to next notification
    if (bannerNotifications.length > 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };
  
  const handleDismissForDay = () => {
    onDismiss(notification.id, "day");
    if (bannerNotifications.length > 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };
  
  return (
    <div 
      className={cn(
        "border rounded-lg p-3 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300",
        priorityStyles[notification.priority],
        className
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {notification.message}
        </p>
        {bannerNotifications.length > 1 && (
          <p className="text-xs opacity-70 mt-0.5">
            {currentIndex % bannerNotifications.length + 1} of {bannerNotifications.length} alerts
          </p>
        )}
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <Button 
          size="sm" 
          variant="secondary"
          className="h-8 text-xs"
          onClick={handleAction}
        >
          {notification.actionLabel}
        </Button>
        
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 opacity-70 hover:opacity-100"
          onClick={handleDismiss}
          title="Dismiss for now"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Compact version for mobile
export function SmartBannerCompact({ notifications, onDismiss, className }: SmartBannerProps) {
  const navigate = useNavigate();
  
  const bannerNotifications = notifications.filter(n => n.priority <= 2);
  
  if (bannerNotifications.length === 0) return null;
  
  const notification = bannerNotifications[0];
  const Icon = iconMap[notification.type] || AlertTriangle;
  
  return (
    <div 
      className={cn(
        "border rounded-lg p-2 flex items-center gap-2 text-sm",
        priorityStyles[notification.priority],
        className
      )}
      onClick={() => navigate(notification.actionRoute)}
      role="button"
      tabIndex={0}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate text-xs font-medium">
        {notification.title}: {notification.eventName || notification.message}
      </span>
      {bannerNotifications.length > 1 && (
        <span className="text-xs opacity-70">+{bannerNotifications.length - 1}</span>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 opacity-70"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(notification.id, "session");
        }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
