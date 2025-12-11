import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Package, 
  CheckSquare, 
  DollarSign, 
  Megaphone, 
  Edit, 
  Share2, 
  ChevronRight,
  Clock,
  Smartphone,
  X
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { PaymentEducationModal } from "./PaymentEducationModal";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { InstallInstructionsModal } from "@/components/install";

interface OverviewTabProps {
  event: {
    id: string;
    name: string;
    event_date: string | null;
    location: string | null;
    contributions_enabled: boolean;
    contribution_goal: number | null;
  };
  metrics: {
    totalGuests: number;
    attending: number;
    notAttending: number;
    maybe: number;
    noResponse: number;
    totalItems: number;
    coveredItems: number;
    totalTasks: number;
    completedTasks: number;
    stripeContributions: number;
    manualContributions: number;
    contributorCount: number;
  };
  announcements: Array<{
    id: string;
    title: string | null;
    message: string;
    created_at: string;
  }>;
  onNavigateToTab: (tab: string) => void;
  onEditEvent: () => void;
  onShareEvent: () => void;
}

export const OverviewTab = ({
  event,
  metrics,
  announcements,
  onNavigateToTab,
  onEditEvent,
  onShareEvent,
}: OverviewTabProps) => {
  const [educationModalOpen, setEducationModalOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [dayOfTipDismissed, setDayOfTipDismissed] = useState(false);
  
  const { isMobile, isInstalled, isDayOfTipDismissed, dismissDayOfTip } = useInstallPrompt();

  const eventDate = event.event_date ? new Date(event.event_date) : null;
  const daysUntil = eventDate ? differenceInDays(eventDate, new Date()) : null;
  const totalContributions = metrics.stripeContributions + metrics.manualContributions;
  const contributionProgress = event.contribution_goal 
    ? Math.min((totalContributions / event.contribution_goal) * 100, 100) 
    : 0;
  const itemsProgress = metrics.totalItems > 0 
    ? (metrics.coveredItems / metrics.totalItems) * 100 
    : 0;
  const tasksProgress = metrics.totalTasks > 0 
    ? (metrics.completedTasks / metrics.totalTasks) * 100 
    : 0;

  // Check if should show day-of tip
  const showDayOfTip = daysUntil === 0 && isMobile && !isInstalled && !dayOfTipDismissed && !isDayOfTipDismissed();

  const handleDismissDayOfTip = () => {
    setDayOfTipDismissed(true);
    dismissDayOfTip();
  };

  return (
    <div className="space-y-4">
      {/* Day-of Event Install Tip */}
      {showDayOfTip && (
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg flex items-start gap-3">
          <Smartphone className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-foreground">
              Checking your event often today? Add SimplifiedHost to your home screen for one-tap access.
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              className="mt-2 h-9"
              onClick={() => setInstallModalOpen(true)}
            >
              <Smartphone className="h-3 w-3 mr-1" />
              Add Now
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 flex-shrink-0" 
            onClick={handleDismissDayOfTip}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      {/* Event Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <h2 className="text-xl font-bold">{event.name}</h2>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {eventDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  <span>{format(eventDate, 'EEEE, MMMM d, yyyy')}</span>
                  {daysUntil !== null && daysUntil >= 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days away`}
                    </Badge>
                  )}
                  {daysUntil !== null && daysUntil < 0 && (
                    <Badge variant="outline" className="ml-1">Past event</Badge>
                  )}
                </div>
              )}
              {event.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span>{event.location}</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-10" onClick={onEditEvent}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Event
              </Button>
              <Button variant="default" size="sm" className="h-10" onClick={onShareEvent}>
                <Share2 className="h-4 w-4 mr-2" />
                Share Invite
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RSVPs Card */}
      <Card 
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => onNavigateToTab('guests')}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              RSVPs
            </CardTitle>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge variant="default" className="bg-green-600">
              Going: {metrics.attending}
            </Badge>
            <Badge variant="destructive">
              Not Going: {metrics.notAttending}
            </Badge>
            <Badge variant="secondary">
              Maybe: {metrics.maybe}
            </Badge>
            <Badge variant="outline">
              No Response: {metrics.noResponse}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Items Card */}
      <Card 
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => onNavigateToTab('items-tasks')}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Items
            </CardTitle>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">
            {metrics.coveredItems} of {metrics.totalItems} items covered ({Math.round(itemsProgress)}%)
          </div>
          <Progress value={itemsProgress} className="h-2" />
        </CardContent>
      </Card>

      {/* Tasks Card */}
      <Card 
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => onNavigateToTab('items-tasks')}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Tasks
            </CardTitle>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground">
            {metrics.completedTasks} of {metrics.totalTasks} tasks complete ({Math.round(tasksProgress)}%)
          </div>
          <Progress value={tasksProgress} className="h-2" />
        </CardContent>
      </Card>

      {/* Contributions Card (if enabled) */}
      {event.contributions_enabled && (
        <Card 
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => onNavigateToTab('payments')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Contributions
              </CardTitle>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">${totalContributions.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">{metrics.contributorCount} contributors</span>
            </div>
            {metrics.stripeContributions > 0 || metrics.manualContributions > 0 ? (
              <div className="text-xs text-muted-foreground">
                ${metrics.stripeContributions.toFixed(2)} via Stripe · ${metrics.manualContributions.toFixed(2)} manual
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No contributions yet</div>
            )}
            {event.contribution_goal && (
              <>
                <Progress value={contributionProgress} className="h-2" />
                <div className="text-xs text-muted-foreground">
                  ${totalContributions.toFixed(2)} of ${event.contribution_goal.toFixed(2)} goal ({Math.round(contributionProgress)}%)
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Announcements Card */}
      {announcements.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                Latest Announcement
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => onNavigateToTab('items-tasks')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {announcements[0].title && (
                <p className="font-medium">{announcements[0].title}</p>
              )}
              <p className="text-sm text-muted-foreground line-clamp-2">
                {announcements[0].message}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(announcements[0].created_at), { addSuffix: true })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <PaymentEducationModal
        open={educationModalOpen}
        onOpenChange={setEducationModalOpen}
      />
      
      <InstallInstructionsModal
        open={installModalOpen}
        onOpenChange={setInstallModalOpen}
      />
    </div>
  );
};
