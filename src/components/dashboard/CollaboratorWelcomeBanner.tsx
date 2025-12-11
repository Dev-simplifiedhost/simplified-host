import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Users, X } from "lucide-react";

interface CollaboratorWelcomeBannerProps {
  eventId: string;
  eventName: string;
}

export function CollaboratorWelcomeBanner({ eventId, eventName }: CollaboratorWelcomeBannerProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const storageKey = `collaborator_welcome_${eventId}`;
    const hasSeenBanner = localStorage.getItem(storageKey);
    
    if (!hasSeenBanner) {
      setDismissed(false);
    }
  }, [eventId]);

  const handleDismiss = () => {
    const storageKey = `collaborator_welcome_${eventId}`;
    localStorage.setItem(storageKey, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <Alert className="mb-4 border-primary/20 bg-primary/5">
      <Users className="h-4 w-4" />
      <AlertDescription className="flex items-start justify-between gap-4">
        <span className="text-sm">
          You're a collaborator on <span className="font-medium">{eventName}</span>. 
          You can edit items, tasks, and event details, but only the host can manage access, payouts, or delete the event.
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
