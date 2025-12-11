import { Calendar, MapPin, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";

interface EventInfoCompactProps {
  event: {
    event_date: string | null;
    start_time: string | null;
    end_time: string | null;
    is_all_day: boolean | null;
    location: string | null;
    description: string | null;
  };
}

export const EventInfoCompact = ({ event }: EventInfoCompactProps) => {
  const formatEventDateTime = () => {
    if (!event.event_date) return null;
    
    const date = parseISO(event.event_date);
    const dateStr = format(date, "EEEE, MMMM d, yyyy");
    
    if (event.is_all_day) {
      return `${dateStr} (All Day)`;
    }
    
    if (event.start_time) {
      const [hours, minutes] = event.start_time.split(':').map(Number);
      const timeDate = new Date();
      timeDate.setHours(hours, minutes);
      const timeStr = format(timeDate, "h:mm a");
      
      // Get timezone abbreviation
      const tzAbbrev = new Date().toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop();
      
      let fullStr = `${dateStr} at ${timeStr} ${tzAbbrev}`;
      
      if (event.end_time) {
        const [endHours, endMinutes] = event.end_time.split(':').map(Number);
        const endTimeDate = new Date();
        endTimeDate.setHours(endHours, endMinutes);
        const endTimeStr = format(endTimeDate, "h:mm a");
        fullStr += ` → ${endTimeStr}`;
      }
      
      return fullStr;
    }
    
    return dateStr;
  };

  const dateTime = formatEventDateTime();
  const hasContent = dateTime || event.location || event.description;

  if (!hasContent) return null;

  return (
    <div className="space-y-2.5 py-3">
      <h3 className="text-base font-medium text-foreground">Event Info</h3>
      
      <div className="space-y-2">
        {dateTime && (
          <div className="flex items-start gap-2.5">
            <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-sm text-foreground">{dateTime}</span>
          </div>
        )}
        
        {event.location && (
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-sm text-foreground">{event.location}</span>
          </div>
        )}
        
        {event.description && (
          <div className="flex items-start gap-2.5">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {event.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};