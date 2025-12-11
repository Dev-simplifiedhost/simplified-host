import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onExportData: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

export const DeleteAccountDialog = ({
  open,
  onOpenChange,
  userEmail,
  onExportData,
  onDeleteAccount,
}: DeleteAccountDialogProps) => {
  const [confirmText, setConfirmText] = useState("");
  const [dataExported, setDataExported] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExportData();
      setDataExported(true);
      toast.success("Data exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== "DELETE") {
      toast.error('Please type "DELETE" to confirm');
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteAccount();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete account");
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isDeleting) {
      setConfirmText("");
      setDataExported(false);
      onOpenChange(newOpen);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl flex items-center gap-2 text-destructive">
            <Trash2 className="h-6 w-6" />
            Delete Account
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 pt-4">
            <p className="text-base">
              This action will permanently delete your account and all associated data. This includes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>All events you've created</li>
              <li>All tasks and items associated with your events</li>
              <li>Your profile information and settings</li>
              <li>All announcements and reminders</li>
              <li>Collaboration invitations and access</li>
            </ul>
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 space-y-3">
              <p className="font-semibold text-destructive">⚠️ Warning: This action cannot be undone!</p>
              <p className="text-sm">
                We recommend exporting your data before deletion. Your events will be permanently removed
                and guests will no longer be able to access them.
              </p>
            </div>

            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-md">
                <div className="space-y-1">
                  <p className="font-medium">Export Your Data</p>
                  <p className="text-sm text-muted-foreground">
                    Download a copy of all your events and data
                  </p>
                </div>
                <Button
                  onClick={handleExport}
                  disabled={isExporting || dataExported}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {dataExported ? "Exported" : isExporting ? "Exporting..." : "Export Data"}
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="understand"
                    checked={dataExported}
                    disabled
                  />
                  <label
                    htmlFor="understand"
                    className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    I have exported my data (required to proceed)
                  </label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmDelete">
                    Type <span className="font-bold">DELETE</span> to confirm account deletion
                  </Label>
                  <Input
                    id="confirmDelete"
                    placeholder="DELETE"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    disabled={!dataExported || isDeleting}
                    className="font-mono"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Deleting account: <span className="font-semibold">{userEmail}</span>
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!dataExported || confirmText !== "DELETE" || isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete Account Permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
