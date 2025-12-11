import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UndoSendSnackbarProps {
  open: boolean;
  onCancel: () => void;
  onComplete: () => void;
  countdownSeconds?: number;
  message?: string;
}

export function UndoSendSnackbar({
  open,
  onCancel,
  onComplete,
  countdownSeconds = 3,
  message = "Sending",
}: UndoSendSnackbarProps) {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (!open) {
      setCountdown(countdownSeconds);
      setCancelled(false);
      return;
    }

    if (countdown > 0 && !cancelled) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !cancelled) {
      onComplete();
    }
  }, [open, countdown, cancelled, countdownSeconds, onComplete]);

  const handleCancel = useCallback(() => {
    setCancelled(true);
    onCancel();
  }, [onCancel]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-50",
        "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg",
        "bg-foreground text-background",
        "animate-in slide-in-from-bottom-4 fade-in duration-300",
        "safe-bottom"
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="text-sm font-medium">
        {message} in {countdown}...
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCancel}
        className="h-8 px-3 text-background hover:bg-background/20 hover:text-background"
      >
        Tap to cancel
      </Button>
    </div>
  );
}

export default UndoSendSnackbar;
