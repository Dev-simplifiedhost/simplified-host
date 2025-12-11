import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Users, UserPlus, X, Clock, Copy, Check, MessageSquare, Link as LinkIcon } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { FreeTierInviteDialog } from "./FreeTierInviteDialog";
import { ProTierHint } from "./ProTierHint";
import { CollaboratorLimitModal } from "./CollaboratorLimitModal";

interface CollaboratorsSectionProps {
  eventId: string;
  eventName: string;
  isOwner: boolean;
  userId?: string;
  userEmail?: string;
}

interface Collaborator {
  id: string;
  user_id: string;
  role: string;
  status: string;
  permissions: any;
  accepted_at: string | null;
  last_active_at: string | null;
}

interface Invite {
  id: string;
  email: string;
  name: string | null;
  role: string;
  expires_at: string;
  created_at: string;
  invite_token: string;
  delivery_method: string | null;
  sms_sent_at: string | null;
  phone: string | null;
}

export function CollaboratorsSection({ eventId, eventName, isOwner, userId = '', userEmail = '' }: CollaboratorsSectionProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [collaboratorToRemove, setCollaboratorToRemove] = useState<string | null>(null);
  const [cancelInviteId, setCancelInviteId] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, { display_name: string | null; email: string | null }>>({});
  const [hasJoinedEarlyAccess, setHasJoinedEarlyAccess] = useState(false);
  const [limitModalOpen, setLimitModalOpen] = useState(false);

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToChanges();
    return unsubscribe;
  }, [eventId]);

  // Check if user has already joined Pro early access
  useEffect(() => {
    const checkEarlyAccess = async () => {
      if (!userId) return;
      const { data } = await supabase
        .from('pro_interest')
        .select('id')
        .eq('user_id', userId)
        .eq('feature', 'multi_collaboration')
        .maybeSingle();
      setHasJoinedEarlyAccess(!!data);
    };
    checkEarlyAccess();
  }, [userId]);

  const loadData = async () => {
    await Promise.all([loadCollaborators(), loadInvites()]);
  };

  const loadCollaborators = async () => {
    const { data } = await supabase
      .from("event_collaborators")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "active");

    if (data) {
      setCollaborators(data);
      // Load user profiles for collaborators
      const userIds = data.map(c => c.user_id);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);
        
        if (profiles) {
          const profileMap: Record<string, { display_name: string | null; email: string | null }> = {};
          profiles.forEach(p => {
            profileMap[p.id] = { display_name: p.display_name, email: null };
          });
          setUserProfiles(profileMap);
        }
      }
    }
  };

  const loadInvites = async () => {
    if (!isOwner) return;
    
    const { data } = await supabase
      .from("collaborator_invites")
      .select("id, email, name, role, expires_at, created_at, invite_token, delivery_method, sms_sent_at, phone")
      .eq("event_id", eventId)
      .is("accepted_at", null)
      .is("declined_at", null)
      .gt("expires_at", new Date().toISOString());

    if (data) {
      setInvites(data as Invite[]);
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel(`collab-section-${eventId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "event_collaborators",
        filter: `event_id=eq.${eventId}`
      }, loadCollaborators)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "collaborator_invites",
        filter: `event_id=eq.${eventId}`
      }, loadInvites)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleRemoveCollaborator = async () => {
    if (!collaboratorToRemove) return;

    const { error } = await supabase
      .from("event_collaborators")
      .update({ status: "revoked" })
      .eq("id", collaboratorToRemove);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove collaborator",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Collaborator removed",
        description: "They can no longer edit this event"
      });
    }
    setRemoveDialogOpen(false);
    setCollaboratorToRemove(null);
  };

  const handleCancelInvite = async () => {
    if (!cancelInviteId) return;

    const { error } = await supabase
      .from("collaborator_invites")
      .delete()
      .eq("id", cancelInviteId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to cancel invite",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Invite cancelled",
        description: "The invitation has been cancelled"
      });
    }
    setCancelInviteId(null);
  };

  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const getInitials = (name: string | null, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  const handleCopyInviteLink = async (invite: Invite) => {
    const link = `${window.location.origin}/invite/${invite.invite_token}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedInviteId(invite.id);
      toast({
        title: "Link copied!",
        description: "Share this link with your collaborator"
      });
      setTimeout(() => setCopiedInviteId(null), 3000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  const getExpiryText = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    return `Expires ${formatDistanceToNow(expiryDate, { addSuffix: true })}`;
  };

  const hasCollaboratorOrInvite = collaborators.length > 0 || invites.length > 0;
  const canInvite = isOwner && !hasCollaboratorOrInvite;

  // Handler for invite button click - intercept if limit reached
  const handleInviteClick = () => {
    if (hasCollaboratorOrInvite) {
      setLimitModalOpen(true);
    } else {
      setInviteDialogOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Collaborators</h3>
        </div>
        {isOwner && (
          <Button size="sm" variant="outline" onClick={handleInviteClick}>
            <UserPlus className="h-4 w-4 mr-1" />
            Invite
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Invite one trusted co-planner to help you edit items, tasks, and details for this event.
      </p>

      {/* Empty State */}
      {!hasCollaboratorOrInvite && (
        <Card>
          <CardContent className="py-8 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground mb-4">
              You don't have a collaborator yet.
            </p>
            {isOwner && (
              <Button variant="outline" onClick={() => setInviteDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite collaborator
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active Collaborator */}
      {collaborators.map((collab) => (
        <Card key={collab.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(userProfiles[collab.user_id]?.display_name || null)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {userProfiles[collab.user_id]?.display_name || 'Collaborator'}
                    </span>
                    <Badge variant="default" className="text-xs">Active</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Can edit items, tasks, and event details
                  </p>
                  {collab.accepted_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined {format(new Date(collab.accepted_at), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              </div>
              {isOwner && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    setCollaboratorToRemove(collab.id);
                    setRemoveDialogOpen(true);
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Pending Invite */}
      {invites.map((invite) => (
        <Card key={invite.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  {invite.delivery_method === 'sms' ? (
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {invite.name || invite.email}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                  {invite.name && (
                    <p className="text-xs text-muted-foreground">{invite.email}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <p className="text-xs text-muted-foreground">
                      {invite.delivery_method === 'sms' ? 'Sent via SMS' : 'Link shared'}
                    </p>
                    <span className="text-xs text-muted-foreground">•</span>
                    <p className="text-xs text-muted-foreground">
                      {getExpiryText(invite.expires_at)}
                    </p>
                  </div>
                </div>
              </div>
              {isOwner && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleCopyInviteLink(invite)}
                    className="h-8 px-2"
                  >
                    {copiedInviteId === invite.id ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setCancelInviteId(invite.id)}
                    className="h-8 px-2"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Pro tier hint - only show to owner when they have exactly 1 collaborator */}
      {hasCollaboratorOrInvite && isOwner && userId && (
        <ProTierHint
          eventId={eventId}
          userId={userId}
          userEmail={userEmail}
          hasJoinedEarlyAccess={hasJoinedEarlyAccess}
          onInterestSubmitted={() => setHasJoinedEarlyAccess(true)}
        />
      )}

      {/* Dialogs */}
      <FreeTierInviteDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        eventId={eventId}
        eventName={eventName}
        onInvited={() => {
          loadInvites();
          setInviteDialogOpen(false);
        }}
      />

      {/* Collaborator Limit Modal */}
      {userId && (
        <CollaboratorLimitModal
          open={limitModalOpen}
          onOpenChange={setLimitModalOpen}
          userId={userId}
          userEmail={userEmail}
          eventId={eventId}
          hasJoinedEarlyAccess={hasJoinedEarlyAccess}
          onInterestSubmitted={() => setHasJoinedEarlyAccess(true)}
        />
      )}

      {/* Remove Collaborator Dialog */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove collaborator?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove them as a collaborator on this event. They'll lose access to your planning tools but will remain a guest if they were invited as one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveCollaborator}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invite Dialog */}
      <AlertDialog open={!!cancelInviteId} onOpenChange={(open) => !open && setCancelInviteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the pending invitation. You can send a new one later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep invite</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelInvite}>
              Cancel invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
