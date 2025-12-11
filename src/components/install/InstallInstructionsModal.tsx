import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Share, MoreVertical, Plus, Check } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

interface InstallInstructionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platformOverride?: 'ios' | 'android' | 'auto';
}

export function InstallInstructionsModal({ 
  open, 
  onOpenChange, 
  platformOverride = 'auto' 
}: InstallInstructionsModalProps) {
  const isMobile = useIsMobile();
  const { platform: detectedPlatform, isPWAEligible } = useInstallPrompt();
  
  const platform = platformOverride === 'auto' ? detectedPlatform : platformOverride;

  const IOSInstructions = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Follow these steps to add SimplifiedHost to your home screen:
      </p>
      <ol className="space-y-4">
        <li className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            1
          </div>
          <div className="flex-1 pt-1">
            <p className="font-medium">Tap the Share button</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Look for <Share className="h-4 w-4 inline" /> at the bottom of Safari
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            2
          </div>
          <div className="flex-1 pt-1">
            <p className="font-medium">Tap "Add to Home Screen"</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Scroll down and tap <Plus className="h-4 w-4 inline" /> Add to Home Screen
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            3
          </div>
          <div className="flex-1 pt-1">
            <p className="font-medium">Tap "Add" to confirm</p>
            <p className="text-sm text-muted-foreground">
              SimplifiedHost will appear on your home screen
            </p>
          </div>
        </li>
      </ol>
    </div>
  );

  const AndroidInstructions = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Follow these steps to add SimplifiedHost to your home screen:
      </p>
      <ol className="space-y-4">
        <li className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            1
          </div>
          <div className="flex-1 pt-1">
            <p className="font-medium">Tap the menu button</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              Look for <MoreVertical className="h-4 w-4 inline" /> in the top-right corner
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            2
          </div>
          <div className="flex-1 pt-1">
            <p className="font-medium">Tap "Add to Home Screen"</p>
            <p className="text-sm text-muted-foreground">
              Or "Install app" if available
            </p>
          </div>
        </li>
        <li className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
            3
          </div>
          <div className="flex-1 pt-1">
            <p className="font-medium">Confirm by tapping "Add"</p>
            <p className="text-sm text-muted-foreground">
              SimplifiedHost will appear on your home screen
            </p>
          </div>
        </li>
      </ol>
    </div>
  );

  const UnsupportedMessage = () => (
    <div className="text-center py-4">
      <p className="text-muted-foreground">
        Home screen installation is not available on this device or browser.
      </p>
    </div>
  );

  const content = (
    <div className="py-2">
      {platform === 'ios' && <IOSInstructions />}
      {platform === 'android' && <AndroidInstructions />}
      {platform === 'unsupported' && <UnsupportedMessage />}
      
      {(platform === 'ios' || platform === 'android') && (
        <div className="mt-6 p-3 bg-primary/5 rounded-lg border border-primary/10">
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">
              Get faster access and work offline
            </span>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="pb-safe">
          <SheetHeader>
            <SheetTitle>Add to Home Screen</SheetTitle>
            <SheetDescription>
              Install SimplifiedHost for quick access
            </SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Home Screen</DialogTitle>
          <DialogDescription>
            Install SimplifiedHost for quick access
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
