import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, AlertCircle, Bell, Heart, Megaphone, RotateCcw } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Announcement {
  id: string;
  title?: string;
  message: string;
  category: string;
  is_pinned?: boolean;
  created_at: string;
}

interface AllAnnouncementsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  announcements: Announcement[];
  onDismiss: (id: string) => void;
  onClearDismissals?: () => void;
  dismissedCount?: number;
}

export const AllAnnouncementsSheet = ({
  open,
  onOpenChange,
  announcements,
  onDismiss,
  onClearDismissals,
  dismissedCount = 0,
}: AllAnnouncementsSheetProps) => {
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

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy 'at' h:mm a");
    } catch {
      return "";
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] sm:h-[60vh]">
        <SheetHeader className="text-left">
          <div className="flex items-center justify-between">
            <SheetTitle>All Announcements</SheetTitle>
            {dismissedCount > 0 && onClearDismissals && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs gap-1.5"
                onClick={onClearDismissals}
              >
                <RotateCcw className="h-3 w-3" />
                Show {dismissedCount} dismissed
              </Button>
            )}
          </div>
          <SheetDescription>
            {announcements.length} announcement{announcements.length !== 1 ? 's' : ''} from the host
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100%-80px)] mt-4 pr-4">
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No announcements yet
              </p>
            ) : (
              announcements.map((announcement) => (
                <Alert 
                  key={announcement.id}
                  className={`${getAlertClassName(announcement.category)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      {getAnnouncementIcon(announcement.category)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {announcement.is_pinned && (
                            <Badge variant="default" className="text-xs">Pinned</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(announcement.created_at)}
                          </span>
                        </div>
                        {announcement.title && (
                          <p className="font-semibold text-sm mb-1">{announcement.title}</p>
                        )}
                        <AlertDescription className="text-sm whitespace-pre-wrap">
                          {announcement.message}
                        </AlertDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-transparent flex-shrink-0"
                      onClick={() => onDismiss(announcement.id)}
                      aria-label="Dismiss announcement"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Alert>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
