import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, HelpCircle, XCircle, Loader2, ChevronRight } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import { cn } from "@/lib/utils";

interface RSVPCompactProps {
  userRsvp: any | null;
  isLoading: boolean;
  rsvpDeadline: string | null;
  maxAttendees: number | null;
  currentAttendees?: number;
  onOpenRsvp: () => void;
}

export const RSVPCompact = ({
  userRsvp,
  isLoading,
  rsvpDeadline,
  maxAttendees,
  currentAttendees = 0,
  onOpenRsvp,
}: RSVPCompactProps) => {
  const isDeadlinePassed = rsvpDeadline ? isPast(parseISO(rsvpDeadline)) : false;
  const isEventFull = maxAttendees ? currentAttendees >= maxAttendees : false;

  const getStatusDisplay = () => {
    if (!userRsvp) return null;
    
    const status = userRsvp.rsvp_status;
    const additionalGuests = userRsvp.additional_guests;
    const guestCount = Array.isArray(additionalGuests) ? additionalGuests.length : 0;
    
    switch (status) {
      case 'attending':
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          label: guestCount > 0 ? `Going +${guestCount}` : 'Going',
          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
        };
      case 'maybe':
        return {
          icon: <HelpCircle className="h-4 w-4" />,
          label: guestCount > 0 ? `Maybe +${guestCount}` : 'Maybe',
          className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
        };
      case 'not_attending':
        return {
          icon: <XCircle className="h-4 w-4" />,
          label: "Can't Go",
          className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        };
      default:
        return null;
    }
  };

  const statusDisplay = getStatusDisplay();
  const canRsvp = !isDeadlinePassed && !isEventFull;

  return (
    <div className="py-3">
      <button
        onClick={onOpenRsvp}
        disabled={!canRsvp && !userRsvp}
        className={cn(
          "w-full rounded-lg border border-border/30 bg-muted/20 p-3 text-left transition-colors",
          (canRsvp || userRsvp) && "hover:bg-muted/30 cursor-pointer",
          (!canRsvp && !userRsvp) && "opacity-60 cursor-not-allowed"
        )}
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-[13px]">Loading...</span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-medium text-foreground">Your RSVP</h3>
              
              {userRsvp ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[12px] font-medium",
                    statusDisplay?.className
                  )}>
                    {statusDisplay?.icon}
                    {statusDisplay?.label}
                  </span>
                  <span className="text-[12px] text-muted-foreground">Tap to edit</span>
                </div>
              ) : isDeadlinePassed ? (
                <p className="text-[13px] text-muted-foreground mt-0.5">RSVP deadline has passed</p>
              ) : isEventFull ? (
                <p className="text-[13px] text-muted-foreground mt-0.5">Event is at capacity</p>
              ) : (
                <p className="text-[13px] text-muted-foreground mt-0.5">Tap to respond</p>
              )}
            </div>
            
            {(canRsvp || userRsvp) && (
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
          </div>
        )}
        
        {rsvpDeadline && !isDeadlinePassed && !userRsvp && (
          <p className="text-[11px] text-muted-foreground mt-2">
            RSVP by {format(parseISO(rsvpDeadline), "MMM d, yyyy")}
          </p>
        )}
      </button>
    </div>
  );
};
