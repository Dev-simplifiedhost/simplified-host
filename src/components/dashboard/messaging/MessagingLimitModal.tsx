import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageSquare, Zap } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { trackCtaClicked } from "@/lib/smsAnalytics";

interface MessagingLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: 'bulk' | 'single';
  eventId: string | null;
}

export function MessagingLimitModal({
  open,
  onOpenChange,
  variant,
  eventId,
}: MessagingLimitModalProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isBulk = variant === 'bulk';
  const ctaButton = isBulk ? 'get_early_access' : 'join_pro_list';

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Save to pro_interest table
        await supabase.from('pro_interest').insert({
          user_id: user.id,
          email: email.trim(),
          event_id: eventId,
          feature: 'messaging',
          source: isBulk ? 'bulk_limit_modal' : 'single_limit_modal',
        });
      }

      // Track analytics
      await trackCtaClicked(eventId, ctaButton);

      setSubmitted(true);
      toast({
        title: "You're on the list!",
        description: "We'll notify you when Pro features are available.",
      });
    } catch (error) {
      console.error('Failed to save interest:', error);
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after animation
    setTimeout(() => {
      setEmail('');
      setSubmitted(false);
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            {isBulk ? (
              <MessageSquare className="h-6 w-6 text-primary" />
            ) : (
              <Zap className="h-6 w-6 text-primary" />
            )}
          </div>
          <DialogTitle>
            {isBulk 
              ? "Additional Bulk Messages Coming Soon"
              : "Messaging Limit Reached"
            }
          </DialogTitle>
          <DialogDescription className="text-center">
            {isBulk 
              ? "More RSVP pushes and automated reminders will be available soon in SimplifiedHost Pro."
              : "More reminders, scheduling, and two-way messaging are coming with SimplifiedHost Pro."
            }
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 mb-3">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-sm text-muted-foreground">
              Thanks! We'll be in touch soon.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pro-email">Email address</Label>
              <Input
                id="pro-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {!submitted && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                isBulk ? "Get Early Access" : "Join the Pro List"
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={handleClose}
            className="w-full"
          >
            {submitted ? "Close" : "Maybe Later"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
