import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { trackProEvent } from "@/lib/proAnalytics";
import { ProInterestModal } from "./ProInterestModal";
import { Check } from "lucide-react";

interface CollaboratorLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  eventId: string;
  hasJoinedEarlyAccess: boolean;
  onInterestSubmitted: () => void;
}

export function CollaboratorLimitModal({
  open,
  onOpenChange,
  userId,
  userEmail,
  eventId,
  hasJoinedEarlyAccess,
  onInterestSubmitted
}: CollaboratorLimitModalProps) {
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const isMobile = useIsMobile();

  // Track blocked event when modal opens
  useEffect(() => {
    if (open && userId) {
      trackProEvent('pro_multi_collab_blocked', {
        userId,
        eventId,
        tier: 'free'
      });
    }
  }, [open, userId, eventId]);

  const handleGetEarlyAccess = async () => {
    await trackProEvent('pro_interest_clicked', {
      userId,
      eventId,
      source: 'multi_collab_block_modal',
      tier: 'free'
    });
    setInterestModalOpen(true);
  };

  const handleInterestSuccess = () => {
    onInterestSubmitted();
    onOpenChange(false);
  };

  // Content when user has already joined
  const alreadyJoinedContent = (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
      <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium text-sm">You're already on the early access list for Pro.</p>
        <p className="text-xs text-muted-foreground mt-1">
          We'll notify you when multi-collaborator support is available.
        </p>
      </div>
    </div>
  );

  // Content when user hasn't joined yet
  const notJoinedContent = (
    <p className="text-sm text-muted-foreground">
      Free events include one collaborator. Multi-collaborator support and advanced role controls are coming soon with SimplifiedHost Pro.
    </p>
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="pb-safe">
            <DrawerHeader className="text-left">
              <DrawerTitle>You've reached the Free-tier limit</DrawerTitle>
              <DrawerDescription asChild>
                <div className="mt-2">
                  {hasJoinedEarlyAccess ? alreadyJoinedContent : notJoinedContent}
                </div>
              </DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="pb-safe">
              {!hasJoinedEarlyAccess && (
                <Button onClick={handleGetEarlyAccess} className="h-12">
                  Get early access
                </Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)} className="h-12">
                {hasJoinedEarlyAccess ? "Got it" : "Cancel"}
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>

        <ProInterestModal
          open={interestModalOpen}
          onOpenChange={setInterestModalOpen}
          userId={userId}
          userEmail={userEmail}
          eventId={eventId}
          source="multi_collab_block_modal"
          onSuccess={handleInterestSuccess}
        />
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>You've reached the Free-tier limit</DialogTitle>
            <DialogDescription asChild>
              <div className="mt-2">
                {hasJoinedEarlyAccess ? alreadyJoinedContent : notJoinedContent}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {hasJoinedEarlyAccess ? "Got it" : "Cancel"}
            </Button>
            {!hasJoinedEarlyAccess && (
              <Button onClick={handleGetEarlyAccess}>
                Get early access
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProInterestModal
        open={interestModalOpen}
        onOpenChange={setInterestModalOpen}
        userId={userId}
        userEmail={userEmail}
        eventId={eventId}
        source="multi_collab_block_modal"
        onSuccess={handleInterestSuccess}
      />
    </>
  );
}
