import { Card, CardContent } from "@/components/ui/card";
import { UserCheck, UserX, HelpCircle, Calendar } from "lucide-react";

interface RSVPKPIProps {
  title: string;
  event: any;
  userRsvp: any;
  isLoading?: boolean;
  onClick?: () => void;
}

export const RSVPKPI = ({ title, event, userRsvp, isLoading, onClick }: RSVPKPIProps) => {
  const getStatusIcon = () => {
    if (!userRsvp) return Calendar;
    
    switch (userRsvp.rsvp_status) {
      case "attending":
        return UserCheck;
      case "cant_go":
        return UserX;
      case "maybe":
        return HelpCircle;
      default:
        return Calendar;
    }
  };

  const getStatusText = () => {
    if (!userRsvp) return "Not responded yet";
    
    switch (userRsvp.rsvp_status) {
      case "attending":
        return "You're attending!";
      case "cant_go":
        return "Can't make it";
      case "maybe":
        return "Maybe attending";
      case "not_responded":
        return "Not responded yet";
      default:
        return "Update your RSVP";
    }
  };

  const getStatusColor = () => {
    if (!userRsvp) return "text-muted-foreground";
    
    switch (userRsvp.rsvp_status) {
      case "attending":
        return "text-green-600 dark:text-green-400";
      case "cant_go":
        return "text-red-600 dark:text-red-400";
      case "maybe":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-muted-foreground";
    }
  };

  const StatusIcon = getStatusIcon();
  const isDeadlinePassed = event.rsvp_deadline && new Date(event.rsvp_deadline) < new Date();

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <div className="space-y-3 animate-pulse">
            <div className="flex items-start justify-between mb-3">
              <div className="h-5 bg-muted rounded w-24" />
              <div className="h-5 w-5 bg-muted rounded" />
            </div>
            <div className="h-4 bg-muted rounded w-32" />
            <div className="h-3 bg-muted rounded w-40" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer border-border/50"
      onClick={isLoading ? undefined : onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <StatusIcon className={`h-5 w-5 ${getStatusColor()}`} />
        </div>
        
        <div className="space-y-2">
          <p className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </p>
          
          {event.rsvp_deadline && (
            <p className="text-xs text-muted-foreground">
              Deadline: {new Date(event.rsvp_deadline).toLocaleDateString()}
              {isDeadlinePassed && " (Passed)"}
            </p>
          )}
          
          <div className="pt-2">
            <span className="text-xs font-medium text-primary">
              {userRsvp ? "Update RSVP →" : "RSVP now →"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
