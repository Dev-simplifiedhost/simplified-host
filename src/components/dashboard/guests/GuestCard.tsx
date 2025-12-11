import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Clock,
  DollarSign, 
  Package, 
  AlertTriangle,
  Users,
  Leaf,
  Wheat
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface GuestData {
  id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  country_code: string | null;
  rsvp_status: 'attending' | 'maybe' | 'not_attending' | 'no_response';
  message: string | null;
  additional_guests: any[] | null;
  created_at: string;
  updated_at: string;
  dietary_preferences?: string[] | null;
  dietary_other?: string | null;
  dietary_allergy?: string | null;
  source?: string | null;
}

export interface GuestActivity {
  claimedItems: { name: string; quantity: number }[];
  contributionAmount: number;
  hasContributed: boolean;
}

export type ReadinessStatus = 'ready' | 'needs_rsvp' | 'needs_item' | 'needs_info';

interface GuestCardProps {
  guest: GuestData;
  activity: GuestActivity;
  readinessStatus: ReadinessStatus;
  onClick: () => void;
}

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'attending':
      return { 
        icon: CheckCircle2, 
        label: 'Going', 
        color: 'text-green-600',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        borderColor: 'border-green-200 dark:border-green-800'
      };
    case 'maybe':
      return { 
        icon: HelpCircle, 
        label: 'Maybe', 
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        borderColor: 'border-yellow-200 dark:border-yellow-800'
      };
    case 'not_attending':
      return { 
        icon: XCircle, 
        label: 'Not Going', 
        color: 'text-red-600',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        borderColor: 'border-red-200 dark:border-red-800'
      };
    default:
      return { 
        icon: Clock, 
        label: 'No Response', 
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        borderColor: 'border-border'
      };
  }
};

const getReadinessConfig = (status: ReadinessStatus) => {
  switch (status) {
    case 'ready':
      return { label: 'Ready', color: 'text-green-600', icon: CheckCircle2 };
    case 'needs_rsvp':
      return { label: 'Needs RSVP', color: 'text-yellow-600', icon: AlertTriangle };
    case 'needs_item':
      return { label: 'No Claims', color: 'text-blue-600', icon: Package };
    case 'needs_info':
      return { label: 'Missing Info', color: 'text-orange-600', icon: AlertTriangle };
    default:
      return null;
  }
};

const getDietaryIcon = (pref: string) => {
  const lower = pref.toLowerCase();
  if (lower.includes('vegetarian') || lower.includes('vegan')) return Leaf;
  if (lower.includes('gluten')) return Wheat;
  return null;
};

export const GuestCard = ({ guest, activity, readinessStatus, onClick }: GuestCardProps) => {
  const statusConfig = getStatusConfig(guest.rsvp_status);
  const readinessConfig = getReadinessConfig(readinessStatus);
  const StatusIcon = statusConfig.icon;
  const additionalGuestCount = guest.additional_guests?.length || 0;
  const hasDietary = (guest.dietary_preferences?.length || 0) > 0 || guest.dietary_allergy;

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.99]",
        "border-l-4",
        statusConfig.borderColor
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-11 w-11 flex-shrink-0">
            <AvatarFallback className={cn("text-sm font-medium", statusConfig.bgColor, statusConfig.color)}>
              {getInitials(guest.guest_name)}
            </AvatarFallback>
          </Avatar>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Name & Status Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium truncate">{guest.guest_name}</span>
                {additionalGuestCount > 0 && (
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    <Users className="h-3 w-3 mr-1" />
                    +{additionalGuestCount}
                  </Badge>
                )}
              </div>
              <Badge 
                variant="secondary" 
                className={cn("text-xs flex-shrink-0", statusConfig.bgColor, statusConfig.color)}
                aria-label={`RSVP status: ${statusConfig.label}`}
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>

            {/* Activity Indicators */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {/* Claimed Items */}
              {activity.claimedItems.length > 0 && (
                <Badge variant="outline" className="text-xs bg-background">
                  <Package className="h-3 w-3 mr-1 text-primary" />
                  {activity.claimedItems.length} item{activity.claimedItems.length !== 1 ? 's' : ''}
                </Badge>
              )}

              {/* Contribution */}
              {activity.hasContributed && (
                <Badge variant="outline" className="text-xs bg-background">
                  <DollarSign className="h-3 w-3 mr-1 text-green-600" />
                  ${activity.contributionAmount}
                </Badge>
              )}

              {/* Dietary Icons */}
              {hasDietary && (
                <Badge variant="outline" className="text-xs bg-background">
                  <Leaf className="h-3 w-3 text-green-600" />
                  {guest.dietary_allergy && (
                    <span className="ml-1 text-destructive">!</span>
                  )}
                </Badge>
              )}

              {/* Readiness Status */}
              {readinessConfig && readinessStatus !== 'ready' && (
                <Badge variant="outline" className={cn("text-xs", readinessConfig.color)}>
                  <readinessConfig.icon className="h-3 w-3 mr-1" />
                  {readinessConfig.label}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
