import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, WifiOff, Archive } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditModeBannerProps {
  isEditing: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
  isArchived?: boolean;
  isOnline?: boolean;
}

export function EditModeBanner({
  isEditing,
  hasUnsavedChanges,
  isSaving,
  onSave,
  onCancel,
  isArchived = false,
  isOnline = true,
}: EditModeBannerProps) {
  if (!isEditing) return null;

  return (
    <div className="space-y-2">
      {/* Offline warning */}
      {!isOnline && (
        <Alert variant="destructive" className="py-2">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="text-xs">
            You're offline — changes will not save until connection returns.
          </AlertDescription>
        </Alert>
      )}

      {/* Archived event notice */}
      {isArchived && (
        <Alert className="py-2 bg-muted border-muted-foreground/20">
          <Archive className="h-4 w-4" />
          <AlertDescription className="text-xs">
            This event is archived. Editing will not make it active.
          </AlertDescription>
        </Alert>
      )}

      {/* Main edit mode banner */}
      <div className={cn(
        "flex items-center justify-between gap-3 p-3 rounded-lg border",
        hasUnsavedChanges 
          ? "bg-accent/30 border-accent" 
          : "bg-muted/50 border-border"
      )}>
        <span className="text-sm font-medium text-foreground">
          {hasUnsavedChanges 
            ? "Editing Event — Changes not yet saved" 
            : "Editing Event"}
        </span>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSaving}
            className="h-8"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onSave}
            disabled={isSaving || !isOnline}
            className="h-8"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
