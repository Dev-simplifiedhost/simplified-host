import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar, MapPin, Clock, UserPlus, Package, Send, Pencil, Eye } from "lucide-react";

interface EventSummaryCardProps {
  event: {
    name: string;
    event_date: string | null;
    start_time?: string | null;
    end_time?: string | null;
    location?: string | null;
    is_draft?: boolean;
    is_archived?: boolean;
    event_code?: string;
  };
  daysUntilEvent: number | null;
  onAddGuest?: () => void;
  onAddItem?: () => void;
  onShareEvent?: () => void;
  onEditEvent?: () => void;
  onPreviewPublicPage?: () => void;
  showQuickActions?: boolean;
}

export function EventSummaryCard({
  event,
  daysUntilEvent,
  onAddGuest,
  onAddItem,
  onShareEvent,
  onEditEvent,
  onPreviewPublicPage,
  showQuickActions = false,
}: EventSummaryCardProps) {
  const formatDateTime = () => {
    if (!event.event_date) return "Date TBA";
    
    const date = new Date(event.event_date);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    };
    
    let dateStr = date.toLocaleDateString("en-US", options);
    
    if (event.start_time) {
      const formatTime = (time: string) => {
        const [hours, minutes] = time.split(":");
        const h = parseInt(hours);
        const ampm = h >= 12 ? "PM" : "AM";
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
      };
      
      dateStr += ` • ${formatTime(event.start_time)}`;
      
      if (event.end_time) {
        dateStr += ` - ${formatTime(event.end_time)}`;
      }
      
      // Add timezone
      const tzAbbr = new Intl.DateTimeFormat("en-US", { timeZoneName: "short" })
        .formatToParts(date)
        .find((p) => p.type === "timeZoneName")?.value;
      if (tzAbbr) {
        dateStr += ` ${tzAbbr}`;
      }
    }
    
    return dateStr;
  };

  const getDaysUntilLabel = () => {
    if (daysUntilEvent === null) return null;
    if (daysUntilEvent === 0) return "Today!";
    if (daysUntilEvent === 1) return "Tomorrow!";
    if (daysUntilEvent < 0) return `${Math.abs(daysUntilEvent)} days ago`;
    if (daysUntilEvent <= 7) return `In ${daysUntilEvent} days`;
    if (daysUntilEvent <= 30) {
      const weeks = Math.floor(daysUntilEvent / 7);
      return `In ${weeks} week${weeks > 1 ? "s" : ""}`;
    }
    const months = Math.floor(daysUntilEvent / 30);
    return `In ${months} month${months > 1 ? "s" : ""}`;
  };

  const getStatusBadge = () => {
    if (event.is_draft) {
      return <Badge variant="secondary">Draft</Badge>;
    }
    if (event.is_archived) {
      return <Badge variant="outline">Archived</Badge>;
    }
    return <Badge className="bg-green-600 hover:bg-green-700">Live</Badge>;
  };

  const daysLabel = getDaysUntilLabel();

  const quickActions = [
    { icon: UserPlus, label: "Add Guest", onClick: onAddGuest },
    { icon: Package, label: "Add Item", onClick: onAddItem },
    { icon: Send, label: "Share Event", onClick: onShareEvent },
    { icon: Eye, label: "Preview", onClick: onPreviewPublicPage },
    { icon: Pencil, label: "Edit Event", onClick: onEditEvent },
  ];

  return (
    <Card className="overflow-hidden bg-white shadow-[0_2px_6px_rgba(0,0,0,0.06)]">
      <CardContent className="p-3 md:p-4 lg:p-6">
        {/* Header with title and status */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-lg md:text-xl font-semibold truncate flex-1">
            {event.name}
          </h2>
          {getStatusBadge()}
        </div>

        {/* Metadata block - tighter spacing */}
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2 text-[#5E625E]">
            <Calendar className="h-4 w-4 shrink-0 text-[#6B6F6B]" />
            <span>{formatDateTime()}</span>
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-[#5E625E]">
              <MapPin className="h-4 w-4 shrink-0 text-[#6B6F6B]" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {daysLabel && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-[#142E26]" />
              <span className="font-medium text-[#142E26]">{daysLabel}</span>
            </div>
          )}
        </div>

        {/* Quick Actions Row */}
        {showQuickActions && !event.is_archived && (
          <div className="mt-4 pt-3 border-t border-border/50">
            <div className="flex items-center justify-center gap-2">
              <TooltipProvider delayDuration={300}>
                {quickActions.map((action) => (
                  action.onClick && (
                    <Tooltip key={action.label}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={action.onClick}
                          className="h-10 w-10 rounded-full shrink-0 touch-manipulation"
                          aria-label={action.label}
                        >
                          <action.icon className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        <p>{action.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                ))}
              </TooltipProvider>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
