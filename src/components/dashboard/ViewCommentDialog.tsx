import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import type { Notification } from "@/hooks/useNotifications";

interface ViewCommentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: Notification;
}

export function ViewCommentDialog({
  open,
  onOpenChange,
  notification,
}: ViewCommentDialogProps) {
  const { toast } = useToast();
  const [comment, setComment] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  useEffect(() => {
    if (open && notification.reference_id) {
      loadComment();
    }
  }, [open, notification.reference_id]);

  const loadComment = async () => {
    try {
      const { data, error } = await supabase
        .from("event_comments")
        .select("*")
        .eq("id", notification.reference_id)
        .single();

      if (error) throw error;
      setComment(data);
    } catch (error) {
      console.error("Error loading comment:", error);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("event_comments")
        .update({ status: "approved" })
        .eq("id", notification.reference_id);

      if (error) throw error;

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      toast({
        title: "Comment approved",
        description: "The comment is now visible to everyone.",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error approving comment:", error);
      toast({
        title: "Error",
        description: "Failed to approve comment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHide = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("event_comments")
        .update({ status: "hidden" })
        .eq("id", notification.reference_id);

      if (error) throw error;

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      toast({
        title: "Comment hidden",
        description: "The comment has been hidden from public view.",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error hiding comment:", error);
      toast({
        title: "Error",
        description: "Failed to hide comment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("event_comments")
        .delete()
        .eq("id", notification.reference_id);

      if (error) throw error;

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      toast({
        title: "Comment deleted",
        description: "The comment has been permanently deleted.",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Error",
        description: "Failed to delete comment.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) {
      toast({
        title: "Reply required",
        description: "Please enter a reply message.",
        variant: "destructive",
      });
      return;
    }

    setReplying(true);
    try {
      // Get event and host info
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("host_name")
        .eq("id", notification.event_id)
        .single();

      if (eventError) throw eventError;

      const { error } = await supabase.from("event_comments").insert({
        event_id: notification.event_id,
        parent_comment_id: notification.reference_id,
        commenter_name: eventData.host_name || "Host",
        commenter_email: null,
        comment_text: replyText,
        is_host_reply: true,
        status: "approved",
      });

      if (error) throw error;

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      toast({
        title: "Reply posted",
        description: "Your reply is now visible to all guests.",
      });

      setReplyText("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error posting reply:", error);
      toast({
        title: "Error",
        description: "Failed to post reply. Please try again.",
        variant: "destructive",
      });
    } finally {
      setReplying(false);
    }
  };

  if (!comment) return null;

  const isModerated = comment.status !== "pending";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review & Reply to Comment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="border-l-2 border-primary/20 pl-4 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{comment.commenter_name}</p>
                {comment.commenter_email && (
                  <p className="text-sm text-muted-foreground">
                    {comment.commenter_email}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <p className="text-sm whitespace-pre-wrap">{comment.comment_text}</p>
            <p className="text-xs text-muted-foreground">
              Status: <span className="font-medium">{comment.status}</span>
            </p>
          </div>

          {/* Moderation Actions */}
          {!isModerated && (
            <>
              <Separator className="my-4" />
              <div className="flex gap-2">
                <Button onClick={handleApprove} disabled={loading}>
                  Approve
                </Button>
                <Button
                  variant="outline"
                  onClick={handleHide}
                  disabled={loading}
                >
                  Hide
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                >
                  Delete
                </Button>
              </div>
            </>
          )}

          {/* Quick Reply Section */}
          <Separator className="my-4" />
          <div className="space-y-3">
            <Label htmlFor="reply">Quick Reply (visible to all guests)</Label>
            <Textarea
              id="reply"
              placeholder="Write your reply..."
              maxLength={500}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground">
                Your reply will appear as a host response under this comment
              </p>
              <Button 
                onClick={handleReply} 
                disabled={replying || !replyText.trim()}
              >
                {replying ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  "Post Reply"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
