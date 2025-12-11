import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Lightbulb, Trash2, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";

interface MySuggestionsDialogProps {
  eventId: string;
  guestToken: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Suggestion {
  id: string;
  item_name: string;
  category: string;
  description: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export function MySuggestionsDialog({ eventId, guestToken, open, onOpenChange }: MySuggestionsDialogProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open && eventId && guestToken) {
      loadSuggestions();
      
      // Set up real-time subscription
      const channel = supabase
        .channel(`guest-suggestions-${eventId}-${guestToken}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'item_suggestions',
          filter: `event_id=eq.${eventId}`
        }, () => {
          loadSuggestions();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [open, eventId, guestToken]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      
      // Get RSVP id from guest token
      const { data: rsvpData, error: rsvpError } = await supabase
        .from('rsvps')
        .select('id')
        .eq('event_id', eventId)
        .eq('guest_token', guestToken)
        .single();

      if (rsvpError) throw rsvpError;

      // Get suggestions for this RSVP
      const { data, error } = await supabase
        .from('item_suggestions')
        .select('*')
        .eq('event_id', eventId)
        .eq('rsvp_id', rsvpData.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSuggestions((data || []) as Suggestion[]);
    } catch (error: any) {
      console.error('Error loading suggestions:', error);
      toast({
        title: "Error",
        description: "Failed to load your suggestions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);
      
      const { error } = await supabase
        .from('item_suggestions')
        .delete()
        .eq('id', deleteId)
        .eq('event_id', eventId);

      if (error) throw error;

      toast({
        title: "Suggestion deleted",
        description: "Your suggestion has been removed",
      });

      loadSuggestions();
    } catch (error: any) {
      console.error('Error deleting suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to delete suggestion",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="gap-1 bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending Review</Badge>;
    }
  };

  const content = (
    <div className="space-y-4">
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading your suggestions...
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-8">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">You haven't suggested any items yet</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base">{suggestion.item_name}</CardTitle>
                    <CardDescription className="text-xs capitalize">{suggestion.category}</CardDescription>
                  </div>
                  {getStatusBadge(suggestion.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(suggestion.description || suggestion.notes) && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {suggestion.notes || suggestion.description}
                  </p>
                )}
                
                {suggestion.status === 'rejected' && suggestion.rejection_reason && (
                  <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                    <p className="text-xs font-medium text-destructive mb-1">Reason for rejection:</p>
                    <p className="text-xs text-muted-foreground">{suggestion.rejection_reason}</p>
                  </div>
                )}

                {suggestion.status === 'approved' && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3" />
                      This item has been added to the event
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true })}
                  </p>
                  
                  {suggestion.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteId(suggestion.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                My Suggestions
              </DrawerTitle>
              <DrawerDescription>
                Track the status of items you've suggested for this event
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-8">
              {content}
            </div>
          </DrawerContent>
        </Drawer>

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete suggestion?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove your suggestion. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              My Suggestions
            </DialogTitle>
            <DialogDescription>
              Track the status of items you've suggested for this event
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete suggestion?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your suggestion. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
