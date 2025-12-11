import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SmsStatusPillProps {
  eventId: string;
  onClick: () => void;
  className?: string;
}

export function SmsStatusPill({ eventId, onClick, className }: SmsStatusPillProps) {
  const [limits, setLimits] = useState({ bulkRemaining: 0, singleRemaining: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      loadLimits();
    }
  }, [eventId]);

  const loadLimits = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('events')
        .select('sms_broadcasts_sent, sms_broadcast_limit, single_reminders_sent, single_reminder_limit')
        .eq('id', eventId)
        .single();

      if (data) {
        setLimits({
          bulkRemaining: (data.sms_broadcast_limit || 3) - (data.sms_broadcasts_sent || 0),
          singleRemaining: (data.single_reminder_limit || 10) - (data.single_reminders_sent || 0),
        });
      }
    } catch (error) {
      console.error('Error loading SMS limits:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasWarning = limits.bulkRemaining <= 1 || limits.singleRemaining <= 2;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      className={cn(
        "h-8 px-2 gap-1.5 text-xs font-normal",
        hasWarning && "border-amber-500/50 text-amber-700 dark:text-amber-400",
        className
      )}
    >
      <MessageSquare className="h-3.5 w-3.5" />
      {loading ? (
        <span className="text-muted-foreground">...</span>
      ) : (
        <span>
          {limits.bulkRemaining}B · {limits.singleRemaining}D
        </span>
      )}
    </Button>
  );
}

export default SmsStatusPill;
