import { useState, useMemo } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ChevronLeft, ChevronRight, AlertCircle, Bell, Heart, Megaphone } from "lucide-react";
import { AllAnnouncementsSheet } from "./AllAnnouncementsSheet";

interface Announcement {
  id: string;
  title?: string;
  message: string;
  category: string;
  is_pinned?: boolean;
  created_at: string;
}

interface AnnouncementBannerProps {
  announcements: Announcement[];
  allAnnouncements?: Announcement[];
  onDismiss: (id: string) => void;
  onClearDismissals?: () => void;
}

export const AnnouncementBanner = ({ 
  announcements, 
  allAnnouncements,
  onDismiss,
  onClearDismissals 
}: AnnouncementBannerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Sort: pinned first, then by created_at (most recent)
  const sortedAnnouncements = useMemo(() => {
    return [...announcements].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [announcements]);

  const sortedAllAnnouncements = useMemo(() => {
    const list = allAnnouncements || announcements;
    return [...list].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [allAnnouncements, announcements]);

  // Reset index if it's out of bounds
  const safeIndex = Math.min(currentIndex, Math.max(0, sortedAnnouncements.length - 1));
  if (safeIndex !== currentIndex && sortedAnnouncements.length > 0) {
    setCurrentIndex(safeIndex);
  }

  const totalCount = sortedAllAnnouncements.length;
  const dismissedCount = totalCount - sortedAnnouncements.length;

  // If all announcements are dismissed, show a subtle link to view them
  if (sortedAnnouncements.length === 0) {
    if (totalCount === 0) return null;
    
    return (
      <>
        <div className="mb-4 flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground text-sm gap-2"
            onClick={() => setSheetOpen(true)}
          >
            <Megaphone className="h-4 w-4" />
            {totalCount} announcement{totalCount !== 1 ? 's' : ''} from host
          </Button>
        </div>

        <AllAnnouncementsSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          announcements={sortedAllAnnouncements}
          onDismiss={onDismiss}
          onClearDismissals={onClearDismissals}
          dismissedCount={dismissedCount}
        />
      </>
    );
  }

  const current = sortedAnnouncements[safeIndex];
  const hasMultiple = sortedAnnouncements.length > 1;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? sortedAnnouncements.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % sortedAnnouncements.length);
  };

  const getAnnouncementIcon = (category: string) => {
    const iconClass = "h-4 w-4 flex-shrink-0";
    switch (category) {
      case 'alert':
        return <AlertCircle className={`${iconClass} text-red-600`} />;
      case 'reminder':
        return <Bell className={`${iconClass} text-blue-600`} />;
      case 'thank_you':
        return <Heart className={`${iconClass} text-green-600`} />;
      case 'update':
      default:
        return <Megaphone className={`${iconClass} text-amber-600`} />;
    }
  };

  const getAlertClassName = (category: string) => {
    switch (category) {
      case 'alert':
        return 'border-red-500 bg-red-50 dark:bg-red-950';
      case 'reminder':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
      case 'thank_you':
        return 'border-green-500 bg-green-50 dark:bg-green-950';
      case 'update':
      default:
        return 'border-amber-500 bg-amber-50 dark:bg-amber-950';
    }
  };

  return (
    <>
      <Alert className={`mb-4 ${getAlertClassName(current.category)}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 flex-1">
            {getAnnouncementIcon(current.category)}
            <div className="flex-1">
              {current.is_pinned && (
                <Badge variant="default" className="mb-1 text-xs">Pinned</Badge>
              )}
              <AlertDescription className="text-sm">
                {current.title && (
                  <span className="font-semibold block mb-1">{current.title}</span>
                )}
                {current.message.length > 150 
                  ? current.message.substring(0, 150) + '...' 
                  : current.message}
              </AlertDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-transparent"
            onClick={() => onDismiss(current.id)}
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Navigation - only show if multiple announcements OR there are dismissed ones */}
        {(hasMultiple || totalCount > sortedAnnouncements.length) && (
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-current/10 text-sm flex-wrap">
            {hasMultiple && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handlePrev}
                >
                  <ChevronLeft className="h-3 w-3 mr-1" />
                  Prev
                </Button>
                <span className="text-muted-foreground text-xs">
                  {safeIndex + 1} of {sortedAnnouncements.length}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleNext}
                >
                  Next
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
                <span className="text-muted-foreground">•</span>
              </>
            )}
            <Button
              variant="link"
              size="sm"
              className="h-7 px-1 text-xs"
              onClick={() => setSheetOpen(true)}
            >
              View all {totalCount > 1 ? `${totalCount} updates` : 'updates'}
            </Button>
          </div>
        )}
      </Alert>

      <AllAnnouncementsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        announcements={sortedAllAnnouncements}
        onDismiss={onDismiss}
        onClearDismissals={onClearDismissals}
        dismissedCount={dismissedCount}
      />
    </>
  );
};
