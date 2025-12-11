import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface HostPreviewBarProps {
  eventId: string;
  eventName: string;
  className?: string;
}

export function HostPreviewBar({ eventId, eventName, className }: HostPreviewBarProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleBackToEventCenter = () => {
    navigate(`/dashboard?event=${eventId}&tab=overview`);
  };

  const handleOpenSettings = () => {
    // Navigate to dashboard with a query param to indicate settings should open
    navigate(`/dashboard?event=${eventId}&tab=overview&openSettings=true`);
  };

  // Mobile: Floating icon controls
  if (isMobile) {
    return (
      <div 
        className={cn(
          "fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-3 pt-safe",
          "bg-background/95 backdrop-blur-sm border-b border-border/50",
          "h-14",
          className
        )}
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBackToEventCenter}
          className="h-11 w-11 rounded-full touch-manipulation"
          aria-label="Back to Event Center"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <span className="text-sm font-medium truncate max-w-[200px] text-center flex-1">
          {eventName}
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleOpenSettings}
          className="h-11 w-11 rounded-full touch-manipulation"
          aria-label="Event Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  // Desktop: Full-width top bar
  return (
    <div 
      className={cn(
        "sticky top-0 z-50 bg-muted/80 backdrop-blur-sm border-b border-border",
        "py-2 px-4",
        className
      )}
    >
      <div className="container mx-auto max-w-6xl flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToEventCenter}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Event Center
        </Button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Previewing: <span className="font-medium text-foreground">{eventName}</span>
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenSettings}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default HostPreviewBar;
