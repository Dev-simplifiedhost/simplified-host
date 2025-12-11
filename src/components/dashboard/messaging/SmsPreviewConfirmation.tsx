import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Send, 
  ArrowLeft, 
  AlertTriangle, 
  Users, 
  MessageSquare,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SmsPreviewConfirmationProps {
  message: string;
  recipientCount: number;
  characterLimit?: number;
  onConfirm: () => void;
  onCancel: () => void;
  isSending?: boolean;
  variant?: 'bulk' | 'direct';
  recipientName?: string;
}

export function SmsPreviewConfirmation({
  message,
  recipientCount,
  characterLimit = 160,
  onConfirm,
  onCancel,
  isSending = false,
  variant = 'direct',
  recipientName,
}: SmsPreviewConfirmationProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [cancelled, setCancelled] = useState(false);

  const charCount = message.length;
  const willSplit = charCount > characterLimit;
  const segmentCount = Math.ceil(charCount / characterLimit);

  // Undo-send countdown for bulk messages
  useEffect(() => {
    if (isSending && variant === 'bulk' && countdown === null) {
      setCountdown(3);
    }
  }, [isSending, variant]);

  useEffect(() => {
    if (countdown !== null && countdown > 0 && !cancelled) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !cancelled) {
      // Countdown finished, proceed with send
      onConfirm();
    }
  }, [countdown, cancelled]);

  const handleCancelCountdown = () => {
    setCancelled(true);
    setCountdown(null);
    onCancel();
  };

  // Show countdown UI for bulk messages
  if (countdown !== null && countdown > 0 && variant === 'bulk') {
    return (
      <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
          <span className="text-lg font-medium text-amber-800 dark:text-amber-200">
            Sending in {countdown}...
          </span>
        </div>
        <Button 
          variant="destructive" 
          onClick={handleCancelCountdown}
          className="w-full"
        >
          Tap to Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Warning for message splitting */}
      {willSplit && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            This message will be split into {segmentCount} SMS segments ({charCount} characters).
            Each segment may incur separate carrier charges.
          </AlertDescription>
        </Alert>
      )}

      {/* Message Preview */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Message Preview</span>
          <span className={cn(
            "text-xs font-mono",
            charCount > characterLimit ? "text-amber-600" : "text-muted-foreground"
          )}>
            {charCount}/{characterLimit}
          </span>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg border">
          <p className="text-sm whitespace-pre-wrap break-words">{message}</p>
        </div>
      </div>

      {/* Recipient Info */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2">
          {variant === 'bulk' ? (
            <Users className="h-4 w-4 text-muted-foreground" />
          ) : (
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm">
            {variant === 'bulk' 
              ? `Will send to ${recipientCount} guest${recipientCount !== 1 ? 's' : ''}`
              : `Sending to ${recipientName || 'guest'}`
            }
          </span>
        </div>
        <Badge variant="secondary">{recipientCount}</Badge>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSending}
          className="flex-1 h-12"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go back
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isSending}
          className="flex-1 h-12"
        >
          {isSending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send SMS
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default SmsPreviewConfirmation;
