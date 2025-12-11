import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";

interface InviteCollaboratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  onInvited: () => void;
}

const ROLE_DESCRIPTIONS = {
  co_host: {
    title: "Co-host",
    description: "Almost full control - can manage all aspects except deletion and ownership transfer",
    permissions: ["Manage RSVPs", "Manage Items", "Post Announcements", "Send Reminders", "View Contributions", "Edit Event Details", "Manage Payments", "Invite Others", "Export Data", "Delete Content"]
  },
  editor: {
    title: "Editor",
    description: "Can manage attendees, items, and announcements with limited settings access",
    permissions: ["Manage RSVPs", "Manage Items", "Post Announcements", "Send Reminders", "Edit Event Details", "Export Data"]
  },
  viewer: {
    title: "Viewer",
    description: "Read-only access to dashboard without modification abilities",
    permissions: []
  }
};

export function InviteCollaboratorDialog({
  open,
  onOpenChange,
  eventId,
  eventName,
  onInvited
}: InviteCollaboratorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"co_host" | "editor" | "viewer">("editor");
  const [note, setNote] = useState("");
  const [scope, setScope] = useState<"event" | "all_events">("event");
  const [expiresInDays, setExpiresInDays] = useState<number | null>(null);
  const [customPermissions, setCustomPermissions] = useState<Record<string, boolean>>({});

  const handleInvite = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    // Get default permissions for role
    const { data: defaultPerms } = await supabase
      .rpc("get_default_permissions", { _role: role as any });

    const permissions = Object.keys(customPermissions).length > 0 
      ? customPermissions 
      : (defaultPerms || {});

    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from("collaborator_invites")
      .insert([{
        event_id: eventId,
        email: email.trim().toLowerCase(),
        role,
        permissions,
        invited_by: (await supabase.auth.getUser()).data.user?.id || "",
        note: note.trim() || null,
        scope,
        expires_at: expiresAt
      }]);

    if (error) {
      toast({
        title: "Error",
        description: error.message.includes("duplicate") 
          ? "This email has already been invited to this event" 
          : "Failed to send invitation",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Invitation sent",
        description: `Invite sent to ${email}`
      });
      setEmail("");
      setNote("");
      setCustomPermissions({});
      onInvited();
    }

    setLoading(false);
  };

  const roleInfo = ROLE_DESCRIPTIONS[role];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Collaborator</DialogTitle>
          <DialogDescription>
            Send an invitation to collaborate on {eventName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="collaborator@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(value: any) => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="co_host">Co-host</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">{roleInfo.title}</p>
                  <p className="text-sm text-muted-foreground mb-2">{roleInfo.description}</p>
                  {roleInfo.permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {roleInfo.permissions.map((perm) => (
                        <Badge key={perm} variant="secondary" className="text-xs">
                          {perm}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="scope">Access Scope</Label>
            <Select value={scope} onValueChange={(value: any) => setScope(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event">This event only</SelectItem>
                <SelectItem value="all_events">All my events</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiry">Expires After (days, optional)</Label>
            <Input
              id="expiry"
              type="number"
              min="1"
              max="365"
              placeholder="Leave empty for no expiration"
              value={expiresInDays || ""}
              onChange={(e) => setExpiresInDays(e.target.value ? parseInt(e.target.value) : null)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Add a personal message with the invitation..."
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{note.length}/500 characters</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading}>
            Send Invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
