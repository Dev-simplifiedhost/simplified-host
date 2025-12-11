import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRecaptcha } from "@/hooks/useRecaptcha";
import {
  Bell,
  Calendar,
  Package,
  Users,
  Search,
  Plus,
  Minus,
  Pencil,
  CheckCircle2,
  XCircle,
  HelpCircle,
  X,
  Mail,
  Eye,
} from "lucide-react";
import { format, formatDistanceToNow, differenceInDays } from "date-fns";
import { PhoneInputWithCountry } from "@/components/ui/phone-input";
import { cleanPhoneNumber, getExampleNumber } from "@/lib/phoneFormat";
import { MessageHostDialog } from "@/components/event/MessageHostDialog";
import { RSVPWizardDialog } from "@/components/event/RSVPWizardDialog";

interface Activity {
  id: string;
  activity_type: string;
  activity_data: any;
  is_read: boolean;
  created_at: string;
  event_id: string;
}

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId?: string;
}

export function ActivityDialog({ open, onOpenChange, eventId }: ActivityDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { verifyRecaptcha } = useRecaptcha();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [hostedEvents, setHostedEvents] = useState<any[]>([]);
  const [myRsvps, setMyRsvps] = useState<any[]>([]);
  const [myClaimedItems, setMyClaimedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [showSearchDialog, setShowSearchDialog] = useState(!user);
  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchCountryCode, setSearchCountryCode] = useState("US");
  const [searchTerm, setSearchTerm] = useState("");
  const [guestName, setGuestName] = useState("");
  const [isGuestSearchSession, setIsGuestSearchSession] = useState(false);
  const [guestSearchParams, setGuestSearchParams] = useState<{
    name: string;
    phone: string;
    countryCode: string;
  } | null>(null);
  const [unclaimConfirmOpen, setUnclaimConfirmOpen] = useState(false);
  const [pendingUnclaim, setPendingUnclaim] = useState<{
    claimId: string;
    itemName: string;
    eventName: string;
    eventId: string;
    guestToken: string;
    claimType: string;
    quantity?: number;
    amount?: number;
  } | null>(null);
  const [editingGuestCountRsvpId, setEditingGuestCountRsvpId] = useState<string | null>(null);
  const [tempGuestCount, setTempGuestCount] = useState<number>(0);
  const [guestCountConfirmOpen, setGuestCountConfirmOpen] = useState(false);
  const [messageHostDialogOpen, setMessageHostDialogOpen] = useState(false);
  const [selectedEventForMessage, setSelectedEventForMessage] = useState<any>(null);
  const [editRsvpDialogOpen, setEditRsvpDialogOpen] = useState(false);
  const [selectedRsvpForEdit, setSelectedRsvpForEdit] = useState<any>(null);

  useEffect(() => {
    if (open) {
      loadAllData();
      if (user) {
        const cleanup = setupRealtimeSubscription();
        return cleanup;
      }
    }
  }, [open, user]);

  // Real-time updates for guest RSVPs based on localStorage tokens
  useEffect(() => {
    if (!open || user) return; // Only for guest users

    const tokens: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('guest_token_')) {
        const token = localStorage.getItem(key);
        if (token) tokens.push(token);
      }
    }

    if (tokens.length === 0) return;

    const rsvpChannel = supabase
      .channel(`guest-rsvps-activity`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rsvps',
        },
        (payload) => {
          const updatedToken = (payload.new as any)?.guest_token;
          if (updatedToken && tokens.includes(updatedToken)) {
            console.log('Guest RSVP updated:', payload);
            loadAttendeeData();
            toast({
              title: "RSVP updated",
              description: "Your RSVP status has been synced",
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rsvpChannel);
    };
  }, [open, user]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      user ? loadActivities() : Promise.resolve(),
      user ? loadHostedEvents() : Promise.resolve(),
      isGuestSearchSession && guestSearchParams ? loadGuestSearchData() : loadAttendeeData()
    ]);
    setLoading(false);
  };

  const loadActivities = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setActivities(data);
      setUnreadCount(data.filter(a => !a.is_read).length);
    }
  };

  const loadHostedEvents = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_draft', false)
      .order('event_date', { ascending: true });

    if (!error && data) {
      setHostedEvents(data);
    }
  };

  const loadAttendeeData = async () => {
    const rsvpData: any[] = [];
    const claimedItemsData: any[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('guest_token_')) {
        const eventId = key.replace('guest_token_', '');
        const token = localStorage.getItem(key);
        
        if (token) {
          const { data: rsvp } = await supabase
            .from('rsvps')
            .select('*, events(name, event_date, event_code, allow_plus_ones, max_plus_ones, rsvp_deadline, max_attendees, require_email_for_rsvp)')
            .eq('event_id', eventId)
            .eq('guest_token', token)
            .maybeSingle();

          if (rsvp) {
            rsvpData.push({
              ...rsvp,
              guest_token: token,
              event_settings: {
                allow_plus_ones: rsvp.events?.allow_plus_ones,
                max_plus_ones: rsvp.events?.max_plus_ones
              }
            });

            // Load item claims for this RSVP
            const { data: claims, error: claimsError } = await supabase
              .from('item_claims')
              .select(`
                id,
                claim_type,
                quantity_claimed,
                amount_contributed,
                payment_verified,
                created_at,
                event_id,
                item_id,
                event_items!inner(id, name, category, goal_type),
                events!inner(id, name, event_date, event_code)
              `)
              .eq('rsvp_id', rsvp.id)
              .eq('event_id', eventId);

            if (claimsError) {
              console.error('Error loading claims:', claimsError);
            }

            if (claims && claims.length > 0) {
              const mappedClaims = claims.map(claim => ({
                ...claim,
                guest_token: token,
                event_id: eventId
              }));
              
              console.log('Loading claims with tokens:', {
                claimCount: mappedClaims.length,
                firstClaimHasToken: mappedClaims[0]?.guest_token ? 'yes' : 'no',
                sampleToken: token?.substring(0, 8) + '...'
              });
              
              claimedItemsData.push(...mappedClaims);
            }
          }
        }
      }
    }

    setMyRsvps(rsvpData);
    setMyClaimedItems(claimedItemsData);
  };

  const loadGuestSearchData = async () => {
    if (!guestSearchParams) return;

    const cleanedPhone = cleanPhoneNumber(guestSearchParams.phone);

    const { data, error } = await supabase.functions.invoke('find-guest-activity', {
      body: {
        name: guestSearchParams.name,
        phone: cleanedPhone,
        countryCode: guestSearchParams.countryCode,
      }
    });

    if (error) {
      console.error('Error reloading guest search data:', error);
      return;
    }

    const rsvps = data?.rsvps ?? [];
    const items = data?.items ?? [];

    // Map items to include guest_token from matching RSVP
    const itemsWithTokens = items.map((item: any) => {
      const matchingRsvp = rsvps.find((r: any) => r.id === item.rsvp_id);
      return {
        ...item,
        guest_token: matchingRsvp?.guest_token
      };
    });

    setMyRsvps(rsvps);
    setMyClaimedItems(itemsWithTokens);
  };

  const setupRealtimeSubscription = () => {
    if (!user) return;

    const activitiesChannel = supabase
      .channel(`user-activities-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(activitiesChannel);
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
    if (!user) return;
    
    await supabase
      .from('activities')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    loadActivities();
    toast({ title: "All notifications marked as read" });
  };

  const handleUnclaimClick = (claim: any) => {
    // Handle both nested and flat data structures
    const itemName = claim.event_items?.name || claim.item?.name || 'Unknown Item';
    const eventName = claim.events?.name || claim.event?.name || 'Unknown Event';
    
    console.log('Unclaim - Claim data:', { 
      claim, 
      itemName, 
      eventName,
      hasGuestToken: !!claim.guest_token,
      guestToken: claim.guest_token 
    });
    
    if (!claim.guest_token) {
      toast({
        title: "Cannot Unclaim",
        description: "Missing authentication token. Please try refreshing the page.",
        variant: "destructive"
      });
      return;
    }
    
    setPendingUnclaim({
      claimId: claim.id,
      itemName,
      eventName,
      eventId: claim.event_id,
      guestToken: claim.guest_token,
      claimType: claim.claim_type,
      quantity: claim.quantity_claimed,
      amount: claim.amount_contributed
    });
    setUnclaimConfirmOpen(true);
  };

  const confirmUnclaim = async () => {
    if (!pendingUnclaim) return;

    console.log('Confirm unclaim with:', {
      claimId: pendingUnclaim.claimId,
      eventId: pendingUnclaim.eventId,
      guestToken: pendingUnclaim.guestToken,
      hasGuestToken: !!pendingUnclaim.guestToken
    });

    try {
      const { error } = await supabase.rpc('delete_my_item_claim', {
        p_claim_id: pendingUnclaim.claimId,
        p_event_id: pendingUnclaim.eventId,
        p_guest_token: pendingUnclaim.guestToken
      });

      if (error) {
        console.error('RPC error details:', error);
        throw error;
      }

      toast({
        title: "Item Unclaimed",
        description: `${pendingUnclaim.itemName} is now available for others.`,
      });

      // Reload data
      if (user) {
        loadHostedEvents();
      } else if (isGuestSearchSession && guestSearchParams) {
        loadGuestSearchData();
      } else {
        loadAttendeeData();
      }
    } catch (error) {
      console.error('Error unclaiming item:', error);
      toast({
        title: "Unclaim Failed",
        description: "Unable to unclaim item. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUnclaimConfirmOpen(false);
      setPendingUnclaim(null);
    }
  };

  const cancelUnclaim = () => {
    setUnclaimConfirmOpen(false);
    setPendingUnclaim(null);
  };

  const handleStartEditGuestCount = (rsvp: any) => {
    const currentCount = Array.isArray(rsvp.additional_guests) ? rsvp.additional_guests.length : 0;
    setTempGuestCount(currentCount);
    setEditingGuestCountRsvpId(rsvp.id);
  };

  const handleIncrementGuests = (maxPlusOnes: number | null) => {
    if (maxPlusOnes && tempGuestCount >= maxPlusOnes) {
      toast({
        title: "Guest Limit Reached",
        description: `Maximum of ${maxPlusOnes} additional guests allowed`,
        variant: "destructive"
      });
      return;
    }
    setTempGuestCount(prev => prev + 1);
  };

  const handleDecrementGuests = () => {
    if (tempGuestCount > 0) {
      setTempGuestCount(prev => prev - 1);
    }
  };

  const handleSaveGuestCountClick = () => {
    setGuestCountConfirmOpen(true);
  };

  const confirmGuestCountUpdate = async () => {
    if (!editingGuestCountRsvpId) return;

    const rsvp = myRsvps.find(r => r.id === editingGuestCountRsvpId);
    if (!rsvp) return;

    try {
      // Create array of placeholder guest names
      const guestArray = Array.from({ length: tempGuestCount }, (_, i) => 
        `Guest ${i + 1}`
      );

      const { error } = await supabase
        .from('rsvps')
        .update({ additional_guests: guestArray })
        .eq('id', rsvp.id)
        .eq('guest_token', rsvp.guest_token);

      if (error) throw error;

      toast({
        title: "Guest Count Updated",
        description: `${tempGuestCount} additional guest${tempGuestCount !== 1 ? 's' : ''} saved`,
      });

      // Reload data and close dialog
      if (isGuestSearchSession && guestSearchParams) {
        loadGuestSearchData();
      } else {
        loadAttendeeData();
      }
      setEditingGuestCountRsvpId(null);
      setGuestCountConfirmOpen(false);
    } catch (error) {
      console.error('Error updating guest count:', error);
      toast({
        title: "Update Failed",
        description: "Unable to update guest count. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelGuestCount = () => {
    setEditingGuestCountRsvpId(null);
    setGuestCountConfirmOpen(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'guest_rsvp':
      case 'guest_rsvp_changed':
        return <Users className="h-4 w-4" />;
      case 'item_claimed':
      case 'item_unclaimed':
        return <Package className="h-4 w-4" />;
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
      case 'item_suggestion_submitted':
        return `${data.suggested_by} suggested "${data.item_name}" for ${data.event_name}`;
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

  const upcomingRsvps = myRsvps.filter(r => {
    const isUpcoming = r.events?.event_date && new Date(r.events.event_date) >= new Date();
    const isAttendingOrMaybe = r.rsvp_status === 'attending' || r.rsvp_status === 'maybe';
    
    console.log('RSVP Filter Check:', {
      eventName: r.events?.name,
      status: r.rsvp_status,
      isUpcoming,
      isAttendingOrMaybe,
      willShow: isUpcoming && isAttendingOrMaybe
    });
    
    return isUpcoming && isAttendingOrMaybe;
  });

  const handleNavigate = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const handleSearchActivity = async () => {
    if (!searchName.trim() || !searchPhone.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both your name and phone number",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const cleanedPhone = cleanPhoneNumber(searchPhone);

    // Optional security: verify reCAPTCHA (graceful if not configured)
    const passed = await verifyRecaptcha('find_activity');
    if (!passed) {
      setLoading(false);
      return;
    }

    // Use backend function to fetch RSVPs (bypasses client RLS safely)
    const { data, error } = await supabase.functions.invoke('find-guest-activity', {
      body: {
        name: searchName.trim(),
        phone: cleanedPhone,
        countryCode: searchCountryCode,
      }
    });

    if (error) {
      toast({
        title: 'Search failed',
        description: 'Please try again shortly.',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    const rsvps = data?.rsvps ?? [];
    const items = data?.items ?? [];

    if (rsvps.length === 0 && items.length === 0) {
      toast({
        title: 'No Activity Found',
        description: 'No RSVPs or item claims matched that name and phone number',
        variant: 'destructive'
      });
      setLoading(false);
      return;
    }

    // Map items to include guest_token from matching RSVP
    const itemsWithTokens = items.map((item: any) => {
      const matchingRsvp = rsvps.find((r: any) => r.id === item.rsvp_id);
      return {
        ...item,
        guest_token: matchingRsvp?.guest_token
      };
    });

    setMyRsvps(rsvps);
    setMyClaimedItems(itemsWithTokens);
    setGuestName(searchName.trim());
    setIsGuestSearchSession(true);
    setGuestSearchParams({
      name: searchName.trim(),
      phone: cleanedPhone,
      countryCode: searchCountryCode
    });
    setShowSearchDialog(false);
    setLoading(false);

    toast({
      title: 'Activity Found!',
      description: `Found ${rsvps.length} RSVP(s) and ${items.length} claimed item(s)`
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl ${isMobile ? 'max-h-[90vh] h-[90vh]' : 'max-h-[85vh]'} flex flex-col`}>
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            My Activity
          </DialogTitle>
          <DialogDescription>
            Track your events, RSVPs, and contributions
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-1">
        {/* Search Dialog for Non-Authenticated Users */}
        {!user && showSearchDialog && (
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-4 w-4" />
                Find My Activity
              </CardTitle>
              <CardDescription className="text-xs">
                Enter your name and phone number to view your RSVPs and claimed items
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="activity-search-name" className="text-xs">Full Name</Label>
                <Input
                  id="activity-search-name"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Your name"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="activity-search-phone" className="text-xs">Phone Number</Label>
                <PhoneInputWithCountry
                  value={searchPhone}
                  onChange={setSearchPhone}
                  countryCode={searchCountryCode}
                  onCountryChange={(country) => setSearchCountryCode(country || 'US')}
                  placeholder={getExampleNumber(searchCountryCode)}
                />
              </div>
              <Button onClick={handleSearchActivity} className="w-full h-9" disabled={loading}>
                {loading ? "Searching..." : "Find My Activity"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Show content only if user is authenticated OR search has been performed */}
        {(user || (!showSearchDialog && !user)) && (
        <>
        {/* Welcome message for guests who found their activity */}
        {!user && guestName && (
          <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Welcome Back, {guestName}! 👋
            </h3>
            <p className="text-sm text-muted-foreground">
              Here's your activity across all events
            </p>
          </div>
        )}

        <Tabs defaultValue="attending" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="attending">
              Attending/Maybe ({upcomingRsvps.length})
            </TabsTrigger>
            <TabsTrigger value="hosted">
              Hosted ({hostedEvents.length})
            </TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">{unreadCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Hosted Events Tab */}
          <TabsContent value="hosted" className={`space-y-3 ${isMobile ? 'px-2' : ''}`}>
            {hostedEvents.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-3">You haven't hosted any events yet</p>
                  <Button size="sm" onClick={() => handleNavigate('/dashboard')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Event
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {hostedEvents.slice(0, 10).map(event => (
                  <Card key={event.id} className="cursor-pointer hover:border-primary" onClick={() => handleNavigate(`/dashboard?event=${event.id}`)}>
                    <CardHeader className="py-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm">{event.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {event.event_date && format(new Date(event.event_date), 'PPP')}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="text-xs">Code: {event.event_code}</Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Attending Tab */}
          <TabsContent value="attending" className={`space-y-3 ${isMobile ? 'px-2' : ''}`}>
            {upcomingRsvps.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground mb-3">You're not attending any upcoming events</p>
                  <Button size="sm" variant="outline" onClick={() => handleNavigate('/join')}>
                    <Search className="h-4 w-4 mr-2" />
                    Find Events
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {upcomingRsvps.map((rsvp: any) => (
                  <Card key={rsvp.id}>
                    <CardHeader className="py-3">
                      <div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <CardTitle className="text-sm">{rsvp.events?.name}</CardTitle>
                          {rsvp.events?.event_date && (
                            <span className="text-xs text-muted-foreground">
                              in {differenceInDays(new Date(rsvp.events.event_date), new Date())} days
                            </span>
                          )}
                        </div>
                        <CardDescription className="text-xs">
                          {rsvp.events?.event_date && format(new Date(rsvp.events.event_date), 'PPP')}
                        </CardDescription>
                        
                        {/* RSVP Status Display */}
                        <div className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-lg border border-border/50">
                          {(() => {
                            const guestsCountDb = Array.isArray(rsvp.additional_guests) ? rsvp.additional_guests.length : 0;
                            let guestsCountLocal = 0;
                            try { 
                              guestsCountLocal = Number(localStorage.getItem(`rsvp_plus_ones_${rsvp.event_id}`) || '0'); 
                            } catch {}
                            const guestsCount = Math.max(guestsCountDb, guestsCountLocal);
                            
                            const statusText = rsvp.rsvp_status === 'attending' ? 'Attending' : 
                                               rsvp.rsvp_status === 'maybe' ? 'Maybe' : 
                                               'Not Attending';
                            
                            return (
                              <Badge 
                                variant={
                                  rsvp.rsvp_status === 'attending' ? 'default' : 
                                  rsvp.rsvp_status === 'maybe' ? 'secondary' : 
                                  'outline'
                                }
                                className="text-xs h-5 px-2 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => {
                                  setSelectedRsvpForEdit(rsvp);
                                  setEditRsvpDialogOpen(true);
                                }}
                              >
                                {statusText}{guestsCount > 0 ? ` +${guestsCount}` : ''}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>
                    </CardHeader>

                    {/* Action Buttons Row */}
                    <CardContent className="py-2 pt-0 border-t">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedEventForMessage({
                              id: rsvp.event_id,
                              name: rsvp.events?.name,
                              requireEmail: rsvp.events?.require_email_for_messages
                            });
                            setMessageHostDialogOpen(true);
                          }}
                          className="h-8 text-xs"
                        >
                          <Mail className="h-3.5 w-3.5 mr-1.5" />
                          Message Host
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleNavigate(`/event/${rsvp.events?.event_code}`)}
                          className="h-8 text-xs"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" />
                          View Event
                        </Button>
                      </div>
                    </CardContent>

                    {/* Additional Guests Counter Section */}
                    {rsvp.event_settings?.allow_plus_ones && (
                      <CardContent className="py-2 pt-0 border-t">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-medium">Add'tl Guest:</span>
                            {editingGuestCountRsvpId === rsvp.id ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={handleDecrementGuests}
                                  disabled={tempGuestCount === 0}
                                  className="h-7 w-7"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <span className="text-sm font-semibold min-w-[20px] text-center">
                                  {tempGuestCount}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleIncrementGuests(rsvp.event_settings.max_plus_ones)}
                                  disabled={
                                    rsvp.event_settings.max_plus_ones !== null && 
                                    tempGuestCount >= rsvp.event_settings.max_plus_ones
                                  }
                                  className="h-7 w-7"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm font-semibold">
                                {Array.isArray(rsvp.additional_guests) ? rsvp.additional_guests.length : 0}
                              </span>
                            )}
                            {rsvp.event_settings.max_plus_ones && (
                              <span className="text-xs text-muted-foreground">
                                / {rsvp.event_settings.max_plus_ones}
                              </span>
                            )}
                          </div>
                          {editingGuestCountRsvpId === rsvp.id ? (
                            <div className="flex gap-2">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={handleSaveGuestCountClick}
                                className="h-7 text-xs"
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelGuestCount}
                                className="h-7 text-xs"
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEditGuestCount(rsvp)}
                              className="h-7 text-xs"
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    )}

                    {/* Claimed Items Section */}
                    {myClaimedItems.filter(item => item.event_id === rsvp.event_id).length > 0 && (
                      <CardContent className="py-2 pt-0 border-t">
                        {(() => {
                          const eventClaims = myClaimedItems.filter(claim => claim.event_id === rsvp.event_id);
                          const totalMonetary = eventClaims
                            .filter(c => c.claim_type === 'monetary')
                            .reduce((sum, c) => sum + (Number(c.amount_contributed) || 0), 0);
                          const hasMonetary = eventClaims.some(c => c.claim_type === 'monetary');
                          const hasQuantity = eventClaims.some(c => c.claim_type === 'quantity');
                          
                          return (
                            <>
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium">Your contributions:</p>
                                {hasMonetary && totalMonetary > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    Total: ${totalMonetary.toFixed(2)}
                                  </Badge>
                                )}
                              </div>
                              <div className="space-y-2">
                                {/* Monetary Contributions First */}
                                {eventClaims
                                  .filter(claim => claim.claim_type === 'monetary')
                                  .map(claim => (
                                    <div key={claim.id} className="flex items-center justify-between p-2 bg-accent/30 rounded-md border border-primary/20">
                                      <div className="flex-1 flex items-start gap-2">
                                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <span className="text-xs font-bold text-primary">$</span>
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-xs font-medium">
                                            You contributed ${claim.amount_contributed} for {claim.event_items?.name || claim.item?.name || 'item'}
                                          </p>
                                          {claim.payment_verified === false && (
                                            <Badge variant="outline" className="text-xs mt-1 border-amber-500 text-amber-700 dark:text-amber-400">
                                              Pending Verification
                                            </Badge>
                                          )}
                                          {claim.payment_verified === true && (
                                            <Badge variant="outline" className="text-xs mt-1 border-green-500 text-green-700 dark:text-green-400">
                                              Verified ✓
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleUnclaimClick(claim)}
                                        className="h-7 text-xs ml-2"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ))}
                                
                                {/* Quantity Contributions */}
                                {eventClaims
                                  .filter(claim => claim.claim_type === 'quantity')
                                  .map(claim => (
                                    <div key={claim.id} className="flex items-center justify-between p-2 bg-accent/30 rounded-md">
                                      <div className="flex-1 flex items-start gap-2">
                                        <Package className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                        <div>
                                          <p className="text-xs font-medium">
                                            {claim.event_items?.name || claim.item?.name || 'Item'}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            Quantity: {claim.quantity_claimed}
                                          </p>
                                        </div>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleUnclaimClick(claim)}
                                        className="h-7 text-xs ml-2"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ))}
                              </div>
                            </>
                          );
                        })()}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className={`space-y-3 ${isMobile ? 'px-2' : ''}`}>
            <Card>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Activity Feed</CardTitle>
                  {unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={markAllAsRead}>
                      Mark All Read
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by name, email, or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 h-9"
                  />
                  <Select value={activityFilter} onValueChange={setActivityFilter}>
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Activity</SelectItem>
                      <SelectItem value="guest_rsvp">RSVPs</SelectItem>
                      <SelectItem value="item_claimed">Items</SelectItem>
                      <SelectItem value="item_suggested">Suggestions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                {user && filteredActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No notifications found</p>
                ) : !user ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sign in to see your notifications</p>
                ) : (
                  filteredActivities.map(activity => (
                    <div
                      key={activity.id}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-accent ${
                        !activity.is_read ? 'bg-accent/50' : ''
                      }`}
                      onClick={() => {
                        markAsRead(activity.id);
                        handleNavigate(`/dashboard?event=${activity.event_id}`);
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getActivityIcon(activity.activity_type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{getActivityMessage(activity)}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {!activity.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </div>
                  ))
                )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        </>
        )}
        </ScrollArea>
      </DialogContent>

      {/* Unclaim Confirmation Dialog */}
      <AlertDialog open={unclaimConfirmOpen} onOpenChange={setUnclaimConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unclaim this item?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingUnclaim && (
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Item</p>
                    <p className="font-semibold text-foreground text-base">
                      {pendingUnclaim.itemName}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Event</p>
                    <p className="text-sm text-foreground">
                      {pendingUnclaim.eventName}
                    </p>
                  </div>
                  
                  <div className="bg-accent border border-border p-3 rounded-md">
                    <p className="text-sm text-foreground">
                      {pendingUnclaim.claimType === 'quantity' && (
                        <>You claimed <strong>{pendingUnclaim.quantity} unit(s)</strong></>
                      )}
                      {pendingUnclaim.claimType === 'monetary' && (
                        <>You contributed <strong>${pendingUnclaim.amount}</strong></>
                      )}
                    </p>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    This will make the item available for others to claim, and the host will be notified.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelUnclaim}>Keep It</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnclaim} className="bg-destructive hover:bg-destructive/90">
              Yes, Unclaim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Guest Count Confirmation Dialog */}
      <AlertDialog open={guestCountConfirmOpen} onOpenChange={setGuestCountConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Guest Count?</AlertDialogTitle>
            <AlertDialogDescription>
              {editingGuestCountRsvpId && myRsvps.find(r => r.id === editingGuestCountRsvpId) && (
                <div className="space-y-3 pt-2">
                  <div className="bg-accent border border-border p-3 rounded-md">
                    <p className="text-sm text-foreground">
                      You are updating your additional guest count to{' '}
                      <strong className="text-base">{tempGuestCount}</strong> guest{tempGuestCount !== 1 ? 's' : ''}.
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    The host will be notified of this change. You can edit individual guest names later if needed.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelGuestCount}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGuestCountUpdate}>
              Confirm Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Message Host Dialog */}
      {selectedEventForMessage && (
        <MessageHostDialog
          open={messageHostDialogOpen}
          onOpenChange={setMessageHostDialogOpen}
          eventId={selectedEventForMessage.id}
          requireEmail={selectedEventForMessage.requireEmail}
        />
      )}

      {/* Edit RSVP Dialog */}
      {selectedRsvpForEdit && (
        <RSVPWizardDialog
          open={editRsvpDialogOpen}
          onOpenChange={setEditRsvpDialogOpen}
          eventId={selectedRsvpForEdit.event_id}
          eventName={selectedRsvpForEdit.events?.name || ''}
          maxPlusOnes={selectedRsvpForEdit.events?.max_plus_ones || null}
          allowPlusOnes={selectedRsvpForEdit.events?.allow_plus_ones || false}
          rsvpDeadline={selectedRsvpForEdit.events?.rsvp_deadline || null}
          maxAttendees={selectedRsvpForEdit.events?.max_attendees || null}
          requireEmailForRsvp={selectedRsvpForEdit.events?.require_email_for_rsvp || false}
          guestToken={selectedRsvpForEdit.guest_token}
          onSuccess={(updatedRsvp) => {
            if (isGuestSearchSession && guestSearchParams) {
              loadGuestSearchData();
            } else {
              loadAttendeeData();
            }
            setEditRsvpDialogOpen(false);
            toast({
              title: "RSVP Updated",
              description: "Your RSVP has been successfully updated.",
            });
          }}
        />
      )}

    </Dialog>
  );
}
