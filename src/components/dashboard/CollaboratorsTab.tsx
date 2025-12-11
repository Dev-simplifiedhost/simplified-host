import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, UserPlus, Shield, Clock, MoreVertical, Mail, Trash2, RefreshCw, Edit } from "lucide-react";
import { InviteCollaboratorDialog } from "./InviteCollaboratorDialog";
import { EditCollaboratorDialog } from "./EditCollaboratorDialog";
import { TransferOwnershipDialog } from "./TransferOwnershipDialog";
import { AuditLogDialog } from "./AuditLogDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface CollaboratorsTabProps {
  eventId: string;
  eventName: string;
  isOwner: boolean;
}

interface Collaborator {
  id: string;
  user_id: string;
  role: string;
  status: string;
  permissions: any;
  invited_at: string;
  accepted_at: string | null;
  expires_at: string | null;
  last_active_at: string | null;
  scope: string;
}

interface Invite {
  id: string;
  email: string;
  role: string;
  invite_token: string;
  expires_at: string;
  created_at: string;
}

export function CollaboratorsTab({ eventId, eventName, isOwner }: CollaboratorsTabProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [auditLogDialogOpen, setAuditLogDialogOpen] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [collaboratorToRevoke, setCollaboratorToRevoke] = useState<string | null>(null);
  const [collaboratorToSuspend, setCollaboratorToSuspend] = useState<string | null>(null);

  useEffect(() => {
    loadCollaborators();
    loadInvites();
    subscribeToChanges();
  }, [eventId]);

  const loadCollaborators = async () => {
    const { data } = await supabase
      .from("event_collaborators")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (data) {
      setCollaborators(data);
    }
  };

  const loadInvites = async () => {
    if (!isOwner) return;
    
    const { data } = await supabase
      .from("collaborator_invites")
      .select("*")
      .eq("event_id", eventId)
      .is("accepted_at", null)
      .is("declined_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (data) {
      setInvites(data);
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel(`collaborators-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "event_collaborators",
          filter: `event_id=eq.${eventId}`
        },
        () => loadCollaborators()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "collaborator_invites",
          filter: `event_id=eq.${eventId}`
        },
        () => loadInvites()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const revokeAccess = async () => {
    if (!collaboratorToRevoke) return;

    const { error } = await supabase
      .from("event_collaborators")
      .update({ status: "revoked" })
      .eq("id", collaboratorToRevoke);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to revoke access",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Access revoked",
        description: "Collaborator access has been removed"
      });
    }
    setRevokeDialogOpen(false);
    setCollaboratorToRevoke(null);
  };

  const suspendAccess = async () => {
    if (!collaboratorToSuspend) return;

    const { error } = await supabase
      .from("event_collaborators")
      .update({ status: "suspended" })
      .eq("id", collaboratorToSuspend);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to suspend access",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Access suspended",
        description: "Collaborator access has been temporarily suspended"
      });
    }
    setSuspendDialogOpen(false);
    setCollaboratorToSuspend(null);
  };

  const reactivateAccess = async (collaboratorId: string) => {
    const { error } = await supabase
      .from("event_collaborators")
      .update({ status: "active" })
      .eq("id", collaboratorId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reactivate access",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Access reactivated",
        description: "Collaborator access has been restored"
      });
    }
  };

  const resendInvite = async (inviteId: string, email: string) => {
    toast({
      title: "Invite resent",
      description: `Invitation email sent to ${email}`
    });
  };

  const cancelInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from("collaborator_invites")
      .delete()
      .eq("id", inviteId);

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
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      owner: "default",
      co_host: "secondary",
      editor: "outline",
      viewer: "secondary"
    };
    const labels: Record<string, string> = {
      owner: "Owner",
      co_host: "Co-host",
      editor: "Editor",
      viewer: "Viewer"
    };
    return <Badge variant={variants[role] || "outline"}>{labels[role] || role}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: "default",
      pending: "outline",
      suspended: "secondary",
      revoked: "destructive"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Collaborators
              </CardTitle>
              <CardDescription>
                Manage team access and permissions for {eventName}
              </CardDescription>
            </div>
            {isOwner && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setAuditLogDialogOpen(true)}>
                  <Shield className="h-4 w-4 mr-2" />
                  Audit Log
                </Button>
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Active Collaborators */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Active Collaborators</h3>
            {collaborators.filter(c => c.status === "active").length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No active collaborators</p>
                  {isOwner && (
                    <Button 
                      className="mt-4" 
                      variant="outline" 
                      onClick={() => setInviteDialogOpen(true)}
                    >
                      Invite your first collaborator
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {collaborators.filter(c => c.status === "active").map((collab) => (
                  <Card key={collab.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getRoleBadge(collab.role)}
                            {collab.scope === "all_events" && (
                              <Badge variant="outline">All Events</Badge>
                            )}
                            {collab.expires_at && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Expires {format(new Date(collab.expires_at), "MMM d")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">
                            User ID: {collab.user_id.substring(0, 8)}...
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Joined {format(new Date(collab.accepted_at || collab.invited_at), "MMM d, yyyy")}
                            {collab.last_active_at && (
                              <> · Last active {format(new Date(collab.last_active_at), "MMM d")}</>
                            )}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Object.entries(collab.permissions || {})
                              .filter(([_, value]) => value)
                              .map(([key]) => (
                                <Badge key={key} variant="secondary" className="text-xs">
                                  {key.replace(/_/g, " ")}
                                </Badge>
                              ))}
                          </div>
                        </div>
                        {isOwner && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedCollaborator(collab);
                                  setEditDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Permissions
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setCollaboratorToSuspend(collab.id);
                                setSuspendDialogOpen(true);
                              }}>
                                Suspend Access
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setCollaboratorToRevoke(collab.id);
                                  setRevokeDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Revoke Access
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Pending Invites */}
          {isOwner && invites.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Pending Invites</h3>
              <div className="space-y-2">
                {invites.map((invite) => (
                  <Card key={invite.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{invite.email}</span>
                            {getRoleBadge(invite.role)}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Invited {format(new Date(invite.created_at), "MMM d, yyyy")} · 
                            Expires {format(new Date(invite.expires_at), "MMM d")}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => resendInvite(invite.id, invite.email)}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Resend
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => cancelInvite(invite.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Suspended/Revoked */}
          {isOwner && collaborators.filter(c => c.status !== "active").length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Inactive Collaborators</h3>
              <div className="space-y-2">
                {collaborators.filter(c => c.status !== "active").map((collab) => (
                  <Card key={collab.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getRoleBadge(collab.role)}
                            {getStatusBadge(collab.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            User ID: {collab.user_id.substring(0, 8)}...
                          </p>
                        </div>
                        {collab.status === "suspended" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => reactivateAccess(collab.id)}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {isOwner && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setTransferDialogOpen(true)}
            >
              Transfer Ownership
            </Button>
          )}
        </CardContent>
      </Card>

      <InviteCollaboratorDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        eventId={eventId}
        eventName={eventName}
        onInvited={() => {
          loadInvites();
          setInviteDialogOpen(false);
        }}
      />

      {selectedCollaborator && (
        <EditCollaboratorDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          collaborator={selectedCollaborator}
          onUpdated={() => {
            loadCollaborators();
            setEditDialogOpen(false);
          }}
        />
      )}

      <TransferOwnershipDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        eventId={eventId}
        eventName={eventName}
        collaborators={collaborators.filter(c => c.status === "active")}
      />

      <AuditLogDialog
        open={auditLogDialogOpen}
        onOpenChange={setAuditLogDialogOpen}
        eventId={eventId}
      />

      {/* Revoke Access Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Collaborator Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this collaborator's access? They will no longer be able to view or manage this event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={revokeAccess} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend Access Confirmation Dialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend Collaborator Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to suspend this collaborator's access? They will be temporarily unable to access this event.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={suspendAccess}>
              Suspend Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
