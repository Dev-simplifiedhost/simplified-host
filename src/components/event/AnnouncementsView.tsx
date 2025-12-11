import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pin, AlertCircle, Bell, Heart, Info, ChevronDown, ChevronUp, Megaphone } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Announcement {
  id: string;
  title: string | null;
  message: string;
  category: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface AnnouncementsViewProps {
  eventId: string;
}

export const AnnouncementsView = ({ eventId }: AnnouncementsViewProps) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [newAnnouncementIds, setNewAnnouncementIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAnnouncements();

    // Check for previously seen announcements
    const seenIds = new Set(JSON.parse(localStorage.getItem(`seen_announcements_${eventId}`) || '[]'));

    // Real-time subscription
    const channel = supabase
      .channel(`public-announcements-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'announcements',
          filter: `event_id=eq.${eventId}`
        },
        (payload) => {
          const newAnnouncement = payload.new as Announcement;
          if (!seenIds.has(newAnnouncement.id)) {
            setNewAnnouncementIds(prev => new Set(prev).add(newAnnouncement.id));
          }
          loadAnnouncements();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'announcements',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          loadAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const loadAnnouncements = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('event_id', eventId)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setAnnouncements(data as Announcement[]);
      
      // Mark announcements as seen
      const seenIds = data.map(a => a.id);
      localStorage.setItem(`seen_announcements_${eventId}`, JSON.stringify(seenIds));
    }
    setLoading(false);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
        // Remove from new announcements when expanded
        setNewAnnouncementIds(prevNew => {
          const newNewSet = new Set(prevNew);
          newNewSet.delete(id);
          return newNewSet;
        });
      }
      return newSet;
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'alert':
        return <AlertCircle className="h-4 w-4" />;
      case 'reminder':
        return <Bell className="h-4 w-4" />;
      case 'thank_you':
        return <Heart className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'alert':
        return 'destructive';
      case 'reminder':
        return 'default';
      case 'thank_you':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const pinnedAnnouncement = announcements.find(a => a.is_pinned);
  const regularAnnouncements = announcements.filter(a => !a.is_pinned);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading updates...
        </CardContent>
      </Card>
    );
  }

  if (announcements.length === 0) {
    return null; // Don't show section if no announcements
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" />
          <CardTitle>Updates & Announcements</CardTitle>
          {newAnnouncementIds.size > 0 && (
            <Badge variant="destructive">{newAnnouncementIds.size} New</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pinned Announcement */}
        {pinnedAnnouncement && (
          <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
            <div className="flex items-start gap-3">
              <Pin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant="default">Pinned</Badge>
                  <Badge variant={getCategoryColor(pinnedAnnouncement.category) as any}>
                    {getCategoryIcon(pinnedAnnouncement.category)}
                    <span className="ml-1 capitalize">{pinnedAnnouncement.category.replace('_', ' ')}</span>
                  </Badge>
                  {newAnnouncementIds.has(pinnedAnnouncement.id) && (
                    <Badge variant="destructive">New</Badge>
                  )}
                </div>
                {pinnedAnnouncement.title && (
                  <h3 className="font-semibold text-lg mb-2">{pinnedAnnouncement.title}</h3>
                )}
                <p className="text-foreground whitespace-pre-wrap break-words">{pinnedAnnouncement.message}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(pinnedAnnouncement.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Regular Announcements */}
        {regularAnnouncements.map((announcement, index) => {
          const isExpanded = expandedIds.has(announcement.id);
          const isLong = announcement.message.length > 200;
          const displayMessage = isLong && !isExpanded 
            ? announcement.message.substring(0, 200) + '...'
            : announcement.message;

          return (
            <div key={announcement.id} className={`p-4 rounded-lg border ${index === 0 && !pinnedAnnouncement ? 'border-primary' : ''}`}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant={getCategoryColor(announcement.category) as any}>
                  {getCategoryIcon(announcement.category)}
                  <span className="ml-1 capitalize">{announcement.category.replace('_', ' ')}</span>
                </Badge>
                {newAnnouncementIds.has(announcement.id) && (
                  <Badge variant="destructive">New</Badge>
                )}
              </div>
              {announcement.title && (
                <h3 className="font-semibold mb-2">{announcement.title}</h3>
              )}
              <p className="text-muted-foreground whitespace-pre-wrap break-words">{displayMessage}</p>
              {isLong && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpand(announcement.id)}
                  className="mt-2 p-0 h-auto font-medium"
                >
                  {isExpanded ? (
                    <>
                      Show Less <ChevronUp className="ml-1 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Read More <ChevronDown className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                {announcement.updated_at !== announcement.created_at && (
                  <span className="ml-2">(Edited)</span>
                )}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};