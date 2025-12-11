import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { CheckCircle2, XCircle, HelpCircle, Search, Download, Trash2, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { formatPhoneNumber } from "@/lib/phoneFormat";
import { BroadcastSMSDialog } from "./BroadcastSMSDialog";

interface GuestsTabProps {
  eventId: string;
  eventName?: string;
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
  source: string;
  created_at: string;
  updated_at: string;
  dietary_preferences?: string[] | null;
  dietary_other?: string | null;
  dietary_allergy?: string | null;
}

export const GuestsTab = ({ eventId, eventName }: GuestsTabProps) => {
  const { toast } = useToast();
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRsvpId, setSelectedRsvpId] = useState<string | null>(null);
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [contributorEmails, setContributorEmails] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadRsvps();
    loadContributorEmails();
    
    // Set up real-time subscription
    const channel = supabase
      .channel(`rsvps-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rsvps',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          loadRsvps();
          toast({
            title: "Guest list updated",
            description: "RSVP changes synced",
          });
        }
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
        description: "Failed to load RSVPs",
        variant: "destructive"
      });
    } else {
      setRsvps((data || []) as RSVP[]);
    }
    setLoading(false);
  };

  const loadContributorEmails = async () => {
    const { data } = await supabase
      .from('item_claims')
      .select('contributor_email')
      .eq('event_id', eventId)
      .eq('claim_type', 'monetary')
      .eq('payment_verified', true);
    
    const emails = new Set(data?.map(d => d.contributor_email?.toLowerCase()).filter(Boolean) as string[] || []);
    setContributorEmails(emails);
  };

  const handleDelete = async () => {
    if (!selectedRsvpId) return;

    const { error } = await supabase
      .from('rsvps')
      .delete()
      .eq('id', selectedRsvpId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete RSVP",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "RSVP deleted successfully"
      });
      loadRsvps();
    }
    setDeleteDialogOpen(false);
    setSelectedRsvpId(null);
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'Status', 'Additional Guests', 'Dietary Preferences', 'Dietary Other', 'Allergy', 'Message', 'Source', 'Date'];
    const rows = filteredRsvps.map(rsvp => [
      rsvp.guest_name,
      rsvp.guest_email || '',
      rsvp.guest_phone ? formatPhoneNumber(rsvp.guest_phone, rsvp.country_code || 'US') : '',
      rsvp.rsvp_status,
      rsvp.additional_guests?.join(', ') || '',
      rsvp.dietary_preferences?.join(', ') || '',
      rsvp.dietary_other || '',
      rsvp.dietary_allergy || '',
      rsvp.message || '',
      rsvp.source,
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
    window.URL.revokeObjectURL(url);
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      attending: "default",
      maybe: "secondary",
      not_attending: "destructive"
    };
    
    return (
      <Badge variant={variants[status] || "default"} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const filteredRsvps = rsvps.filter(rsvp => {
    const matchesSearch = rsvp.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rsvp.guest_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rsvp.guest_phone?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || rsvp.rsvp_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    attending: rsvps.filter(r => r.rsvp_status === 'attending').length,
    maybe: rsvps.filter(r => r.rsvp_status === 'maybe').length,
    not_attending: rsvps.filter(r => r.rsvp_status === 'not_attending').length,
    total: rsvps.length
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Responses</CardDescription>
            <CardTitle className="text-3xl">{counts.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Attending
            </CardDescription>
            <CardTitle className="text-3xl text-green-600">{counts.attending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-yellow-500" />
              Maybe
            </CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{counts.maybe}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Not Attending
            </CardDescription>
            <CardTitle className="text-3xl text-red-600">{counts.not_attending}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search guests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="attending">Attending</SelectItem>
                  <SelectItem value="maybe">Maybe</SelectItem>
                  <SelectItem value="not_attending">Not Attending</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={() => setBroadcastDialogOpen(true)} variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                Broadcast SMS
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading guests...</div>
          ) : filteredRsvps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {rsvps.length === 0 ? "No RSVPs yet" : "No guests match your filters"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Dietary Info</TableHead>
                    <TableHead>Plus One</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRsvps.map((rsvp) => (
                    <TableRow key={rsvp.id}>
                      <TableCell className="font-medium">
                        {rsvp.guest_name}
                        {rsvp.guest_email && contributorEmails.has(rsvp.guest_email.toLowerCase()) && (
                          <Badge variant="outline" className="ml-2 text-green-600 border-green-600 text-xs">
                            💵 Contributed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(rsvp.rsvp_status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {rsvp.guest_phone ? formatPhoneNumber(rsvp.guest_phone, rsvp.country_code || 'US') : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {rsvp.guest_email || '—'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 max-w-xs">
                          {rsvp.dietary_preferences && rsvp.dietary_preferences.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {rsvp.dietary_preferences.map((pref) => (
                                <Badge key={pref} variant="secondary" className="text-xs">
                                  {pref.replace('_', '-')}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                          {rsvp.dietary_other && (
                            <p className="text-xs text-muted-foreground">Other: {rsvp.dietary_other}</p>
                          )}
                          {rsvp.dietary_allergy && (
                            <p className="text-xs text-destructive">⚠️ {rsvp.dietary_allergy}</p>
                          )}
                          {!rsvp.dietary_preferences?.length && !rsvp.dietary_other && !rsvp.dietary_allergy && '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {rsvp.additional_guests && rsvp.additional_guests.length > 0
                          ? rsvp.additional_guests.join(', ')
                          : '—'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{rsvp.message || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rsvp.source}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(rsvp.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedRsvpId(rsvp.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete RSVP?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this guest's RSVP. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Broadcast SMS Dialog */}
      <BroadcastSMSDialog
        open={broadcastDialogOpen}
        onOpenChange={setBroadcastDialogOpen}
        eventId={eventId}
        eventName={eventName || "Event"}
      />
    </div>
  );
};