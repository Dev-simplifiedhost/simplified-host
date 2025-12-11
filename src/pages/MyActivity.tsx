import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Calendar,
  CheckCircle2,
  Package,
  DollarSign,
  Users,
  Clock,
  Search,
  Filter,
  Plus,
  TrendingUp,
  Smartphone
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  activity_type: string;
  activity_data: any;
  is_read: boolean;
  created_at: string;
  event_id: string;
}

interface MyEvent {
  id: string;
  name: string;
  event_date: string | null;
  event_code: string;
  rsvp_status?: string;
  claimed_items?: any[];
}

export default function MyActivity() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [myEvents, setMyEvents] = useState<MyEvent[]>([]);
  const [hostedEvents, setHostedEvents] = useState<any[]>([]);
  const [myRsvps, setMyRsvps] = useState<any[]>([]);
  const [myClaimedItems, setMyClaimedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    setIsInstalled(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setIsInstalled(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    
    if (user) {
      loadAllData();
      setupRealtimeSubscription();
    }
  }, [user, authLoading]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadActivities(),
      loadHostedEvents(),
      loadAttendeeData()
    ]);
    setLoading(false);
  };

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setActivities(data);
      setUnreadCount(data.filter(a => !a.is_read).length);
    }
  };

  const loadHostedEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user?.id)
      .eq('is_draft', false)
      .order('event_date', { ascending: true });

    if (!error && data) {
      setHostedEvents(data);
    }
  };

  const loadAttendeeData = async () => {
    // This loads RSVPs and claimed items based on guest tokens stored in localStorage
    const eventIds: string[] = [];
    const rsvpData: any[] = [];
    const claimedItemsData: any[] = [];

    // Check all stored guest tokens
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('guest_token_')) {
        const eventId = key.replace('guest_token_', '');
        const token = localStorage.getItem(key);
        
        if (token) {
          // Get RSVP
          const { data: rsvp } = await supabase
            .from('rsvps')
            .select('*, events(name, event_date, event_code)')
            .eq('event_id', eventId)
            .eq('guest_token', token)
            .maybeSingle();

          if (rsvp) {
            rsvpData.push(rsvp);
          }

          // Get claimed items
          const { data: items } = await supabase
            .from('event_items')
            .select('*, events(name, event_date, event_code)')
            .eq('event_id', eventId)
            .eq('claimed_by', token);

          if (items) {
            claimedItemsData.push(...items);
          }
        }
      }
    }

    setMyRsvps(rsvpData);
    setMyClaimedItems(claimedItemsData);
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`user-activities-${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities',
          filter: `user_id=eq.${user?.id}`
        },
        () => {
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (activityId: string) => {
    await supabase
      .from('activities')
      .update({ is_read: true })
      .eq('id', activityId);

    loadActivities();
  };

  const markAllAsRead = async () => {
    await supabase
      .from('activities')
      .update({ is_read: true })
      .eq('user_id', user?.id)
      .eq('is_read', false);

    loadActivities();
    toast({ title: "All notifications marked as read" });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'guest_rsvp':
      case 'guest_rsvp_changed':
        return <Users className="h-4 w-4" />;
      case 'item_claimed':
      case 'item_unclaimed':
        return <Package className="h-4 w-4" />;
      case 'contribution_received':
        return <DollarSign className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getActivityMessage = (activity: Activity) => {
    const data = activity.activity_data;
    
    switch (activity.activity_type) {
      case 'guest_rsvp':
        return `${data.guest_name} RSVP'd as ${data.rsvp_status.replace('_', ' ')} to ${data.event_name}`;
      case 'guest_rsvp_changed':
        return `${data.guest_name} changed RSVP from ${data.old_status} to ${data.new_status} for ${data.event_name}`;
      case 'item_claimed':
        return `${data.claimed_by} claimed ${data.item_name} for ${data.event_name}`;
      case 'item_unclaimed':
        return `${data.item_name} was unclaimed for ${data.event_name}`;
      default:
        return 'Activity update';
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (activityFilter !== 'all' && activity.activity_type !== activityFilter) {
      return false;
    }
    if (searchTerm) {
      const message = getActivityMessage(activity).toLowerCase();
      const data = activity.activity_data;
      const searchLower = searchTerm.toLowerCase();
      
      return message.includes(searchLower) ||
        data.guest_name?.toLowerCase().includes(searchLower) ||
        data.guest_email?.toLowerCase().includes(searchLower) ||
        data.guest_phone?.includes(searchTerm) ||
        data.event_name?.toLowerCase().includes(searchLower);
    }
    return true;
  });

  const upcomingEvents = hostedEvents.filter(e => 
    e.event_date && new Date(e.event_date) >= new Date()
  );

  const upcomingRsvps = myRsvps.filter(r => 
    r.events?.event_date && new Date(r.events.event_date) >= new Date()
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading your activity...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Activity</h1>
          <p className="text-muted-foreground">
            Track your events, RSVPs, and contributions
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="hosted">
              Hosted Events ({hostedEvents.length})
            </TabsTrigger>
            <TabsTrigger value="attending">
              Attending ({upcomingRsvps.length})
            </TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Hosted Events</CardDescription>
                  <CardTitle className="text-3xl">{hostedEvents.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Attending</CardDescription>
                  <CardTitle className="text-3xl">{upcomingRsvps.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Items Claimed</CardDescription>
                  <CardTitle className="text-3xl">{myClaimedItems.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardDescription>Notifications</CardDescription>
                  <CardTitle className="text-3xl">{unreadCount}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Upcoming Events</CardTitle>
                  <CardDescription>Events you're hosting</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upcomingEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer"
                      onClick={() => navigate(`/dashboard?event=${event.id}`)}
                    >
                      <div>
                        <p className="font-medium">{event.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {event.event_date && format(new Date(event.event_date), 'PPP')}
                        </p>
                      </div>
                      <Badge>Hosting</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* My Claimed Items */}
            {myClaimedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Items You're Bringing</CardTitle>
                  <CardDescription>Don't forget these!</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {myClaimedItems.slice(0, 5).map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.events?.name}
                          </p>
                        </div>
                      </div>
                      {item.events?.event_date && (
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(item.events.event_date), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {hostedEvents.length === 0 && upcomingRsvps.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No activity yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Start by creating an event or RSVPing to one
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    <Button onClick={() => navigate('/dashboard')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Event
                    </Button>
                    <Button variant="outline" onClick={() => navigate('/my-activity/search')}>
                      <Search className="h-4 w-4 mr-2" />
                      Find My RSVPs
                    </Button>
                    {!isInstalled && (
                      <Button variant="outline" onClick={() => navigate('/install')}>
                        <Smartphone className="h-4 w-4 mr-2" />
                        Install App
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Hosted Events Tab */}
          <TabsContent value="hosted" className="space-y-4">
            {hostedEvents.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">You haven't hosted any events yet</p>
                  <Button onClick={() => navigate('/dashboard')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Event
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {hostedEvents.map(event => (
                  <Card key={event.id} className="cursor-pointer hover:border-primary" onClick={() => navigate(`/dashboard?event=${event.id}`)}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{event.name}</CardTitle>
                          <CardDescription>
                            {event.event_date && format(new Date(event.event_date), 'PPP')}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">Code: {event.event_code}</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Attending Tab */}
          <TabsContent value="attending" className="space-y-4">
            {upcomingRsvps.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">You're not attending any upcoming events</p>
                  <Button variant="outline" onClick={() => navigate('/my-activity/search')}>
                    <Search className="h-4 w-4 mr-2" />
                    Find My RSVPs
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {upcomingRsvps.map((rsvp: any) => (
                  <Card key={rsvp.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{rsvp.events?.name}</CardTitle>
                          <CardDescription>
                            {rsvp.events?.event_date && format(new Date(rsvp.events.event_date), 'PPP')}
                          </CardDescription>
                        </div>
                        <Badge>{rsvp.rsvp_status.replace('_', ' ')}</Badge>
                      </div>
                    </CardHeader>
                    {myClaimedItems.filter(item => item.event_id === rsvp.event_id).length > 0 && (
                      <CardContent>
                        <p className="text-sm font-medium mb-2">You're bringing:</p>
                        <div className="space-y-1">
                          {myClaimedItems
                            .filter(item => item.event_id === rsvp.event_id)
                            .map(item => (
                              <p key={item.id} className="text-sm text-muted-foreground">
                                • {item.name}
                              </p>
                            ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Activity Feed</CardTitle>
                    <CardDescription>Stay updated on your events</CardDescription>
                  </div>
                  {unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={markAllAsRead}>
                      Mark All Read
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Search activities..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Select value={activityFilter} onValueChange={setActivityFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="guest_rsvp">RSVPs</SelectItem>
                      <SelectItem value="item_claimed">Items</SelectItem>
                      <SelectItem value="contribution_received">Contributions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {filteredActivities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredActivities.map(activity => (
                      <div
                        key={activity.id}
                        className={`p-4 rounded-lg border ${
                          !activity.is_read ? 'bg-accent' : ''
                        } hover:bg-accent/50 cursor-pointer`}
                        onClick={() => !activity.is_read && markAsRead(activity.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1">{getActivityIcon(activity.activity_type)}</div>
                          <div className="flex-1">
                            <p className={!activity.is_read ? 'font-medium' : ''}>
                              {getActivityMessage(activity)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          {!activity.is_read && (
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}