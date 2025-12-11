import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Search, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Download, 
  MessageSquare,
  DollarSign,
  Package,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { formatPhoneNumber } from "@/lib/phoneFormat";
import { BroadcastSMSDialog } from "./BroadcastSMSDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface EnhancedGuestsTabProps {
  eventId: string;
  eventName: string;
  eventCode: string;
}

interface RSVP {
  id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  country_code: string | null;
  rsvp_status: 'attending' | 'maybe' | 'not_attending';
  message: string | null;
  additional_guests: string[] | null;
  created_at: string;
  dietary_preferences?: string[] | null;
  dietary_other?: string | null;
  dietary_allergy?: string | null;
}

interface ItemClaim {
  contributor_email: string | null;
  contributor_name: string;
  item_name?: string;
}

export const EnhancedGuestsTab = ({ eventId, eventName, eventCode }: EnhancedGuestsTabProps) => {
  const { toast } = useToast();
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRsvpId, setSelectedRsvpId] = useState<string | null>(null);
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [contributorEmails, setContributorEmails] = useState<Set<string>>(new Set());
  const [expandedGuests, setExpandedGuests] = useState<Set<string>>(new Set());
  const [guestClaims, setGuestClaims] = useState<Record<string, ItemClaim[]>>({});

  useEffect(() => {
    loadRsvps();
    loadContributorData();
    
    const channel = supabase
      .channel(`rsvps-enhanced-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rsvps',
          filter: `event_id=eq.${eventId}`
        },
        () => loadRsvps()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const loadRsvps = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rsvps')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load guests",
        variant: "destructive"
      });
    } else {
      setRsvps((data || []) as RSVP[]);
    }
    setLoading(false);
  };

  const loadContributorData = async () => {
    // Load contributor emails
    const { data: contributions } = await supabase
      .from('item_claims')
      .select('contributor_email')
      .eq('event_id', eventId)
      .eq('claim_type', 'monetary')
      .eq('payment_verified', true);
    
    const emails = new Set(contributions?.map(d => d.contributor_email?.toLowerCase()).filter(Boolean) as string[] || []);
    setContributorEmails(emails);

    // Load item claims for each guest
    const { data: claims } = await supabase
      .from('item_claims')
      .select(`
        contributor_email,
        contributor_name,
        item_id,
        event_items(name)
      `)
      .eq('event_id', eventId)
      .eq('claim_type', 'bring');

    const claimsByEmail: Record<string, ItemClaim[]> = {};
    claims?.forEach((claim: any) => {
      const email = claim.contributor_email?.toLowerCase();
      if (email) {
        if (!claimsByEmail[email]) claimsByEmail[email] = [];
        claimsByEmail[email].push({
          contributor_email: claim.contributor_email,
          contributor_name: claim.contributor_name,
          item_name: claim.event_items?.name
        });
      }
    });
    setGuestClaims(claimsByEmail);
  };

  const handleDelete = async () => {
    if (!selectedRsvpId) return;

    const { error } = await supabase
      .from('rsvps')
      .delete()
      .eq('id', selectedRsvpId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete guest", variant: "destructive" });
    } else {
      toast({ title: "Guest removed", description: "RSVP deleted successfully" });
      loadRsvps();
    }
    setDeleteDialogOpen(false);
    setSelectedRsvpId(null);
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/event/${eventCode}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: "Event invite link copied to clipboard" });
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Status', 'Additional Guests', 'Dietary', 'Date'];
    const rows = filteredRsvps.map(rsvp => [
      rsvp.guest_name,
      rsvp.guest_email || '',
      rsvp.guest_phone ? formatPhoneNumber(rsvp.guest_phone, rsvp.country_code || 'US') : '',
      rsvp.rsvp_status,
      rsvp.additional_guests?.join(', ') || '',
      rsvp.dietary_preferences?.join(', ') || '',
      format(new Date(rsvp.created_at), 'PPP')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guest-list-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const toggleExpanded = (rsvpId: string) => {
    setExpandedGuests(prev => {
      const next = new Set(prev);
      if (next.has(rsvpId)) {
        next.delete(rsvpId);
      } else {
        next.add(rsvpId);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'attending':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'maybe':
        return <HelpCircle className="h-4 w-4 text-yellow-500" />;
      case 'not_attending':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'attending': return 'Going';
      case 'maybe': return 'Maybe';
      case 'not_attending': return 'Not Going';
      default: return status;
    }
  };

  const filteredRsvps = rsvps.filter(rsvp => {
    const matchesSearch = rsvp.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rsvp.guest_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rsvp.guest_phone?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || rsvp.rsvp_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: rsvps.length,
    attending: rsvps.filter(r => r.rsvp_status === 'attending').length,
    notAttending: rsvps.filter(r => r.rsvp_status === 'not_attending').length,
    maybe: rsvps.filter(r => r.rsvp_status === 'maybe').length,
  };

  const filterButtons = [
    { value: 'all', label: 'All', count: stats.total },
    { value: 'attending', label: 'Going', count: stats.attending },
    { value: 'not_attending', label: 'Not Going', count: stats.notAttending },
    { value: 'maybe', label: 'Maybe', count: stats.maybe },
  ];

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {stats.total} Guests
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-9" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={() => setBroadcastDialogOpen(true)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Broadcast
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge variant="default" className="bg-green-600">Going: {stats.attending}</Badge>
            <Badge variant="destructive">Not Going: {stats.notAttending}</Badge>
            <Badge variant="secondary">Maybe: {stats.maybe}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search guests..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12"
        />
      </div>

      {/* Sticky Filter Bar */}
      <div className="sticky top-0 z-10 bg-background py-2 -mx-4 px-4 border-b">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filterButtons.map(btn => (
            <Button
              key={btn.value}
              variant={statusFilter === btn.value ? 'default' : 'outline'}
              size="sm"
              className="h-9 whitespace-nowrap"
              onClick={() => setStatusFilter(btn.value)}
            >
              {btn.label} ({btn.count})
            </Button>
          ))}
        </div>
      </div>

      {/* Guest List */}
      {loading ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading guests...
          </CardContent>
        </Card>
      ) : filteredRsvps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {searchTerm ? 'No guests match your search' : 'No guests yet'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRsvps.map((rsvp) => {
            const isExpanded = expandedGuests.has(rsvp.id);
            const hasContributed = rsvp.guest_email && contributorEmails.has(rsvp.guest_email.toLowerCase());
            const claims = rsvp.guest_email ? guestClaims[rsvp.guest_email.toLowerCase()] || [] : [];

            return (
              <Card key={rsvp.id} className="overflow-hidden">
                <CardContent className="p-4">
                  {/* Main Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{rsvp.guest_name}</span>
                        <div className="flex items-center gap-1 text-sm">
                          {getStatusIcon(rsvp.rsvp_status)}
                          <span className="text-muted-foreground">{getStatusLabel(rsvp.rsvp_status)}</span>
                        </div>
                      </div>
                      
                      {rsvp.guest_phone && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatPhoneNumber(rsvp.guest_phone, rsvp.country_code || 'US')}
                        </div>
                      )}

                      {/* Badges */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {rsvp.dietary_preferences?.map(pref => (
                          <Badge key={pref} variant="outline" className="text-xs">
                            {pref}
                          </Badge>
                        ))}
                        {rsvp.dietary_allergy && (
                          <Badge variant="destructive" className="text-xs">
                            Allergy: {rsvp.dietary_allergy}
                          </Badge>
                        )}
                        {hasContributed && (
                          <Badge variant="secondary" className="text-xs">
                            <DollarSign className="h-3 w-3 mr-0.5" />
                            Contributed
                          </Badge>
                        )}
                        {claims.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Package className="h-3 w-3 mr-0.5" />
                            {claims.length} item{claims.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {rsvp.additional_guests && rsvp.additional_guests.length > 0 && (
                          <Badge variant="outline" className="text-xs">
                            +{rsvp.additional_guests.length} guest{rsvp.additional_guests.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0"
                      onClick={() => toggleExpanded(rsvp.id)}
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {rsvp.guest_email && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Email:</span> {rsvp.guest_email}
                        </div>
                      )}
                      {rsvp.message && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Message:</span> {rsvp.message}
                        </div>
                      )}
                      {claims.length > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Bringing:</span>{' '}
                          {claims.map(c => c.item_name).filter(Boolean).join(', ')}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        RSVP'd {formatDistanceToNow(new Date(rsvp.created_at), { addSuffix: true })}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button variant="outline" size="sm" className="h-9" onClick={copyInviteLink}>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Link
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-9 text-destructive hover:text-destructive"
                          onClick={() => {
                            setSelectedRsvpId(rsvp.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Guest?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this guest's RSVP. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Broadcast Dialog */}
      <BroadcastSMSDialog
        open={broadcastDialogOpen}
        onOpenChange={setBroadcastDialogOpen}
        eventId={eventId}
        eventName={eventName}
      />
    </div>
  );
};
