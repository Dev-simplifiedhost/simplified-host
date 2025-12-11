import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface HostReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comment: any;
  eventId: string;
  hostName: string;
}

export function HostReplyDialog({
  open,
  onOpenChange,
  comment,
  eventId,
  hostName,
}: HostReplyDialogProps) {
  const { toast } = useToast();
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase.from("event_comments").insert({
        event_id: eventId,
        parent_comment_id: comment.id,
        commenter_name: hostName,
        commenter_email: null,
        comment_text: replyText,
        is_host_reply: true,
        status: "approved", // Host replies auto-approved
      });

      if (error) throw error;

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
      setSubmitting(false);
    }
  };

  if (!comment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reply to Comment</DialogTitle>
          <DialogDescription>
            Your reply will be visible to all event guests
          </DialogDescription>
        </DialogHeader>

        {/* Original comment */}
        <div className="border-l-2 border-primary/20 pl-4 bg-muted p-3 rounded">
          <div className="flex justify-between items-start mb-2">
            <p className="font-medium">{comment.commenter_name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
              })}
            </p>
          </div>
          <p className="text-sm whitespace-pre-wrap">{comment.comment_text}</p>
        </div>

        {/* Reply form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Textarea
              placeholder="Write your reply..."
              required
              maxLength={500}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !replyText.trim()}>
                {submitting ? (
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
