import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserPlus, Package, ClipboardPlus, Send, Eye, Pencil, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { SmsStatusPill } from "./messaging/SmsStatusPill";

interface StickyQuickActionsBarProps {
  onAddGuest: () => void;
  onAddItem: () => void;
  onAddTask: () => void;
  onShareEvent: () => void;
  onPreviewPublicPage: () => void;
  onEditEvent: () => void;
  onOpenCommunicationCenter?: () => void;
  eventId?: string;
  className?: string;
}

export function StickyQuickActionsBar({
  onAddGuest,
  onAddItem,
  onAddTask,
  onShareEvent,
  onPreviewPublicPage,
  onEditEvent,
  onOpenCommunicationCenter,
  eventId,
  className,
}: StickyQuickActionsBarProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Subtle fade-in animation on mount
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const actions = [
    { icon: UserPlus, label: "Add Guest", onClick: onAddGuest },
    { icon: Package, label: "Add Item", onClick: onAddItem },
    { icon: ClipboardPlus, label: "Add Task", onClick: onAddTask },
    { icon: Send, label: "Share Event", onClick: onShareEvent },
    { icon: Eye, label: "Preview Public Page", onClick: onPreviewPublicPage },
    { icon: Pencil, label: "Edit Event", onClick: onEditEvent },
  ];

  return (
    <div
      className={cn(
        "sticky top-[6.5rem] z-20 -mx-4 px-4 md:mx-0 md:px-0",
        "bg-background/95 backdrop-blur-sm border-b border-border/50",
        "transition-opacity duration-300",
        isVisible ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="overflow-x-auto scrollbar-hide py-3">
        <div className="flex items-center justify-center gap-2 min-w-max">
          <TooltipProvider delayDuration={300}>
            {actions.map((action) => (
              <Tooltip key={action.label}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={action.onClick}
                    className="h-11 w-11 rounded-full shrink-0 touch-manipulation"
                    aria-label={action.label}
                  >
                    <action.icon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>{action.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}

            {/* SMS Status Pill with Communication Center */}
            {eventId && onOpenCommunicationCenter && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <SmsStatusPill
                      eventId={eventId}
                      onClick={onOpenCommunicationCenter}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>Communication Center</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

export default StickyQuickActionsBar;
