import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  AlertDialog, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Lightbulb, Check, X, Clock, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ItemSuggestion {
  id: string;
  item_name: string;
  description: string | null;
  category: string;
  estimated_quantity: number | null;
  estimated_value: number | null;
  suggested_by_name: string;
  suggested_by_email: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

interface SuggestedItemsTabProps {
  eventId: string;
}

export const SuggestedItemsTab = ({ eventId }: SuggestedItemsTabProps) => {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<ItemSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suggestionToDelete, setSuggestionToDelete] = useState<string | null>(null);
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    suggestion: ItemSuggestion | null;
    action: 'approve' | 'reject' | null;
    rejectionReason: string;
  }>({
    open: false,
    suggestion: null,
    action: null,
    rejectionReason: "",
  });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadSuggestions();

    // Real-time subscription
    const channel = supabase
      .channel(`suggestions-${eventId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'item_suggestions',
        filter: `event_id=eq.${eventId}`,
      }, loadSuggestions)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const loadSuggestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('item_suggestions')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error loading suggestions",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSuggestions((data as ItemSuggestion[]) || []);
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!reviewDialog.suggestion) return;

    try {
      setProcessing(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.rpc('approve_item_suggestion', {
        p_suggestion_id: reviewDialog.suggestion.id,
        p_host_user_id: user.id,
      });

      if (error) throw error;

      toast({
        title: "Suggestion approved!",
        description: `"${reviewDialog.suggestion.item_name}" has been added to your event items.`,
      });

      setReviewDialog({ open: false, suggestion: null, action: null, rejectionReason: "" });
      loadSuggestions();
    } catch (error: any) {
      console.error('Error approving suggestion:', error);
      toast({
        title: "Error approving suggestion",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!reviewDialog.suggestion) return;

    try {
      setProcessing(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('item_suggestions')
        .update({
          status: 'rejected',
          rejection_reason: reviewDialog.rejectionReason.trim() || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', reviewDialog.suggestion.id);

      if (error) throw error;

      toast({
        title: "Suggestion rejected",
        description: `"${reviewDialog.suggestion.item_name}" has been rejected.`,
      });

      setReviewDialog({ open: false, suggestion: null, action: null, rejectionReason: "" });
      loadSuggestions();
    } catch (error: any) {
      console.error('Error rejecting suggestion:', error);
      toast({
        title: "Error rejecting suggestion",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!suggestionToDelete) return;
    
    try {
      const { error} = await supabase
        .from('item_suggestions')
        .delete()
        .eq('id', suggestionToDelete);

      if (error) throw error;

      toast({ title: "Suggestion deleted" });
      loadSuggestions();
    } catch (error: any) {
      toast({
        title: "Error deleting suggestion",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setSuggestionToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="gap-1"><Check className="h-3 w-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const reviewedSuggestions = suggestions.filter(s => s.status !== 'pending');

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Review Section */}
      {pendingSuggestions.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Pending Review ({pendingSuggestions.length})
          </h3>
          <div className="grid gap-4">
            {pendingSuggestions.map((suggestion) => (
              <Card key={suggestion.id} className="border-l-4 border-l-primary">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{suggestion.item_name}</CardTitle>
                      <CardDescription>
                        Suggested by <span className="font-medium">{suggestion.suggested_by_name}</span>
                        {' · '}
                        <span className="capitalize">{suggestion.category}</span>
                        {' · '}
                        {formatDistanceToNow(new Date(suggestion.created_at), { addSuffix: true })}
                      </CardDescription>
                    </div>
                    {getStatusBadge(suggestion.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {suggestion.description && (
                    <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                  )}
                  
                  <div className="flex gap-4 text-sm">
                    {suggestion.estimated_quantity && (
                      <div>
                        <span className="text-muted-foreground">Qty:</span>{' '}
                        <span className="font-medium">{suggestion.estimated_quantity}</span>
                      </div>
                    )}
                    {suggestion.estimated_value && (
                      <div>
                        <span className="text-muted-foreground">Value:</span>{' '}
                        <span className="font-medium">${suggestion.estimated_value}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => setReviewDialog({
                        open: true,
                        suggestion,
                        action: 'approve',
                        rejectionReason: "",
                      })}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setReviewDialog({
                        open: true,
                        suggestion,
                        action: 'reject',
                        rejectionReason: "",
                      })}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Reviewed Section */}
      {reviewedSuggestions.length > 0 && (
        <div>
          <h3 className="font-semibold text-lg mb-3">Reviewed ({reviewedSuggestions.length})</h3>
          <div className="grid gap-4">
            {reviewedSuggestions.map((suggestion) => (
              <Card key={suggestion.id} className="opacity-75">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{suggestion.item_name}</CardTitle>
                      <CardDescription>
                        Suggested by {suggestion.suggested_by_name} · {suggestion.category}
                      </CardDescription>
                    </div>
                    {getStatusBadge(suggestion.status)}
                  </div>
                </CardHeader>
                {suggestion.rejection_reason && (
                  <CardContent>
                    <div className="bg-muted p-3 rounded-md text-sm">
                      <p className="font-medium">Rejection reason:</p>
                      <p className="text-muted-foreground mt-1">{suggestion.rejection_reason}</p>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {suggestions.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No guest suggestions yet</h3>
          <p className="text-muted-foreground mb-4">
            Guests can suggest items if the feature is enabled.
          </p>
          <Button variant="outline" asChild>
            <a href={`?event=${eventId}&tab=settings`}>
              Manage Guest Permissions
            </a>
          </Button>
        </div>
      )}

      {/* Review Dialog */}
      <AlertDialog open={reviewDialog.open} onOpenChange={(open) => 
        setReviewDialog({ ...reviewDialog, open })
      }>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {reviewDialog.action === 'approve' ? 'Approve Suggestion?' : 'Reject Suggestion?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {reviewDialog.action === 'approve' ? (
                <>
                  This will add "<strong>{reviewDialog.suggestion?.item_name}</strong>" to your event items list.
                  It will be available for guests to claim immediately.
                </>
              ) : (
                <>
                  This will mark "<strong>{reviewDialog.suggestion?.item_name}</strong>" as rejected.
                  The suggester can view this status in their suggestions list.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {reviewDialog.action === 'reject' && (
            <div className="py-4">
              <Label htmlFor="rejection-reason">Reason (Optional)</Label>
              <Textarea
                id="rejection-reason"
                value={reviewDialog.rejectionReason}
                onChange={(e) => setReviewDialog({
                  ...reviewDialog,
                  rejectionReason: e.target.value,
                })}
                placeholder="Let them know why (e.g., 'We already have this')"
                rows={3}
              />
            </div>
          )}

          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialog({ 
                open: false, 
                suggestion: null, 
                action: null, 
                rejectionReason: "" 
              })}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant={reviewDialog.action === 'approve' ? 'default' : 'destructive'}
              onClick={reviewDialog.action === 'approve' ? handleApprove : handleReject}
              disabled={processing}
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {reviewDialog.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
