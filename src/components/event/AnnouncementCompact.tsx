import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Megaphone, ChevronDown } from "lucide-react";
import { AllAnnouncementsSheet } from "./AllAnnouncementsSheet";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title?: string;
  message: string;
  category: string;
  is_pinned?: boolean;
  created_at: string;
}

interface AnnouncementCompactProps {
  announcements: Announcement[];
  allAnnouncements?: Announcement[];
  onDismiss: (id: string) => void;
  onClearDismissals?: () => void;
  isArchived?: boolean;
}

export const AnnouncementCompact = ({ 
  announcements, 
  allAnnouncements,
  onDismiss,
  onClearDismissals,
  isArchived = false
}: AnnouncementCompactProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const totalCount = sortedAllAnnouncements.length;
  const dismissedCount = totalCount - sortedAnnouncements.length;
  const latestAnnouncement = sortedAnnouncements[0];

  // Auto-expand if there are unread announcements
  useEffect(() => {
    if (sortedAnnouncements.length > 0 && !isArchived) {
      setIsExpanded(true);
    }
  }, [sortedAnnouncements.length, isArchived]);

  // Auto-collapse on scroll
  useEffect(() => {
    if (!isExpanded) return;

    const handleScroll = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.bottom < 0) {
          setIsExpanded(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isExpanded]);

  // Don't show for archived events
  if (isArchived) return null;
  
  // No announcements at all
  if (totalCount === 0) return null;

  // All announcements dismissed - show subtle link
  if (sortedAnnouncements.length === 0) {
    return (
      <>
        <button
          onClick={() => setSheetOpen(true)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors py-2 text-sm"
        >
          <Megaphone className="h-4 w-4" />
          <span>{totalCount} announcement{totalCount !== 1 ? 's' : ''} from your host</span>
        </button>

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

  return (
    <div ref={containerRef} className="mb-4">
      {/* Collapsed State */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors py-2 text-sm w-full text-left"
        >
          <Megaphone className="h-4 w-4 flex-shrink-0" />
          <span>{sortedAnnouncements.length} announcement{sortedAnnouncements.length !== 1 ? 's' : ''} from your host</span>
          <ChevronDown className="h-3.5 w-3.5 ml-auto" />
        </button>
      )}

      {/* Expanded State - Show only latest announcement */}
      {isExpanded && latestAnnouncement && (
        <div className="bg-muted/40 border border-border/50 rounded-lg p-3 sm:p-3.5 space-y-2">
          <div className="flex items-start gap-2">
            <Megaphone className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">A note from your host</p>
              <p className="text-sm leading-relaxed text-foreground">
                {latestAnnouncement.message.length > 200
                  ? latestAnnouncement.message.substring(0, 200) + '...'
                  : latestAnnouncement.message}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 flex-shrink-0"
              onClick={() => setIsExpanded(false)}
            >
              <ChevronDown className="h-4 w-4 rotate-180" />
            </Button>
          </div>

          {/* View all link */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSheetOpen(true)}
            >
              View all {totalCount > 1 ? `${totalCount} announcements` : 'announcements'}
            </Button>
          </div>
        </div>
      )}

      <AllAnnouncementsSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        announcements={sortedAllAnnouncements}
        onDismiss={onDismiss}
        onClearDismissals={onClearDismissals}
        dismissedCount={dismissedCount}
      />
    </div>
  );
};