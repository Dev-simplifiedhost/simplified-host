import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight, Activity } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityItem {
  id: string;
  type: 'claim' | 'contribution' | 'rsvp';
  name: string;
  action: string;
  timestamp: string;
}

interface ActivityFeedCompactProps {
  eventId: string;
  enabled: boolean;
}

export const ActivityFeedCompact = ({ eventId, enabled }: ActivityFeedCompactProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !isExpanded) return;
    loadActivities();
  }, [eventId, enabled, isExpanded]);

  const loadActivities = async () => {
    setLoading(true);
    try {
      // Get recent claims
      const { data: claims } = await supabase
        .from('item_claims')
        .select(`
          id,
          contributor_name,
          created_at,
          claim_type,
          amount_contributed,
          event_items!inner(name)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Get recent RSVPs
      const { data: rsvps } = await supabase
        .from('rsvps')
        .select('id, guest_name, rsvp_status, created_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(5);

      const activityItems: ActivityItem[] = [];

      // Add claims
      claims?.forEach(claim => {
        const itemName = (claim.event_items as any)?.name || 'an item';
        if (claim.claim_type === 'monetary' && claim.amount_contributed) {
          activityItems.push({
            id: claim.id,
            type: 'contribution',
            name: claim.contributor_name,
            action: `contributed $${claim.amount_contributed}`,
            timestamp: claim.created_at
          });
        } else {
          activityItems.push({
            id: claim.id,
            type: 'claim',
            name: claim.contributor_name,
            action: `claimed ${itemName}`,
            timestamp: claim.created_at
          });
        }
      });

      // Add RSVPs
      rsvps?.forEach(rsvp => {
        const statusText = rsvp.rsvp_status === 'attending' ? 'is attending' 
          : rsvp.rsvp_status === 'maybe' ? 'might attend' 
          : 'can\'t make it';
        activityItems.push({
          id: rsvp.id,
          type: 'rsvp',
          name: rsvp.guest_name,
          action: statusText,
          timestamp: rsvp.created_at
        });
      });

      // Sort by timestamp and take top 5
      activityItems.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setActivities(activityItems.slice(0, 5));
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) return null;

  return (
    <div className="py-3">
      <div className="rounded-lg border border-border/30 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/20 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-[15px] font-medium text-foreground">Recent Activity</span>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {isExpanded && (
          <div className="px-3 py-2 space-y-2">
            {loading ? (
              <p className="text-[13px] text-muted-foreground py-2">Loading...</p>
            ) : activities.length === 0 ? (
              <p className="text-[13px] text-muted-foreground py-2">No recent activity yet</p>
            ) : (
              activities.map(activity => (
                <div key={activity.id} className="flex items-start gap-2 py-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-foreground">
                      <span className="font-medium">{activity.name}</span>
                      {' '}{activity.action}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
