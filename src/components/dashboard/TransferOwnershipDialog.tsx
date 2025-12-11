import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

interface TransferOwnershipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  collaborators: any[];
}

export function TransferOwnershipDialog({
  open,
  onOpenChange,
  eventId,
  eventName,
  collaborators
}: TransferOwnershipDialogProps) {
  const [loading, setLoading] = useState(false);
  const [newOwnerId, setNewOwnerId] = useState("");

  const handleTransfer = async () => {
    if (!newOwnerId) {
      toast({
        title: "Selection required",
        description: "Please select a collaborator to transfer ownership to",
        variant: "destructive"
      });
      return;
    }

    if (!confirm(`Are you sure you want to transfer ownership of "${eventName}" to this collaborator? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Update event owner
    const { error: eventError } = await supabase
      .from("events")
      .update({ user_id: newOwnerId })
      .eq("id", eventId);

    if (eventError) {
      toast({
        title: "Error",
        description: "Failed to transfer ownership",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    // Update new owner's collaborator record to owner role
    const { error: newOwnerError } = await supabase
      .from("event_collaborators")
      .update({ role: "owner" })
      .eq("event_id", eventId)
      .eq("user_id", newOwnerId);

    // Create collaborator record for old owner as co-host
    const defaultPerms = await supabase.rpc("get_default_permissions", { _role: "co_host" as any });
    
    const { error: oldOwnerError } = await supabase
      .from("event_collaborators")
      .insert([{
        event_id: eventId,
        user_id: user.id,
        role: "co_host",
        status: "active",
        permissions: defaultPerms.data || {}
      }]);

    if (newOwnerError || oldOwnerError) {
      toast({
        title: "Warning",
        description: "Ownership transferred but role updates may have failed",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Ownership transferred",
        description: "The event has been successfully transferred"
      });
      onOpenChange(false);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Ownership</DialogTitle>
          <DialogDescription>
            Transfer full ownership of {eventName} to another collaborator
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This action is permanent and cannot be undone. You will become a co-host after the transfer.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>New Owner</Label>
            <Select value={newOwnerId} onValueChange={setNewOwnerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a collaborator" />
              </SelectTrigger>
              <SelectContent>
                {collaborators.map((collab) => (
                  <SelectItem key={collab.id} value={collab.user_id}>
                    {collab.user_id.substring(0, 8)}... ({collab.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleTransfer} disabled={loading} variant="destructive">
            Transfer Ownership
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
