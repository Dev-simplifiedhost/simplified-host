import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowLeft, ChevronDown, Share2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface Event {
  id: string;
  name: string;
  event_date: string | null;
  is_draft?: boolean;
  is_archived?: boolean;
  event_code?: string;
}

interface EventManagementHeaderProps {
  currentEvent: Event | null;
  allEvents: Event[];
  onEventChange: (event: Event) => void;
  onShareClick: () => void;
  onSettingsClick: () => void;
}

export function EventManagementHeader({
  currentEvent,
  allEvents,
  onEventChange,
  onShareClick,
  onSettingsClick,
}: EventManagementHeaderProps) {
  const navigate = useNavigate();

  const getStatusBadge = (event: Event) => {
    if (event.is_draft) {
      return <Badge variant="secondary" className="text-xs">Draft</Badge>;
    }
    if (event.is_archived) {
      return <Badge variant="outline" className="text-xs">Archived</Badge>;
    }
    return <Badge className="text-xs bg-green-600 hover:bg-green-700">Live</Badge>;
  };

  const formatEventDate = (dateStr: string | null) => {
    if (!dateStr) return "No date set";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <header className="sticky top-0 z-40 bg-background border-b pt-safe">
      <div className="flex items-center justify-between h-14 px-4 max-w-5xl mx-auto">
        {/* Left: Back Arrow */}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 shrink-0"
          onClick={() => navigate("/my-events")}
          aria-label="Back to My Events"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Center: Event Switcher */}
        <div className="flex-1 flex justify-center min-w-0 px-2">
          {currentEvent ? (
            allEvents.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-10 px-3 max-w-[200px] md:max-w-[300px] gap-2"
                  >
                    <span className="truncate font-semibold text-sm md:text-base">
                      {currentEvent.name}
                    </span>
                    {getStatusBadge(currentEvent)}
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  className="w-72 max-h-[60vh] overflow-y-auto bg-popover z-50"
                >
                  {allEvents.map((event) => (
                    <DropdownMenuItem
                      key={event.id}
                      onClick={() => onEventChange(event)}
                      className={cn(
                        "flex flex-col items-start gap-1 py-3 cursor-pointer",
                        event.id === currentEvent.id && "bg-muted"
                      )}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="font-medium truncate flex-1">
                          {event.name}
                        </span>
                        {getStatusBadge(event)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatEventDate(event.event_date)}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2 px-3">
                <span className="font-semibold text-sm md:text-base truncate max-w-[180px] md:max-w-[280px]">
                  {currentEvent.name}
                </span>
                {getStatusBadge(currentEvent)}
              </div>
            )
          ) : (
            <span className="text-muted-foreground text-sm">No event selected</span>
          )}
        </div>

        {/* Right: Share + Settings Icons */}
        <div className="flex items-center gap-1 shrink-0">
          {currentEvent && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10"
              onClick={onShareClick}
              aria-label="Share Event"
            >
              <Share2 className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            onClick={onSettingsClick}
            aria-label="Event Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
