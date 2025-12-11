import { Users, Package, CheckSquare } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "react-router-dom";

interface EventMetricsRowProps {
  eventId: string;
  rsvpCount: number;
  maxAttendees?: number | null;
  itemsClaimed: number;
  totalItems: number;
  tasksCompleted: number;
  totalTasks: number;
}

export const EventMetricsRow = ({
  eventId,
  rsvpCount,
  maxAttendees,
  itemsClaimed,
  totalItems,
  tasksCompleted,
  totalTasks,
}: EventMetricsRowProps) => {
  const navigate = useNavigate();

  const handleGuestsClick = () => {
    navigate(`/dashboard?event=${eventId}&tab=guests`);
  };

  const handleItemsClick = () => {
    navigate(`/dashboard?event=${eventId}&tab=items`);
  };

  const handleTasksClick = () => {
    navigate(`/dashboard?event=${eventId}&tab=planner`);
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={handleGuestsClick}
              className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>
                {rsvpCount}
                {maxAttendees && `/${maxAttendees}`}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>RSVPs {maxAttendees ? `(${rsvpCount} of ${maxAttendees})` : `(${rsvpCount} guests)`} - Click to view</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={handleItemsClick}
              className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              <span>
                {itemsClaimed}/{totalItems}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Items claimed ({itemsClaimed} of {totalItems}) - Click to view</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button 
              onClick={handleTasksClick}
              className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>
                {tasksCompleted}/{totalTasks}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Tasks completed ({tasksCompleted} of {totalTasks}) - Click to view</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
