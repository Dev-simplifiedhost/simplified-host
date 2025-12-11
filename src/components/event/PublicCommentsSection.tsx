import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { Loader2, AlertCircle, CheckCircle, MessageSquare, ChevronDown, ChevronUp, Shield, Edit2, Trash2 } from "lucide-react";
import { HostReplyDialog } from "./HostReplyDialog";
import { cleanPhoneNumber, getExampleNumber, validatePhoneNumber } from "@/lib/phoneFormat";
import { PhoneInputWithCountry } from "@/components/ui/phone-input";

interface PublicCommentsSectionProps {
  eventId: string;
  hostName?: string;
}

export function PublicCommentsSection({ eventId, hostName }: PublicCommentsSectionProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [pendingComments, setPendingComments] = useState<any[]>([]);
  const [replies, setReplies] = useState<Record<string, any[]>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingRsvp, setCheckingRsvp] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [phoneError, setPhoneError] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>('US');
  const [isAutoVerified, setIsAutoVerified] = useState(false);
  const [isEditingAutoFilled, setIsEditingAutoFilled] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    countryCode: "US",
    comment: "",
  });

  useEffect(() => {
    loadComments();
    loadPendingComments();
    checkIfHost();
    autoVerifyRsvp();

    // Real-time subscription for comments and replies
    const channel = supabase
      .channel(`comments-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "event_comments",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const newComment = payload.new as any;
          if (newComment.status === "approved") {
            if (newComment.parent_comment_id) {
              // It's a reply
              loadRepliesForComment(newComment.parent_comment_id);
            } else {
              // It's a top-level comment
              setComments((prev) => [newComment, ...prev]);
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "event_comments",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const updatedComment = payload.new as any;
          if (updatedComment.status === "approved" && !updatedComment.parent_comment_id) {
            setComments((prev) => {
              const exists = prev.find((c) => c.id === updatedComment.id);
              if (exists) {
                return prev.map((c) =>
                  c.id === updatedComment.id ? updatedComment : c
                );
              } else {
                return [updatedComment, ...prev];
              }
            });
            // Remove from pending if it was there
            setPendingComments((prev) => prev.filter((c) => c.id !== updatedComment.id));
          } else {
            setComments((prev) =>
              prev.filter((c) => c.id !== updatedComment.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  const checkIfHost = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("events")
        .select("user_id")
        .eq("id", eventId)
        .single();

      if (error) throw error;
      setIsHost(data.user_id === user.id);
    } catch (error) {
      console.error("Error checking host status:", error);
    }
  };

  const autoVerifyRsvp = async () => {
    const guestToken = localStorage.getItem(`rsvp_token_${eventId}`);
    if (!guestToken) return;

    try {
      const { data, error } = await supabase
        .rpc('get_my_rsvp_full', {
          p_event_id: eventId,
          p_guest_token: guestToken
        })
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error auto-verifying RSVP:", error);
        return;
      }

      if (data) {
        const rsvpData = data as any;
        if (rsvpData.rsvp_status === 'attending' || rsvpData.rsvp_status === 'maybe') {
          setFormData({
            name: rsvpData.guest_name || "",
            email: rsvpData.guest_email || "",
            phone: rsvpData.guest_phone || "",
            countryCode: rsvpData.country_code || "US",
            comment: "",
          });
          setCountryCode(rsvpData.country_code || "US");
          setRsvpStatus(rsvpData.rsvp_status);
          setIsAutoVerified(true);
        }
      }
    } catch (error) {
      console.error("Error auto-verifying RSVP:", error);
    }
  };

  const handleClearAutoFill = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      countryCode: "US",
      comment: "",
    });
    setCountryCode("US");
    setRsvpStatus(null);
    setIsAutoVerified(false);
    setIsEditingAutoFilled(false);
  };

  const canEditComment = (comment: any) => {
    const createdAt = new Date(comment.created_at);
    const now = new Date();
    const minutesAgo = (now.getTime() - createdAt.getTime()) / 1000 / 60;
    return comment.status === "pending" && minutesAgo <= 15;
  };

  const startEditComment = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.comment_text);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const saveEditComment = async (commentId: string) => {
    if (!editingCommentText.trim()) {
      toast({
        title: "Error",
        description: "Comment cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("event_comments")
        .update({ 
          comment_text: editingCommentText.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", commentId);

      if (error) throw error;

      toast({
        title: "Comment updated",
        description: "Your comment has been updated successfully.",
      });

      setPendingComments(prev => 
        prev.map(c => c.id === commentId 
          ? { ...c, comment_text: editingCommentText.trim() }
          : c
        )
      );
      
      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (error: any) {
      console.error("Error updating comment:", error);
      toast({
        title: "Error",
        description: "Failed to update comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const { error } = await supabase
        .from("event_comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;

      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted.",
      });

      setPendingComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error: any) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from("event_comments")
        .select("*")
        .eq("event_id", eventId)
        .eq("status", "approved")
        .is("parent_comment_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setComments(data || []);
      
      // Load replies for all comments
      if (data && data.length > 0) {
        data.forEach(comment => {
          if (comment.reply_count > 0) {
            loadRepliesForComment(comment.id);
          }
        });
      }
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingComments = async () => {
    try {
      const guestToken = localStorage.getItem(`rsvp_token_${eventId}`);
      if (!guestToken) return;

      const { data: rsvpData } = await supabase
        .rpc('get_my_rsvp_full', {
          p_event_id: eventId,
          p_guest_token: guestToken
        })
        .maybeSingle();

      if (!rsvpData) return;

      const guestEmail = (rsvpData as any).guest_email;
      if (!guestEmail) return;

      const { data, error } = await supabase
        .from("event_comments")
        .select("*")
        .eq("event_id", eventId)
        .eq("status", "pending")
        .eq("commenter_email", guestEmail.toLowerCase())
        .is("parent_comment_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingComments(data || []);
    } catch (error) {
      console.error("Error loading pending comments:", error);
    }
  };

  const loadRepliesForComment = async (commentId: string) => {
    try {
      const { data, error } = await supabase
        .from("event_comments")
        .select("*")
        .eq("parent_comment_id", commentId)
        .eq("status", "approved")
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      setReplies(prev => ({
        ...prev,
        [commentId]: data || []
      }));
    } catch (error) {
      console.error("Error loading replies:", error);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
        // Load replies if not already loaded
        if (!replies[commentId]) {
          loadRepliesForComment(commentId);
        }
      }
      return newSet;
    });
  };

  const handleReply = (comment: any) => {
    setSelectedComment(comment);
    setReplyDialogOpen(true);
  };

  const validatePhone = (phone: string, country: string) => {
    if (!phone) {
      setPhoneError("Phone number is required");
      return false;
    }
    
    const isValid = validatePhoneNumber(phone, country);
    if (!isValid) {
      const countryName = country === 'US' ? 'US' : country === 'GB' ? 'UK' : country;
      setPhoneError(`Please enter a valid ${countryName} phone number`);
      return false;
    }
    
    setPhoneError("");
    return true;
  };

  const handlePhoneChange = (value: string) => {
    setFormData({ ...formData, phone: value });
    if (phoneError) {
      setPhoneError("");
    }
  };

  const checkRsvpStatus = async (phone: string, country: string) => {
    if (!phone || phone.length < 7) {
      setRsvpStatus(null);
      return;
    }

    // Clean phone number for comparison
    const cleanedPhone = cleanPhoneNumber(phone);

    setCheckingRsvp(true);
    try {
      const guestToken = localStorage.getItem(`rsvp_token_${eventId}`);
      if (!guestToken) {
        setRsvpStatus("not_found");
        setCheckingRsvp(false);
        return;
      }

      const { data, error } = await supabase
.rpc('get_my_rsvp_full', {
          p_event_id: eventId,
          p_guest_token: guestToken
        })
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        const r: any = data as any;
        setRsvpStatus(r.rsvp_status);
        setFormData(prev => ({
          ...prev,
          name: r.guest_name || prev.name,
          email: r.guest_email || prev.email,
          phone: r.guest_phone || prev.phone,
          countryCode: r.country_code || country,
        }));
        setCountryCode(r.country_code || country);
      } else {
        setRsvpStatus("not_found");
      }
    } catch (error) {
      console.error("Error checking RSVP:", error);
      setRsvpStatus(null);
    } finally {
      setCheckingRsvp(false);
    }
  };

  const handlePhoneBlur = async () => {
    if (formData.phone) {
      if (validatePhone(formData.phone, countryCode)) {
        await checkRsvpStatus(formData.phone, countryCode);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhone(formData.phone, countryCode)) {
      toast({
        title: "Invalid Phone Number",
        description: phoneError,
        variant: "destructive",
      });
      return;
    }

    // Verify RSVP status before submitting
    if (!formData.phone) {
      toast({
        title: "Phone required",
        description: "Please enter your phone number to verify your RSVP status.",
        variant: "destructive",
      });
      return;
    }

    // Get guest token for server-side validation
    const guestToken = localStorage.getItem(`rsvp_token_${eventId}`);
    if (!guestToken) {
      toast({
        title: "Session expired",
        description: "Please refresh and RSVP again to post comments.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Call secure RPC function to post comment with RSVP verification
      const { data, error } = await supabase.rpc('post_public_comment', {
        p_event_id: eventId,
        p_guest_token: guestToken,
        p_commenter_name: formData.name.trim(),
        p_commenter_email: formData.email.trim() || '',
        p_comment_text: formData.comment.trim(),
        p_guest_phone: cleanPhoneNumber(formData.phone) || '',
        p_country_code: countryCode,
      });

      if (error) throw error;

      toast({
        title: "Comment submitted",
        description: "Your comment is pending approval from the host.",
      });

      setFormData({ name: "", email: "", phone: "", countryCode: "US", comment: "" });
      setRsvpStatus(null);
      loadPendingComments(); // Reload to show the new pending comment
    } catch (error: any) {
      console.error("Error submitting comment:", error);
      
      if (error.code === '42501') {
        toast({
          title: "RSVP required",
          description: "Only guests who have RSVPd as attending or maybe can leave comments.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to submit comment. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mb-6 bg-[#E7EBD8] border-[#D4DBBB]">
      <CardContent className="pt-6">
        <Collapsible open={commentsExpanded} onOpenChange={setCommentsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between p-4 hover:bg-accent mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="text-xl font-semibold">Comments & Discussion ({comments.length})</h3>
              </div>
              {commentsExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
        {/* Pending comments - Editable by guest */}
        {pendingComments.length > 0 && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950 border-amber-300">
                Pending Approval
              </Badge>
              <span className="text-xs text-muted-foreground">Your comments awaiting host approval</span>
            </div>
            {pendingComments.map((comment) => (
              <div key={comment.id} className="border-l-2 border-amber-500/30 pl-4 pb-2 bg-amber-50/30 dark:bg-amber-950/10 p-3 rounded">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{comment.commenter_name}</p>
                    <Badge variant="secondary" className="text-xs bg-amber-100 dark:bg-amber-900">
                      Pending
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </p>
                </div>
                
                {editingCommentId === comment.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingCommentText}
                      onChange={(e) => setEditingCommentText(e.target.value)}
                      placeholder="Your comment"
                      rows={3}
                      maxLength={500}
                      className="bg-white"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveEditComment(comment.id)}
                        disabled={submitting}
                      >
                        {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditComment}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap">{comment.comment_text}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {canEditComment(comment) && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditComment(comment)}
                            className="text-xs h-7"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteComment(comment.id)}
                            className="text-xs h-7 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}
                      {!canEditComment(comment) && (
                        <span className="text-xs text-muted-foreground">
                          Edit window closed (15 min limit)
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
            <Separator className="my-4" />
          </div>
        )}

        {/* Existing approved comments */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-4 mb-6">
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-2">
                <div className="border-l-2 border-primary/20 pl-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{comment.commenter_name}</p>
                      <p className="text-sm mt-1 whitespace-pre-wrap">
                        {comment.comment_text}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-2">
                    {isHost && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReply(comment)}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Reply
                      </Button>
                    )}
                    {comment.reply_count > 0 && (
                      <Collapsible
                        open={expandedComments.has(comment.id)}
                        onOpenChange={() => toggleReplies(comment.id)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown
                              className={`h-3 w-3 mr-1 transition-transform ${
                                expandedComments.has(comment.id)
                                  ? "rotate-180"
                                  : ""
                              }`}
                            />
                            {comment.reply_count}{" "}
                            {comment.reply_count === 1 ? "reply" : "replies"}
                          </Button>
                        </CollapsibleTrigger>
                      </Collapsible>
                    )}
                  </div>
                </div>

                {/* Replies */}
                {expandedComments.has(comment.id) && replies[comment.id] && (
                  <div className="ml-8 space-y-3">
                    {replies[comment.id].map((reply) => (
                      <div
                        key={reply.id}
                        className="border-l-2 border-blue-500/30 pl-4 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{reply.commenter_name}</p>
                              <Badge variant="secondary" className="text-xs">
                                Host
                              </Badge>
                            </div>
                            <p className="text-sm mt-1 whitespace-pre-wrap">
                              {reply.comment_text}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(reply.created_at), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4 mb-6">
            No comments yet. Be the first to share!
          </p>
        )}

        {/* Privacy Notice */}
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 mb-6">
          <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Privacy Note:</strong> Only your first name will be visible publicly. 
            Your email and phone number are kept private and used only for verification.
          </AlertDescription>
        </Alert>

        {/* Add comment form */}
        <Separator className="my-4" />
        <div className="space-y-4">
          {isAutoVerified && !isEditingAutoFilled ? (
            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-900 dark:text-green-100">
                <div className="flex items-center justify-between">
                  <span>
                    <strong>✓ Verified as {formData.name}</strong> - You're ready to comment!
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingAutoFilled(true)}
                      className="text-green-700 hover:text-green-800 h-7"
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAutoFill}
                      className="text-green-700 hover:text-green-800 h-7"
                    >
                      Not you?
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-white/60 border-[#C4D3B3]">
              <AlertCircle className="h-4 w-4 text-[#3D5A3C]" />
              <AlertDescription className="text-[#3D5A3C]">
                Only guests who have RSVPd as "Attending" or "Maybe" can leave comments.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-3">
              <div>
                <Label htmlFor="comment-name">Your Name *</Label>
                <Input
                  id="comment-name"
                  placeholder="Your name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  readOnly={isAutoVerified && !isEditingAutoFilled}
                  className="bg-white border-[#D4DBBB] focus:border-[#3D5A3C]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comment-phone">Phone Number *</Label>
                <PhoneInputWithCountry
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  countryCode={countryCode}
                  onCountryChange={(country) => {
                    setCountryCode(country || 'US');
                    if (formData.phone) {
                      validatePhone(formData.phone, country || 'US');
                    }
                  }}
                  placeholder={getExampleNumber(countryCode)}
                  required
                  disabled={isAutoVerified && !isEditingAutoFilled}
                  className="bg-white"
                  error={phoneError}
                  onBlur={handlePhoneBlur}
                />
              </div>
              <div>
                <Label htmlFor="comment-email">Email (optional)</Label>
                <Input
                  id="comment-email"
                  type="email"
                  placeholder="Email (optional)"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  readOnly={isAutoVerified && !isEditingAutoFilled}
                  className="bg-white border-[#D4DBBB] focus:border-[#3D5A3C]"
                />
              </div>
              <div className="space-y-2">
                {checkingRsvp && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking RSVP status...
                  </p>
                )}
                {rsvpStatus === "attending" && (
                  <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                      RSVP verified - You can leave a comment
                    </AlertDescription>
                  </Alert>
                )}
                {rsvpStatus === "maybe" && (
                  <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800 dark:text-blue-200">
                      RSVP verified (Maybe) - You can leave a comment
                    </AlertDescription>
                  </Alert>
                )}
                {rsvpStatus === "not_attending" && (
                  <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 dark:text-amber-200">
                      You've RSVPd as not attending. Only attending or maybe guests can comment.
                    </AlertDescription>
                  </Alert>
                )}
                {rsvpStatus === "not_found" && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No RSVP found with this phone number. Please RSVP first to leave comments.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
              <div>
                <Label htmlFor="comment-text">Comment *</Label>
                <Textarea
                  id="comment-text"
                  placeholder="Leave a comment..."
                  required
                  maxLength={500}
                  value={formData.comment}
                  onChange={(e) =>
                    setFormData({ ...formData, comment: e.target.value })
                  }
                  disabled={rsvpStatus !== "attending" && rsvpStatus !== "maybe"}
                  className="bg-white border-[#D4DBBB] focus:border-[#3D5A3C]"
                />
              </div>
              <Button 
                type="submit" 
                disabled={
                  submitting || 
                  checkingRsvp || 
                  (rsvpStatus !== "attending" && rsvpStatus !== "maybe")
                }
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Post Comment"
                )}
              </Button>
            </div>
          </form>
        </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>

      {/* Host Reply Dialog */}
      {isHost && selectedComment && (
        <HostReplyDialog
          open={replyDialogOpen}
          onOpenChange={setReplyDialogOpen}
          comment={selectedComment}
          eventId={eventId}
          hostName={hostName || "Host"}
        />
      )}
    </Card>
  );
}
