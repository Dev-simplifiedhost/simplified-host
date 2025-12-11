import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  CheckSquare, 
  Users, 
  Settings, 
  Edit, 
  UserCheck, 
  Gift, 
  MessageSquare, 
  Eye,
  PartyPopper
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: string;
}

const TILE_ACTIONS: Record<string, QuickAction[]> = {
  atRisk: [
    { label: 'Complete Items', icon: Package, action: 'items' },
    { label: 'Add Tasks', icon: CheckSquare, action: 'tasks' },
    { label: 'Invite Guests', icon: Users, action: 'invite' },
  ],
  attention: [
    { label: 'Finish Setup', icon: Settings, action: 'setup' },
    { label: 'Add Details', icon: Edit, action: 'details' },
    { label: 'Add Items', icon: Package, action: 'items' },
  ],
  newActivity: [
    { label: 'View RSVPs', icon: UserCheck, action: 'rsvps' },
    { label: 'Review Claims', icon: Gift, action: 'claims' },
    { label: 'Check Comments', icon: MessageSquare, action: 'comments' },
  ],
  updated: [
    { label: 'Review Changes', icon: Eye, action: 'review' },
  ],
  draft: [
    { label: 'Continue Setup', icon: Edit, action: 'continue' },
    { label: 'Preview', icon: Eye, action: 'preview' },
  ],
  thisWeek: [
    { label: 'View All', icon: Eye, action: 'view' },
  ],
  upcoming: [
    { label: 'Create New', icon: PartyPopper, action: 'create' },
  ],
};

interface ContextualActionBarProps {
  tileFilter: string | null;
  selectedEventId?: string | null;
  onAction?: (action: string, eventId?: string) => void;
  onCreateEvent?: () => void;
  className?: string;
}

export function ContextualActionBar({ 
  tileFilter, 
  selectedEventId,
  onAction,
  onCreateEvent,
  className 
}: ContextualActionBarProps) {
  const navigate = useNavigate();
  
  if (!tileFilter) return null;
  
  const actions = TILE_ACTIONS[tileFilter];
  if (!actions || actions.length === 0) return null;

  const handleAction = (action: string) => {
    if (action === 'create' && onCreateEvent) {
      onCreateEvent();
      return;
    }
    
    if (selectedEventId) {
      switch (action) {
        case 'items':
        case 'tasks':
        case 'rsvps':
        case 'claims':
        case 'comments':
        case 'setup':
        case 'details':
        case 'continue':
          navigate(`/dashboard?event=${selectedEventId}`);
          break;
        case 'invite':
          onAction?.('share', selectedEventId);
          break;
        case 'preview':
          // Would need event code, handle via onAction
          onAction?.('preview', selectedEventId);
          break;
        case 'review':
        case 'view':
          navigate(`/dashboard?event=${selectedEventId}`);
          break;
        default:
          onAction?.(action, selectedEventId);
      }
    } else {
      onAction?.(action);
    }
  };

  const getTileLabel = () => {
    switch (tileFilter) {
      case 'atRisk': return 'At Risk';
      case 'attention': return 'Needs Attention';
      case 'newActivity': return 'New Activity';
      case 'updated': return 'Recently Updated';
      case 'draft': return 'Drafts';
      case 'thisWeek': return 'This Week';
      case 'upcoming': return 'Active Events';
      default: return 'Quick Actions';
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-lg border border-border/50",
      "overflow-x-auto scrollbar-hide",
      className
    )}>
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap shrink-0">
        {getTileLabel()}:
      </span>
      <div className="flex items-center gap-1.5">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.action}
              variant="secondary"
              size="sm"
              className="h-8 px-3 text-xs whitespace-nowrap shrink-0"
              onClick={() => handleAction(action.action)}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export default ContextualActionBar;
