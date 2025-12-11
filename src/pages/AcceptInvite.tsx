import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Users, AlertTriangle, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface InviteDetails {
  id: string;
  email: string;
  name: string | null;
  role: string;
  note: string | null;
  expires_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  event_id: string;
  event_name: string;
  host_name: string | null;
  is_valid: boolean;
}

const AcceptInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load invite details
  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link.");
      setLoading(false);
      return;
    }
    loadInviteDetails();
  }, [token]);

  // Auto-accept if user is logged in and came back from auth
  useEffect(() => {
    const shouldAutoAccept = searchParams.get('auto_accept') === 'true';
    if (shouldAutoAccept && user && inviteDetails?.is_valid && !success) {
      handleAccept();
    }
  }, [user, inviteDetails, searchParams]);

  const loadInviteDetails = async () => {
    try {
      const { data, error: fetchError } = await supabase.rpc('get_invite_by_token', {
        _invite_token: token
      });

      if (fetchError || !data) {
        setError("This invitation could not be found.");
        setLoading(false);
        return;
      }

      setInviteDetails(data as unknown as InviteDetails);
    } catch (err) {
      setError("Failed to load invitation details.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user || !token) return;

    setAccepting(true);
    setError(null);

    try {
      const { data, error: acceptError } = await supabase.rpc('accept_collaborator_invite', {
        _invite_token: token,
        _user_id: user.id
      });

      if (acceptError) {
        setError("Failed to accept invitation. Please try again.");
        setAccepting(false);
        return;
      }

      const result = data as { success: boolean; error?: string; message?: string; event_id?: string };

      if (!result.success) {
        if (result.error === 'email_mismatch') {
          setError(result.message || "Email mismatch.");
        } else {
          setError(result.message || "Could not accept invitation.");
        }
        setAccepting(false);
        return;
      }

      // Success!
      setSuccess(true);
      
      // Set welcome banner flag
      if (result.event_id) {
        localStorage.setItem(`collaborator_welcome_${result.event_id}`, 'true');
      }

      toast({
        title: "Invitation Accepted!",
        description: `You're now a collaborator on ${inviteDetails?.event_name}`,
      });

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        navigate(`/dashboard?event=${result.event_id}`);
      }, 2000);

    } catch (err) {
      setError("An unexpected error occurred.");
      setAccepting(false);
    }
  };

  const handleSignIn = () => {
    // Redirect to auth with return URL and pre-filled email
    const returnUrl = `/invite/${token}?auto_accept=true`;
    const email = inviteDetails?.email || '';
    navigate(`/auth?returnUrl=${encodeURIComponent(returnUrl)}&email=${encodeURIComponent(email)}`);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'co_host': return 'default';
      case 'editor': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'co_host': return 'Co-host';
      case 'editor': return 'Editor';
      case 'viewer': return 'Viewer';
      default: return role;
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">You're In!</h2>
            <p className="text-muted-foreground mb-4">
              You're now a collaborator on {inviteDetails?.event_name}
            </p>
            <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state (invalid/expired invite)
  if (error && !inviteDetails) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
              <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid/expired invite
  if (inviteDetails && !inviteDetails.is_valid) {
    const isExpired = new Date(inviteDetails.expires_at) < new Date();
    const isAlreadyUsed = inviteDetails.accepted_at || inviteDetails.declined_at;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <XCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {isExpired ? "Invitation Expired" : isAlreadyUsed ? "Invitation Already Used" : "Invalid Invitation"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {isExpired 
                ? "This invitation has expired. Please ask the host to send a new one."
                : isAlreadyUsed 
                ? "This invitation has already been accepted or declined."
                : "This invitation is no longer valid."}
            </p>
            <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invite - show accept UI
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>You're Invited to Collaborate!</CardTitle>
          <CardDescription>
            {inviteDetails?.host_name || 'A host'} has invited you to help plan an event
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Info */}
          <div className="p-4 rounded-lg bg-muted/50 text-center">
            <h3 className="font-semibold text-lg">{inviteDetails?.event_name}</h3>
            <div className="flex justify-center gap-2 mt-2">
              <Badge variant={getRoleBadgeVariant(inviteDetails?.role || 'editor')}>
                {getRoleLabel(inviteDetails?.role || 'editor')}
              </Badge>
            </div>
          </div>

          {/* Personal note if provided */}
          {inviteDetails?.note && (
            <div className="p-3 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground italic">"{inviteDetails.note}"</p>
            </div>
          )}

          {/* What collaborators can do */}
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-2">As a collaborator, you can:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Edit items, tasks, and event details</li>
              <li>Manage RSVPs and guest list</li>
              <li>Post announcements</li>
              <li>View contribution progress</li>
            </ul>
          </div>

          {/* Error display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          {user ? (
            // User is logged in
            user.email?.toLowerCase() === inviteDetails?.email.toLowerCase() ? (
              <Button 
                className="w-full h-12" 
                onClick={handleAccept}
                disabled={accepting}
              >
                {accepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  "Accept Invitation"
                )}
              </Button>
            ) : (
              // Email mismatch
              <div className="space-y-3">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This invitation is for <strong>{inviteDetails?.email}</strong>. 
                    You're signed in as <strong>{user.email}</strong>.
                  </AlertDescription>
                </Alert>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    handleSignIn();
                  }}
                >
                  Sign in with {inviteDetails?.email}
                </Button>
              </div>
            )
          ) : (
            // User not logged in
            <div className="space-y-3">
              <Button className="w-full h-12" onClick={handleSignIn}>
                <LogIn className="mr-2 h-4 w-4" />
                Sign In to Accept
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                You'll need to sign in with <strong>{inviteDetails?.email}</strong> to accept this invitation
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
