import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Share2, Sparkles, PartyPopper } from "lucide-react";

interface PublishSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  onShareEvent: () => void;
  onEnhanceEvent: () => void;
}

export function PublishSuccessModal({
  open,
  onOpenChange,
  eventName,
  onShareEvent,
  onEnhanceEvent,
}: PublishSuccessModalProps) {
  const isMobile = useIsMobile();

  const Content = () => (
    <div className="flex flex-col items-center text-center py-4 space-y-6">
      {/* Celebratory Icon */}
      <div className="relative">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <PartyPopper className="h-8 w-8 text-primary" />
        </div>
        {/* Subtle confetti dots */}
        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-yellow-400 animate-pulse" />
        <div className="absolute -top-2 left-2 h-2 w-2 rounded-full bg-pink-400 animate-pulse delay-100" />
        <div className="absolute -bottom-1 -left-1 h-2.5 w-2.5 rounded-full bg-blue-400 animate-pulse delay-200" />
      </div>

      {/* Message */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">
          Your event is live 🎉
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          You're ready to invite guests. Complete a few optional steps to enhance your event.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-col w-full gap-3 pt-2">
        <Button 
          onClick={onShareEvent}
          className="w-full h-12"
          size="lg"
        >
          <Share2 className="mr-2 h-4 w-4" />
          Share Event
        </Button>
        
        <button
          onClick={onEnhanceEvent}
          className="inline-flex items-center justify-center text-sm font-medium text-primary hover:text-primary/80 transition-colors py-2"
        >
          <Sparkles className="mr-1.5 h-4 w-4" />
          Enhance Event (2 min)
        </button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="pb-safe">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Event Published</DrawerTitle>
            <DrawerDescription>Your event {eventName} is now live</DrawerDescription>
          </DrawerHeader>
          <div className="px-6 pb-6">
            <Content />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Event Published</DialogTitle>
          <DialogDescription>Your event {eventName} is now live</DialogDescription>
        </DialogHeader>
        <Content />
      </DialogContent>
    </Dialog>
  );
}
