import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { 
  UserCheck, 
  Megaphone, 
  Package, 
  CheckCircle2,
  MessageSquare,
  Activity
} from "lucide-react";

interface RecentActivityFeedProps {
  eventId: string;
}

interface ActivityItem {
  id: string;
  type: "rsvp" | "announcement" | "item_claim" | "task_completed" | "message";
  description: string;
  timestamp: Date;
  icon: React.ReactNode;
}

export function RecentActivityFeed({ eventId }: RecentActivityFeedProps) {
  const [loading, setLoading] = useState(true);
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [itemClaims, setItemClaims] = useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);

  useEffect(() => {
    loadActivityData();
  }, [eventId]);

  const loadActivityData = async () => {
    setLoading(true);
    try {
      // Fetch recent RSVPs
      const { data: rsvpData } = await supabase
        .from("rsvps")
        .select("id, guest_name, rsvp_status, created_at, updated_at")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Fetch recent announcements
      const { data: announcementData } = await supabase
        .from("announcements")
        .select("id, title, message, created_at")
        .eq("event_id", eventId)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch recent item claims
      const { data: claimData } = await supabase
        .from("item_claims")
        .select("id, contributor_name, created_at, event_items(name)")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(10);

      // Fetch recently completed tasks
      const { data: taskData } = await supabase
        .from("tasks")
        .select("id, title, completed_at")
        .eq("event_id", eventId)
        .eq("status", "done")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(5);

      setRsvps(rsvpData || []);
      setAnnouncements(announcementData || []);
      setItemClaims(claimData || []);
      setCompletedTasks(taskData || []);
    } catch (error) {
      console.error("Error loading activity:", error);
    } finally {
      setLoading(false);
    }
  };

  // Combine and sort activities
  const activities: ActivityItem[] = useMemo(() => {
    const result: ActivityItem[] = [];

    // Add RSVPs
    rsvps.forEach((rsvp) => {
      const statusText = rsvp.rsvp_status === "yes" ? "Attending" : 
                        rsvp.rsvp_status === "no" ? "Not Attending" : "Maybe";
      result.push({
        id: `rsvp-${rsvp.id}`,
        type: "rsvp",
        description: `${rsvp.guest_name} RSVP'd '${statusText}'`,
        timestamp: new Date(rsvp.created_at),
        icon: <UserCheck className="h-4 w-4 text-green-600" />,
      });
    });

    // Add announcements
    announcements.forEach((ann) => {
      const title = ann.title || ann.message?.substring(0, 30) + "...";
      result.push({
        id: `ann-${ann.id}`,
        type: "announcement",
        description: `Announcement posted: "${title}"`,
        timestamp: new Date(ann.created_at),
        icon: <Megaphone className="h-4 w-4 text-blue-600" />,
      });
    });

    // Add item claims
    itemClaims.forEach((claim) => {
      const itemName = claim.event_items?.name || "an item";
      result.push({
        id: `claim-${claim.id}`,
        type: "item_claim",
        description: `${claim.contributor_name} claimed "${itemName}"`,
        timestamp: new Date(claim.created_at),
        icon: <Package className="h-4 w-4 text-purple-600" />,
      });
    });

    // Add completed tasks
    completedTasks.forEach((task) => {
      result.push({
        id: `task-${task.id}`,
        type: "task_completed",
        description: `Task completed: "${task.title}"`,
        timestamp: new Date(task.completed_at),
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
      });
    });

    // Sort by timestamp (newest first) and limit
    return result
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 8);
  }, [rsvps, announcements, itemClaims, completedTasks]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-4 w-4 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent activity yet
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="mt-0.5">{activity.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
