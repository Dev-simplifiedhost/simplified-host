import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Package, 
  Leaf, 
  X,
  Bell
} from "lucide-react";
import { differenceInDays } from "date-fns";
import { GuestData } from "./GuestCard";

interface GuestSmartBannerProps {
  guests: GuestData[];
  eventDate: string | null;
  onSendReminders: (guestIds: string[]) => void;
  onSuggestItems: () => void;
}

interface BannerConfig {
  id: string;
  icon: typeof Clock;
  message: string;
  action: string;
  onClick: () => void;
  priority: number;
}

export const GuestSmartBanner = ({ 
  guests, 
  eventDate, 
  onSendReminders,
  onSuggestItems 
}: GuestSmartBannerProps) => {
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());

  const noResponseGuests = guests.filter(g => 
    g.rsvp_status === 'no_response' || !g.rsvp_status
  );
  
  const goingGuests = guests.filter(g => g.rsvp_status === 'attending');
  
  const guestsWithDietary = guests.filter(g => 
    (g.dietary_preferences?.length || 0) > 0 || g.dietary_allergy
  );

  // Calculate days until event
  let daysUntilEvent: number | null = null;
  if (eventDate) {
    const eventDateObj = new Date(eventDate);
    daysUntilEvent = differenceInDays(eventDateObj, new Date());
  }

  const banners: BannerConfig[] = [];

  // Event proximity + no response banner
  if (daysUntilEvent !== null && daysUntilEvent > 0 && daysUntilEvent <= 7 && noResponseGuests.length > 0) {
    banners.push({
      id: 'event-proximity',
      icon: Clock,
      message: `${daysUntilEvent} day${daysUntilEvent !== 1 ? 's' : ''} until event — ${noResponseGuests.length} guest${noResponseGuests.length !== 1 ? 's' : ''} haven't responded.`,
      action: 'Send Reminders',
      onClick: () => onSendReminders(noResponseGuests.map(g => g.id)),
      priority: 1
    });
  }

  // Going but no items claimed banner (only if we have item claiming data)
  // This would require activity data passed in - simplified for now
  if (goingGuests.length >= 3) {
    banners.push({
      id: 'suggest-items',
      icon: Package,
      message: `${goingGuests.length} guests are Going. Consider adding items for them to claim.`,
      action: 'View Items',
      onClick: onSuggestItems,
      priority: 3
    });
  }

  // Dietary restrictions banner
  if (guestsWithDietary.length >= 2) {
    banners.push({
      id: 'dietary-info',
      icon: Leaf,
      message: `${guestsWithDietary.length} guests have dietary restrictions.`,
      action: 'View Details',
      onClick: () => {},
      priority: 4
    });
  }

  // No response guests (general reminder)
  if (noResponseGuests.length > 0 && (daysUntilEvent === null || daysUntilEvent > 7)) {
    banners.push({
      id: 'no-response',
      icon: Bell,
      message: `${noResponseGuests.length} guest${noResponseGuests.length !== 1 ? 's' : ''} haven't responded yet.`,
      action: 'Send Reminders',
      onClick: () => onSendReminders(noResponseGuests.map(g => g.id)),
      priority: 2
    });
  }

  // Sort by priority and filter dismissed
  const visibleBanners = banners
    .filter(b => !dismissedBanners.has(b.id))
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 2); // Show max 2 banners

  const dismissBanner = (id: string) => {
    setDismissedBanners(prev => new Set([...prev, id]));
  };

  if (visibleBanners.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleBanners.map(banner => {
        const Icon = banner.icon;
        return (
          <Alert key={banner.id} className="relative bg-muted/50 border-primary/20">
            <div className="flex items-start gap-3">
              <Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <AlertDescription className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-sm">{banner.message}</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-8 text-xs w-fit"
                  onClick={banner.onClick}
                >
                  {banner.action}
                </Button>
              </AlertDescription>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 absolute top-2 right-2"
                onClick={() => dismissBanner(banner.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </Alert>
        );
      })}
    </div>
  );
};
