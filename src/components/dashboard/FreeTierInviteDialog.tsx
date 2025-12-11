import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Copy, Check, MessageSquare } from "lucide-react";
import { PhoneInputWithCountry } from "@/components/ui/phone-input";

interface FreeTierInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventName: string;
  onInvited: () => void;
}

// Editor permissions for Free tier collaborator
const EDITOR_PERMISSIONS = {
  manage_rsvps: true,
  manage_items: true,
  post_announcements: true,
  send_reminders: true,
  view_contributions: true,
  edit_event_details: true,
  manage_payments: false,
  invite_others: false,
  export_data: true,
  delete_content: false
};

export function FreeTierInviteDialog({
  open,
  onOpenChange,
  eventId,
  eventName,
  onInvited
}: FreeTierInviteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [inviteCreated, setInviteCreated] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteId, setInviteId] = useState("");
  const [copied, setCopied] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  const resetState = () => {
    setEmail("");
    setName("");
    setPhone("");
    setCountryCode("US");
    setInviteCreated(false);
    setInviteLink("");
    setInviteId("");
    setCopied(false);
    setSmsSent(false);
    setLoading(false);
    setSendingSms(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  const createInvite = async () => {
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Check current count
      const { data: countData } = await supabase.rpc('get_event_collaborator_count', {
        _event_id: eventId
      });

      if (countData && countData >= 1) {
        toast({
          title: "Limit reached",
          description: "Free events are limited to one collaborator. More collaborators are coming soon with Pro.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to invite collaborators",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Create invite with 48-hour expiry
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

      const { data: invite, error } = await supabase
        .from("collaborator_invites")
        .insert([{
          event_id: eventId,
          email: email.trim().toLowerCase(),
          name: name.trim() || null,
          role: 'editor',
          permissions: EDITOR_PERMISSIONS,
          invited_by: user.id,
          scope: 'event',
          expires_at: expiresAt,
          delivery_method: 'link_only'
        }])
        .select('id, invite_token')
        .single();

      if (error) {
        if (error.message.includes("duplicate")) {
          toast({
            title: "Already invited",
            description: "This email has already been invited to this event",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: "Failed to create invitation. Please try again.",
            variant: "destructive"
          });
        }
        setLoading(false);
        return;
      }

      // Build invite link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/invite/${invite.invite_token}`;
      
      setInviteId(invite.id);
      setInviteLink(link);
      setInviteCreated(true);
      
      toast({
        title: "Invite created!",
        description: "Copy the link or send via SMS"
      });

    } catch (err) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Share this link with your collaborator"
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please select and copy the link manually",
        variant: "destructive"
      });
    }
  };

  const handleSendSms = async () => {
    if (!phone.trim()) {
      toast({
        title: "Phone required",
        description: "Enter a phone number to send SMS",
        variant: "destructive"
      });
      return;
    }

    setSendingSms(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-collaborator-sms', {
        body: {
          invite_id: inviteId,
          phone: phone,
          country_code: countryCode
        }
      });

      if (error) throw error;

      if (data?.success) {
        setSmsSent(true);
        toast({
          title: "SMS sent!",
          description: `Invite sent to ${data.phone}`
        });
        
        // Close dialog after successful SMS
        setTimeout(() => {
          onInvited();
          handleClose(false);
        }, 1500);
      } else {
        throw new Error(data?.error || 'Failed to send SMS');
      }
    } catch (err: any) {
      toast({
        title: "SMS failed",
        description: err.message || "Could not send SMS. Please copy the link instead.",
        variant: "destructive"
      });
    } finally {
      setSendingSms(false);
    }
  };

  const handleDone = () => {
    onInvited();
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Collaborator
          </DialogTitle>
          <DialogDescription>
            Invite someone to help you plan "{eventName}"
          </DialogDescription>
        </DialogHeader>

        {!inviteCreated ? (
          // Step 1: Enter email and name
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="collab-email">Email Address *</Label>
              <Input
                id="collab-email"
                type="email"
                placeholder="collaborator@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
              />
              <p className="text-xs text-muted-foreground">
                They'll need to sign in with this email to accept
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="collab-name">Name (optional)</Label>
              <Input
                id="collab-name"
                type="text"
                placeholder="Their name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12"
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">What collaborators can do:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                <li>Edit items, tasks, and event details</li>
                <li>Manage RSVPs and send reminders</li>
                <li>Post announcements</li>
                <li>View contribution progress (read-only)</li>
              </ul>
            </div>
          </div>
        ) : (
          // Step 2: Share the invite link
          <div className="space-y-4 py-4">
            {/* Invite link display */}
            <div className="space-y-2">
              <Label>Invite Link</Label>
              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="h-12 text-sm font-mono"
                />
                <Button
                  variant={copied ? "default" : "outline"}
                  size="icon"
                  className="h-12 w-12 shrink-0"
                  onClick={handleCopyLink}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Link expires in 48 hours
              </p>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or send via SMS</span>
              </div>
            </div>

            {/* SMS option */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="collab-phone">Phone Number</Label>
                <PhoneInputWithCountry
                  value={phone}
                  onChange={(value) => setPhone(value || "")}
                  onCountryChange={(country) => setCountryCode(country || "US")}
                  disabled={sendingSms || smsSent}
                  placeholder="Enter phone number"
                  className="h-12"
                />
              </div>
              
              <Button
                onClick={handleSendSms}
                disabled={sendingSms || smsSent || !phone.trim()}
                className="w-full h-12"
                variant={smsSent ? "default" : "secondary"}
              >
                {sendingSms ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : smsSent ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    SMS Sent!
                  </>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send SMS Invite
                  </>
                )}
              </Button>
            </div>

            {smsSent && (
              <div className="p-3 rounded-lg bg-primary/10 text-sm text-center">
                <p className="text-primary font-medium">✓ Invite sent successfully!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  They'll receive a text with the link
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!inviteCreated ? (
            <>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={createInvite} disabled={loading} className="h-11">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Invite"
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleDone} className="w-full h-11">
              {copied || smsSent ? "Done" : "I'll Share the Link Myself"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
