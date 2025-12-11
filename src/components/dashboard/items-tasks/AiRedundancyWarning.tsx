import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { findSimilarItems } from "@/lib/itemAiAssist";

interface AiRedundancyWarningProps {
  itemName: string;
  existingItems: { id: string; name: string }[];
  onEditExisting: (itemId: string) => void;
  onDismiss: () => void;
}

export const AiRedundancyWarning = ({
  itemName,
  existingItems,
  onEditExisting,
  onDismiss,
}: AiRedundancyWarningProps) => {
  const [similarItem, setSimilarItem] = useState<{ id: string; name: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (itemName.length < 3) {
      setSimilarItem(null);
      return;
    }

    const match = findSimilarItems(itemName, existingItems);
    setSimilarItem(match);
    setDismissed(false);
  }, [itemName, existingItems]);

  if (!similarItem || dismissed) return null;

  return (
    <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/10 animate-fade-in">
      <AlertTriangle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="flex-1 text-sm">
          Similar item exists: <strong>"{similarItem.name}"</strong>
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => {
              onEditExisting(similarItem.id);
              setDismissed(true);
            }}
          >
            Edit Existing
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => {
              setDismissed(true);
              onDismiss();
            }}
          >
            Add Anyway
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
