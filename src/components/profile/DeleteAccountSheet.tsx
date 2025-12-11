import { useState } from "react";
import { ArrowLeft, Download, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

interface DeleteAccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onExportData: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

export function DeleteAccountSheet({
  open,
  onOpenChange,
  userEmail,
  onExportData,
  onDeleteAccount,
}: DeleteAccountSheetProps) {
  const isMobile = useIsMobile();
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

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b bg-background pt-safe">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleOpenChange(false)}
          disabled={isDeleting}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold flex-1 text-destructive">Delete Account</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Warning Banner */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-semibold text-destructive">
                This action cannot be undone
              </p>
              <p className="text-sm text-muted-foreground">
                Deleting your account will permanently remove all your data including:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>All events you've created</li>
                <li>Tasks and items from your events</li>
                <li>Your profile and settings</li>
                <li>All announcements and reminders</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Export Data Section */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Step 1: Export your data</Label>
          <div className="bg-muted/30 rounded-lg p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Download your data</p>
              <p className="text-xs text-muted-foreground">
                Export a copy of all your events
              </p>
            </div>
            <Button
              onClick={handleExport}
              disabled={isExporting || dataExported}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              {dataExported ? "Exported" : isExporting ? "Exporting..." : "Export"}
            </Button>
          </div>
        </div>

        {/* Confirmation Section */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Step 2: Confirm deletion</Label>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-mono font-bold">DELETE</span> to confirm
            </p>
            <Input
              placeholder="DELETE"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={!dataExported || isDeleting}
              className="h-12 font-mono"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Deleting: <span className="font-medium">{userEmail}</span>
          </p>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="shrink-0 border-t bg-background px-4 py-4 pb-safe">
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={!dataExported || confirmText !== "DELETE" || isDeleting}
          className="w-full h-12"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isDeleting ? "Deleting..." : "Delete Account Permanently"}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent className="h-[100dvh] p-0">
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden p-0">
        {content}
      </DialogContent>
    </Dialog>
  );
}
