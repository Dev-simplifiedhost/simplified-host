import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Bell, Share2, UserPlus, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface GuestQuickActionsProps {
  noResponseCount: number;
  onRemindAll: () => void;
  onShareInvite: () => void;
  onAddGuest: () => void;
  onExport: () => void;
}

export const GuestQuickActions = ({
  noResponseCount,
  onRemindAll,
  onShareInvite,
  onAddGuest,
  onExport,
}: GuestQuickActionsProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div 
      className={cn(
        "fixed bottom-20 left-0 right-0 z-30 md:hidden px-4 pb-safe transition-transform duration-300",
        !isVisible && "translate-y-full"
      )}
    >
      <div className="bg-card border border-border rounded-xl shadow-lg p-3">
        <div className="flex items-center justify-between gap-2">
          {noResponseCount > 0 && (
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1 h-10 text-xs"
              onClick={onRemindAll}
            >
              <Bell className="h-4 w-4 mr-1.5" />
              Remind ({noResponseCount})
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-10 text-xs"
            onClick={onShareInvite}
          >
            <Share2 className="h-4 w-4 mr-1.5" />
            Share
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 h-10 text-xs"
            onClick={onAddGuest}
          >
            <UserPlus className="h-4 w-4 mr-1.5" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
};
