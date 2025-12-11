import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Send, 
  Package, 
  CheckSquare, 
  Megaphone,
  ClipboardList,
  Eye
} from "lucide-react";

interface NextBestActionsProps {
  rsvpCount: number;
  itemsTotal: number;
  tasksTotal: number;
  tasksCompleted: number;
  daysUntilEvent: number | null;
  eventCreatedAt: string | null;
  announcementsCount: number;
  onInviteGuests: () => void;
  onSendReminder: () => void;
  onAddItems: () => void;
  onAddTask: () => void;
  onPostAnnouncement: () => void;
  onReviewGuests: () => void;
  onReviewItems: () => void;
  onReviewTasks: () => void;
}

interface ActionConfig {
  id: string;
  priority: number;
  label: string;
  icon: React.ReactNode;
  action: () => void;
}

export function NextBestActions({
  rsvpCount,
  itemsTotal,
  tasksTotal,
  tasksCompleted,
  daysUntilEvent,
  eventCreatedAt,
  announcementsCount,
  onInviteGuests,
  onSendReminder,
  onAddItems,
  onAddTask,
  onPostAnnouncement,
  onReviewGuests,
  onReviewItems,
  onReviewTasks,
}: NextBestActionsProps) {
  // Calculate days since event created
  const daysSinceCreated = useMemo(() => {
    if (!eventCreatedAt) return 0;
    const created = new Date(eventCreatedAt);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }, [eventCreatedAt]);

  // Build actions based on event state
  const actions: ActionConfig[] = useMemo(() => {
    const result: ActionConfig[] = [];

    // If no guests invited (event > 48h old)
    if (rsvpCount === 0 && daysSinceCreated > 2) {
      result.push({
        id: "invite_guests",
        priority: 1,
        label: "Invite Guests",
        icon: <Users className="h-4 w-4" />,
        action: onInviteGuests,
      });
    }

    // If guests invited but RSVPs low and deadline/event near
    if (rsvpCount > 0 && rsvpCount < 5 && daysUntilEvent !== null && daysUntilEvent <= 7 && daysUntilEvent >= 0) {
      result.push({
        id: "send_reminder",
        priority: 2,
        label: "Send Reminder",
        icon: <Send className="h-4 w-4" />,
        action: onSendReminder,
      });
    }

    // If no items
    if (itemsTotal === 0) {
      result.push({
        id: "add_items",
        priority: 3,
        label: "Add Items",
        icon: <Package className="h-4 w-4" />,
        action: onAddItems,
      });
    }

    // If no tasks
    if (tasksTotal === 0) {
      result.push({
        id: "add_task",
        priority: 4,
        label: "Add Task",
        icon: <CheckSquare className="h-4 w-4" />,
        action: onAddTask,
      });
    }

    // If no announcements and guests are invited
    if (announcementsCount === 0 && rsvpCount > 0) {
      result.push({
        id: "post_announcement",
        priority: 5,
        label: "Post Announcement",
        icon: <Megaphone className="h-4 w-4" />,
        action: onPostAnnouncement,
      });
    }

    // Fall back to review actions if nothing critical
    if (result.length < 2) {
      if (rsvpCount > 0) {
        result.push({
          id: "review_guests",
          priority: 10,
          label: "Review Guests",
          icon: <Eye className="h-4 w-4" />,
          action: onReviewGuests,
        });
      }
      if (itemsTotal > 0) {
        result.push({
          id: "review_items",
          priority: 11,
          label: "Review Items",
          icon: <ClipboardList className="h-4 w-4" />,
          action: onReviewItems,
        });
      }
      if (tasksTotal > 0 && tasksCompleted < tasksTotal) {
        result.push({
          id: "review_tasks",
          priority: 12,
          label: "Review Tasks",
          icon: <CheckSquare className="h-4 w-4" />,
          action: onReviewTasks,
        });
      }
    }

    return result.sort((a, b) => a.priority - b.priority).slice(0, 3);
  }, [
    rsvpCount,
    daysSinceCreated,
    daysUntilEvent,
    itemsTotal,
    tasksTotal,
    tasksCompleted,
    announcementsCount,
    onInviteGuests,
    onSendReminder,
    onAddItems,
    onAddTask,
    onPostAnnouncement,
    onReviewGuests,
    onReviewItems,
    onReviewTasks,
  ]);

  if (actions.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Next Steps</h3>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            size="sm"
            onClick={action.action}
            className="h-9"
          >
            {action.icon}
            <span className="ml-2">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
