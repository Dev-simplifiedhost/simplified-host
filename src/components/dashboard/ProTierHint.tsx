import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { trackProEvent } from "@/lib/proAnalytics";
import { ProInterestModal } from "./ProInterestModal";

interface ProTierHintProps {
  eventId: string;
  userId: string;
  userEmail: string;
  hasJoinedEarlyAccess: boolean;
  onInterestSubmitted: () => void;
}

export function ProTierHint({
  eventId,
  userId,
  userEmail,
  hasJoinedEarlyAccess,
  onInterestSubmitted
}: ProTierHintProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  // Track hint viewed (only once per session)
  useEffect(() => {
    if (!hasTrackedView && !hasJoinedEarlyAccess && userId) {
      trackProEvent('pro_hint_viewed', {
        userId,
        eventId,
        tier: 'free'
      });
      setHasTrackedView(true);
    }
  }, [hasTrackedView, hasJoinedEarlyAccess, userId, eventId]);

  const handleCTAClick = async () => {
    await trackProEvent('pro_interest_clicked', {
      userId,
      eventId,
      source: 'collaborators_settings_hint',
      tier: 'free'
    });
    setModalOpen(true);
  };

  // State B: Already joined early access
  if (hasJoinedEarlyAccess) {
    return (
      <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-2">
          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm text-foreground">
              You're on the list for Pro.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              We'll notify you when multi-collaborator support and advanced permissions are ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State A: Not yet joined early access
  return (
    <>
      <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30">
        <p className="font-semibold text-sm text-foreground">
          Planning something bigger?
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Multi-collaborator support and advanced role controls will be available soon with SimplifiedHost Pro.
        </p>
        <Button 
          variant="secondary" 
          size="sm" 
          className="mt-3"
          onClick={handleCTAClick}
        >
          Get early access
        </Button>
      </div>

      <ProInterestModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        userId={userId}
        userEmail={userEmail}
        eventId={eventId}
        source="collaborators_settings_hint"
        onSuccess={onInterestSubmitted}
      />
    </>
  );
}
