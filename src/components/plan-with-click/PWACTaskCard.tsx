import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Pencil, Plus, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PWACTaskCardProps {
  task: string;
  isAdded: boolean;
  taskId?: string;
  eventId?: string;
  onAdd: () => Promise<void>;
  onEdit: () => void;
}

const PWACTaskCard = ({
  task,
  isAdded,
  taskId,
  eventId,
  onAdd,
  onEdit,
}: PWACTaskCardProps) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdd = async () => {
    setLoading(true);
    try {
      await onAdd();
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInTab = () => {
    if (eventId) {
      navigate(`/dashboard?event=${eventId}&tab=items-tasks`);
    }
  };

  return (
    <div className="flex items-start justify-between py-2 px-3 bg-muted/30 rounded-lg group">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div className="mt-0.5 h-4 w-4 rounded border border-muted-foreground/30 flex-shrink-0" />
        <span className="text-sm">{task}</span>
      </div>
      
      <div className="flex items-center gap-1.5 ml-2 shrink-0">
        {isAdded ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-8 px-2 text-xs"
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
            {eventId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenInTab}
                className="h-8 px-2 text-xs opacity-60 hover:opacity-100"
                title="Open in Tasks Tab"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAdd}
            disabled={loading}
            className="h-8 px-3 text-xs"
          >
            {loading ? (
              <span className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full" />
            ) : (
              <>
                <Plus className="h-3 w-3 mr-1" />
                Add
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PWACTaskCard;
