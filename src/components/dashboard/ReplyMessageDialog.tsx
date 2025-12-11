import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Phone, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Notification } from "@/hooks/useNotifications";

interface ReplyMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: Notification;
}

export function ReplyMessageDialog({
  open,
  onOpenChange,
  notification,
}: ReplyMessageDialogProps) {
  const [message, setMessage] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  useEffect(() => {
    if (open && notification.reference_id) {
      loadMessage();
      loadReplies();
    }
  }, [open, notification.reference_id]);

  const loadMessage = async () => {
    try {
      const { data, error } = await supabase
        .from("host_messages")
        .select("*")
        .eq("id", notification.reference_id)
        .single();

      if (error) throw error;
      setMessage(data);
    } catch (error) {
      console.error("Error loading message:", error);
      toast.error("Failed to load message");
    }
  };

  const loadReplies = async () => {
    setLoadingReplies(true);
    try {
      const { data, error } = await supabase
        .from("host_message_replies")
        .select("*")
        .eq("message_id", notification.reference_id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setReplies(data || []);
    } catch (error) {
      console.error("Error loading replies:", error);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim()) {
      toast.error("Please enter a reply message");
      return;
    }

    if (replyText.length > 1600) {
      toast.error("Reply is too long. Maximum 1600 characters.");
      return;
    }

    setSendingReply(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms-reply', {
        body: {
          message_id: notification.reference_id,
          event_id: notification.event_id,
          reply_text: replyText,
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("SMS reply sent successfully!", {
        description: `Delivered to ${message.sender_name}`,
      });

      setReplyText("");
      loadReplies();
      await handleMarkAsRead();
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast.error("Failed to send SMS", {
        description: error.message || "Please try again or call the guest directly",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleMarkAsRead = async () => {
    try {
      await supabase
        .from("host_messages")
        .update({ is_read: true })
        .eq("id", notification.reference_id);

      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const getSmsSegmentCount = (text: string) => {
    if (text.length <= 160) return 1;
    return Math.ceil(text.length / 153);
  };

  const getCharacterCountColor = () => {
    if (replyText.length > 1600) return "text-destructive";
    if (replyText.length > 1400) return "text-orange-500";
    return "text-muted-foreground";
  };

  if (!message) return null;

  const smsSegments = getSmsSegmentCount(replyText);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Message from {message.sender_name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Original Message */}
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {message.sender_email || "No email provided"}
              </div>
              <div className="flex items-center gap-1">
                <Phone className="h-4 w-4" />
                {message.sender_phone}
              </div>
            </div>

            {message.message_subject && (
              <p className="font-medium text-lg">{message.message_subject}</p>
            )}

            <p className="text-sm whitespace-pre-wrap">{message.message_body}</p>
          </div>

          {/* Reply History */}
          {replies.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Previous Replies</h4>
              {replies.map((reply) => (
                <div key={reply.id} className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {new Date(reply.sent_at).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {reply.sent_via.toUpperCase()}
                      {reply.delivery_status === 'delivered' && ' ✓'}
                      {reply.delivery_status === 'failed' && ' ✗'}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{reply.reply_text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Reply Composer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Send SMS Reply</label>
              <span className={`text-xs ${getCharacterCountColor()}`}>
                {replyText.length}/1600 chars ({smsSegments} SMS {smsSegments === 1 ? 'segment' : 'segments'})
              </span>
            </div>
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply message here..."
              className="min-h-[120px] resize-none"
              disabled={sendingReply}
              maxLength={1600}
            />
            <p className="text-xs text-muted-foreground">
              Your reply will be sent as an SMS to {message.sender_phone}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleSendReply}
              disabled={sendingReply || !replyText.trim() || replyText.length > 1600}
              className="flex-1"
            >
              {sendingReply ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending SMS...
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send SMS Reply
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() =>
                (window.location.href = `tel:${message.sender_phone}`)
              }
            >
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>

            {message.sender_email && (
              <Button
                variant="outline"
                onClick={() =>
                  (window.location.href = `mailto:${message.sender_email}`)
                }
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
