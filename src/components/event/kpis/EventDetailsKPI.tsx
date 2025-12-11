import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin, Clock } from "lucide-react";
import { format } from "date-fns";

interface EventDetailsKPIProps {
  title: string;
  event: any;
  onClick?: () => void;
}

export const EventDetailsKPI = ({ title, event, onClick }: EventDetailsKPIProps) => {
  const formatTimeTo12Hour = (timeString: string): string => {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${period}`;
  };

  const getTimezoneAbbreviation = (date: Date): string => {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(date);
    const timeZonePart = parts.find(part => part.type === 'timeZoneName');
    
    return timeZonePart ? timeZonePart.value : '';
  };

  const formatEventDateTime = () => {
    if (!event.event_date) return "Date TBA";
    
    const date = new Date(event.event_date);
    let dateStr = format(date, "MMM d, yyyy");
    
    if (event.start_time) {
      const formattedTime = formatTimeTo12Hour(event.start_time);
      const timezone = getTimezoneAbbreviation(date);
      dateStr += ` at ${formattedTime}${timezone ? ' ' + timezone : ''}`;
    }
    
    return dateStr;
  };

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer border-border/50"
      onClick={onClick}
    >
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <Calendar className="h-5 w-5 text-primary" />
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{formatEventDateTime()}</span>
          </div>
          
          {event.location && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{event.location}</span>
            </div>
          )}
          
          {event.end_time && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>Ends at {formatTimeTo12Hour(event.end_time)}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
