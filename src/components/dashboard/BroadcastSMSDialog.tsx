import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageSquare, Users, AlertTriangle, CheckCircle, Loader2, Send, AlertCircle, X } from "lucide-react";
import { MessagingLimitModal } from "./messaging/MessagingLimitModal";
import { UndoSendSnackbar } from "./messaging/UndoSendSnackbar";
import { SMS_TEMPLATES, SMS_CHARACTER_LIMIT, formatDateForSms, validateRequiredLinks, getLinkVariableDisplayName } from "@/lib/smsTemplates";
import { trackPaywallShown } from "@/lib/smsAnalytics";
import { cn } from "@/lib/utils";

interface BroadcastSMSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  eventDate?: string | null;
  eventCode?: string;
}

interface RecipientCounts {
  attending: number;
  maybe: number;
  all_invited: number;
  consented: number;
}

interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  sentCount: number;
  totalCount: number;
}

export function BroadcastSMSDialog({ open, onOpenChange, eventId, eventName, eventDate, eventCode }: BroadcastSMSDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const [recipientCounts, setRecipientCounts] = useState<RecipientCounts>({ attending: 0, maybe: 0, all_invited: 0, consented: 0 });
  const [broadcastInfo, setBroadcastInfo] = useState({ sent: 0, limit: 3 });
  const [result, setResult] = useState<{ success: boolean; successCount: number; failCount: number } | null>(null);
  const [step, setStep] = useState<'compose' | 'confirm' | 'countdown' | 'sending' | 'result'>('compose');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [originalTemplate, setOriginalTemplate] = useState('');
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [countdown, setCountdown] = useState(3);
  const cancelledRef = useRef(false);

  // Countdown effect for undo-send window
  useEffect(() => {
    if (step !== 'countdown') {
      setCountdown(3);
      return;
    }
    
    if (countdown > 0 && !cancelledRef.current) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !cancelledRef.current) {
      handleSend();
    }
  }, [step, countdown]);

  // Generate the default template with substitutions
  const bulkTemplate = SMS_TEMPLATES.bulk_rsvp.template;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const rsvpLink = eventCode ? `${baseUrl}/event/${eventCode}` : '{RSVPLink}';
  const formattedDate = eventDate ? formatDateForSms(eventDate) : '{EventDate}';
  
  const generatePreview = (template: string) => {
    return template
      .replace(/{EventName}/g, eventName)
      .replace(/{EventDate}/g, formattedDate)
      .replace(/{RSVPLink}/g, rsvpLink);
  };

  // Initialize custom message when dialog opens
  useEffect(() => {
    if (open && eventId) {
      const initialTemplate = bulkTemplate;
      setCustomMessage(initialTemplate);
      setOriginalTemplate(initialTemplate);
      fetchRecipientCounts();
      fetchBroadcastInfo();
      setStep('compose');
      setResult(null);
    }
  }, [open, eventId, bulkTemplate]);

  const fetchRecipientCounts = async () => {
    try {
      // Get RSVPs with phones
      const { data: rsvps } = await supabase
        .from('rsvps')
        .select('rsvp_status, guest_token, guest_phone')
        .eq('event_id', eventId)
        .not('guest_phone', 'is', null);

      if (!rsvps) return;

      // Get preferences with SMS consent
      const tokens = rsvps.map(r => r.guest_token);
      const { data: prefs } = await supabase
        .from('guest_preferences')
        .select('guest_token, sms_enabled, sms_consent_given_at')
        .eq('event_id', eventId)
        .in('guest_token', tokens);

      const consentedTokens = new Set(
        (prefs || [])
          .filter(p => p.sms_enabled && p.sms_consent_given_at)
          .map(p => p.guest_token)
      );

      const attending = rsvps.filter(r => r.rsvp_status === 'attending' && consentedTokens.has(r.guest_token)).length;
      const maybe = rsvps.filter(r => r.rsvp_status === 'maybe' && consentedTokens.has(r.guest_token)).length;
      const allInvited = rsvps.filter(r => consentedTokens.has(r.guest_token)).length;

      setRecipientCounts({
        attending,
        maybe,
        all_invited: allInvited,
        consented: consentedTokens.size
      });
    } catch (err) {
      console.error('Error fetching recipient counts:', err);
    }
  };

  const fetchBroadcastInfo = async () => {
    try {
      const { data: event } = await supabase
        .from('events')
        .select('sms_broadcasts_sent, sms_broadcast_limit')
        .eq('id', eventId)
        .single();

      if (event) {
        setBroadcastInfo({
          sent: event.sms_broadcasts_sent || 0,
          limit: event.sms_broadcast_limit || 3
        });
      }
    } catch (err) {
      console.error('Error fetching broadcast info:', err);
    }
  };

  const handleMessageChange = (value: string) => {
    // Check if RSVPLink is being removed
    if (originalTemplate.includes('{RSVPLink}') && !value.includes('{RSVPLink}')) {
      toast.error("Required link missing—please restore the RSVP link.");
      return;
    }
    setCustomMessage(value);
  };

  const handleStartCountdown = () => {
    // Validate character limit
    if (customMessage.length > SMS_CHARACTER_LIMIT) {
      toast.error(`Message too long. SMS must be under ${SMS_CHARACTER_LIMIT} characters.`);
      return;
    }

    // Validate required link variables
    const linkValidation = validateRequiredLinks(customMessage, 'bulk_rsvp');
    if (!linkValidation.valid) {
      toast.error(`Required link missing—please restore the ${linkValidation.missingLinks.map(getLinkVariableDisplayName).join(', ')}.`);
      return;
    }

    // Start undo-send countdown
    cancelledRef.current = false;
    setStep('countdown');
  };

  const handleCancelCountdown = () => {
    cancelledRef.current = true;
    setStep('confirm');
    toast.info('Send cancelled');
  };

  const handleSend = async () => {
    if (cancelledRef.current) return;
    
    setStep('sending');
    setIsSending(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please sign in to send broadcasts");
        return;
      }

      // Generate the final message with substitutions
      const finalMessage = generatePreview(customMessage);

      // Calculate batches for progress display
      const totalRecipients = recipientCounts.all_invited;
      const batchSize = 30;
      const totalBatches = Math.ceil(totalRecipients / batchSize);
      
      setBatchProgress({
        currentBatch: 1,
        totalBatches,
        sentCount: 0,
        totalCount: totalRecipients
      });

      const response = await supabase.functions.invoke('send-sms-broadcast', {
        body: {
          event_id: eventId,
          target_audience: 'all_invited',
          message_text: finalMessage,
          batch_size: batchSize
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send broadcast');
      }

      const data = response.data;
      
      if (data.error) {
        throw new Error(data.error);
      }

      setResult({
        success: true,
        successCount: data.successful_count,
        failCount: data.failed_count
      });
      setStep('result');
      
      // Update broadcast info
      setBroadcastInfo(prev => ({
        ...prev,
        sent: prev.sent + 1
      }));

      toast.success(`Broadcast sent to ${data.successful_count} recipients`);
    } catch (err: any) {
      console.error('Broadcast error:', err);
      toast.error(err.message || 'Failed to send broadcast');
      setStep('compose');
    } finally {
      setIsSending(false);
      setBatchProgress(null);
    }
  };

  const handleClose = () => {
    setStep('compose');
    setResult(null);
    onOpenChange(false);
  };

  const handleLimitReached = async () => {
    setShowLimitModal(true);
    await trackPaywallShown(eventId, 'bulk_limit');
  };

  const remainingBroadcasts = broadcastInfo.limit - broadcastInfo.sent;
  const isLimitReached = remainingBroadcasts <= 0;
  const recipientCount = recipientCounts.all_invited;
  const charCount = customMessage.length;
  const isOverLimit = charCount > SMS_CHARACTER_LIMIT;
  const linkValidation = validateRequiredLinks(customMessage, 'bulk_rsvp');

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Broadcast SMS
          </DialogTitle>
          <DialogDescription>
            Send a message to your guests for {eventName}
          </DialogDescription>
        </DialogHeader>

        {isLimitReached ? (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You have used all {broadcastInfo.limit} bulk broadcasts for this event.
              </AlertDescription>
            </Alert>
            <Button onClick={handleLimitReached} className="w-full">
              Get Early Access to More Broadcasts
            </Button>
          </div>
        ) : (
          <>
            {step === 'compose' && (
              <div className="space-y-6">
                {/* Broadcast Remaining */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Broadcasts remaining:</span>
                  <Badge variant={remainingBroadcasts <= 1 ? "destructive" : "secondary"}>
                    {remainingBroadcasts} of {broadcastInfo.limit}
                  </Badge>
                </div>

                {/* Editable Message */}
                <div className="space-y-2">
                  <Label>Customize Message</Label>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => handleMessageChange(e.target.value)}
                    placeholder="Enter your broadcast message..."
                    className={cn(
                      "min-h-[120px] text-sm resize-none",
                      (isOverLimit || !linkValidation.valid) && "border-destructive"
                    )}
                  />
                  
                  {/* Validation & Character Count */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {!linkValidation.valid && (
                        <span className="text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Missing: {linkValidation.missingLinks.map(getLinkVariableDisplayName).join(', ')}
                        </span>
                      )}
                    </div>
                    <span className={cn(
                      "font-mono",
                      isOverLimit ? "text-destructive" : "text-muted-foreground"
                    )}>
                      {charCount}/{SMS_CHARACTER_LIMIT}
                    </span>
                  </div>
                  
                  {isOverLimit && (
                    <p className="text-xs text-destructive">
                      Message too long. SMS must be under {SMS_CHARACTER_LIMIT} characters.
                    </p>
                  )}
                </div>

                {/* Message Preview */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Preview (with substitutions)</Label>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{generatePreview(customMessage)}</p>
                  </div>
                </div>

                {/* Recipients Info */}
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Recipients with SMS consent</span>
                  </div>
                  <Badge variant="secondary">{recipientCount}</Badge>
                </div>

                {recipientCount === 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No recipients with SMS consent
                    </AlertDescription>
                  </Alert>
                )}

                {/* Pro Teaser */}
                <p className="text-xs text-muted-foreground text-center">
                  Advanced messaging—two-way chat, unlimited reminders, scheduling—coming soon with SimplifiedHost Pro.
                </p>
              </div>
            )}

            {step === 'confirm' && (
              <div className="space-y-4">
                <Alert>
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    You are about to send an SMS to <strong>{recipientCount}</strong> guest{recipientCount !== 1 ? 's' : ''}.
                    This will use 1 of your {remainingBroadcasts} remaining bulk broadcasts.
                  </AlertDescription>
                </Alert>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Message preview:</p>
                  <p className="text-sm whitespace-pre-wrap">{generatePreview(customMessage)}</p>
                </div>
              </div>
            )}

            {step === 'countdown' && (
              <div className="py-8 space-y-4 text-center">
                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="text-4xl font-bold text-amber-600 mb-2">{countdown}</div>
                  <p className="text-amber-800 dark:text-amber-200 font-medium mb-2">
                    Sending to {recipientCount} guest{recipientCount !== 1 ? 's' : ''}...
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tap "Cancel" to abort
                  </p>
                </div>
              </div>
            )}

            {step === 'sending' && (
              <div className="py-8 space-y-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground">
                  {batchProgress 
                    ? `Sending batch ${batchProgress.currentBatch} of ${batchProgress.totalBatches}...`
                    : 'Sending messages...'
                  }
                </p>
                <Progress 
                  value={batchProgress 
                    ? (batchProgress.currentBatch / batchProgress.totalBatches) * 100 
                    : 50
                  } 
                  className="w-full" 
                />
                {batchProgress && (
                  <p className="text-xs text-muted-foreground">
                    {batchProgress.sentCount} of {batchProgress.totalCount} sent
                  </p>
                )}
              </div>
            )}

            {step === 'result' && result && (
              <div className="py-6 space-y-4 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
                <div>
                  <p className="text-lg font-medium">Broadcast Complete</p>
                  <p className="text-muted-foreground">
                    {result.successCount} message{result.successCount !== 1 ? 's' : ''} sent successfully
                    {result.failCount > 0 && `, ${result.failCount} failed`}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          {step === 'compose' && !isLimitReached && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setStep('confirm')}
                disabled={recipientCount === 0 || isOverLimit || !linkValidation.valid}
              >
                <Send className="h-4 w-4 mr-2" />
                Continue
              </Button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <Button variant="outline" onClick={() => setStep('compose')}>
                Back
              </Button>
              <Button onClick={handleStartCountdown} disabled={isSending}>
                <Send className="h-4 w-4 mr-2" />
                Send to {recipientCount} guest{recipientCount !== 1 ? 's' : ''}
              </Button>
            </>
          )}

          {step === 'countdown' && (
            <Button variant="destructive" onClick={handleCancelCountdown} className="w-full">
              <X className="h-4 w-4 mr-2" />
              Cancel Send
            </Button>
          )}

          {step === 'result' && (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      <MessagingLimitModal
        open={showLimitModal}
        onOpenChange={setShowLimitModal}
        variant="bulk"
        eventId={eventId}
      />
    </Dialog>
  );
}
