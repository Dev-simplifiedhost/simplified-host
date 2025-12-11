import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

interface EditCollaboratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collaborator: any;
  onUpdated: () => void;
}

const PERMISSIONS = [
  { key: "manage_rsvps", label: "Manage RSVPs" },
  { key: "manage_items", label: "Manage Items" },
  { key: "post_announcements", label: "Post Announcements" },
  { key: "send_reminders", label: "Send Reminders" },
  { key: "view_contributions", label: "View Contributions ($)" },
  { key: "edit_event_details", label: "Edit Event Details" },
  { key: "manage_payments", label: "Manage Payments" },
  { key: "invite_others", label: "Invite Others" },
  { key: "export_data", label: "Export Data" },
  { key: "delete_content", label: "Delete Content" }
];

export function EditCollaboratorDialog({
  open,
  onOpenChange,
  collaborator,
  onUpdated
}: EditCollaboratorDialogProps) {
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState(collaborator.role);
  const [permissions, setPermissions] = useState(collaborator.permissions || {});

  useEffect(() => {
    setRole(collaborator.role);
    setPermissions(collaborator.permissions || {});
  }, [collaborator]);

  const handleUpdate = async () => {
    setLoading(true);

    const { error } = await supabase
      .from("event_collaborators")
      .update({
        role,
        permissions
      })
      .eq("id", collaborator.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update collaborator",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Collaborator updated",
        description: "Permissions have been updated successfully"
      });
      onUpdated();
    }

    setLoading(false);
  };

  const handleRoleChange = async (newRole: string) => {
    setRole(newRole);
    
    // Load default permissions for new role
    const { data: defaultPerms, error } = await supabase
      .rpc("get_default_permissions", { _role: newRole as any });
    
    if (defaultPerms && !error) {
      setPermissions(defaultPerms as Record<string, boolean>);
    }
  };

  const togglePermission = (key: string) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Collaborator Permissions</DialogTitle>
          <DialogDescription>
            Customize access and capabilities for this collaborator
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={handleRoleChange}>
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
              <h4 className="text-sm font-semibold mb-4">Granular Permissions</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PERMISSIONS.map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <Label htmlFor={key} className="text-sm cursor-pointer">
                      {label}
                    </Label>
                    <Switch
                      id={key}
                      checked={permissions[key] || false}
                      onCheckedChange={() => togglePermission(key)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={loading}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
