import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { trackProEvent } from "@/lib/proAnalytics";

interface ProInterestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  eventId: string;
  source: "collaborators_settings_hint" | "multi_collab_block_modal";
  onSuccess: () => void;
}

export function ProInterestModal({
  open,
  onOpenChange,
  userId,
  userEmail,
  eventId,
  source,
  onSuccess
}: ProInterestModalProps) {
  const [email, setEmail] = useState(userEmail);
  const [submitting, setSubmitting] = useState(false);
  const isMobile = useIsMobile();

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async () => {
    if (!isValidEmail(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      // Upsert to pro_interest table (idempotent)
      const { error } = await supabase
        .from('pro_interest')
        .upsert({
          user_id: userId,
          email: email,
          event_id: eventId,
          feature: 'multi_collaboration',
          source: source
        }, {
          onConflict: 'user_id,feature'
        });

      if (error) throw error;

      // Track analytics
      await trackProEvent('pro_interest_submitted', {
        userId,
        eventId,
        email,
        source,
        tier: 'free'
      });

      toast({
        title: "Thanks!",
        description: "You're on the early access list for Pro."
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save interest:', error);
      toast({
        title: "Something went wrong",
        description: "Please try again later",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = async () => {
    await trackProEvent('pro_interest_dismissed', {
      userId,
      eventId,
      source,
      tier: 'free'
    });
    onOpenChange(false);
  };

  const content = (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="pro-email">Email</Label>
          <Input
            id="pro-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="h-12"
          />
        </div>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleDismiss}>
        <DrawerContent className="pb-safe">
          <DrawerHeader className="text-left">
            <DrawerTitle>Join the Pro Early Access List</DrawerTitle>
            <DrawerDescription>
              Be the first to try multi-collaborator support and advanced permissions when SimplifiedHost Pro launches.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4">
            {content}
          </div>
          <DrawerFooter className="pb-safe">
            <Button onClick={handleSubmit} disabled={submitting} className="h-12">
              {submitting ? "Saving..." : "Notify me"}
            </Button>
            <Button variant="outline" onClick={handleDismiss} className="h-12">
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleDismiss}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join the Pro Early Access List</DialogTitle>
          <DialogDescription>
            Be the first to try multi-collaborator support and advanced permissions when SimplifiedHost Pro launches.
          </DialogDescription>
        </DialogHeader>
        {content}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleDismiss}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving..." : "Notify me"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
