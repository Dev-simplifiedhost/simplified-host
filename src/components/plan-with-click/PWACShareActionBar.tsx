import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { supabase } from "@/integrations/supabase/client";
import { generateShareToken } from "@/lib/generateShareToken";
import { printPWACPlan } from "@/lib/printPWACPlan";
import type { EventPlanData } from "./PlanWithClickDialog";
import { 
  Copy, 
  ExternalLink, 
  Printer, 
  Loader2,
  WifiOff,
  LogIn
} from "lucide-react";

interface PWACShareActionBarProps {
  eventId: string | null;
  eventUserId: string;
  eventName: string;
  eventDate?: Date;
  plan: EventPlanData;
  addedItems: Map<string, string>;
  addedTasks: Map<string, string>;
}

export const PWACShareActionBar = ({
  eventId,
  eventUserId,
  eventName,
  eventDate,
  plan,
  addedItems,
  addedTasks,
}: PWACShareActionBarProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { isOnline } = useNetworkStatus();
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Check if user is the host
  const isHost = user && user.id === eventUserId;
  const isAuthenticated = !!user;

  // Fetch existing share token on mount if eventId exists
  useState(() => {
    if (eventId && isHost) {
      fetchExistingToken();
    }
  });

  const fetchExistingToken = async () => {
    if (!eventId) return;
    
    const { data } = await supabase
      .from('events')
      .select('pwac_share_token')
      .eq('id', eventId)
      .single();
    
    if (data?.pwac_share_token) {
      setShareToken(data.pwac_share_token);
    }
  };

  const handleCopyShareLink = async () => {
    if (!eventId || !isOnline) return;

    setIsGeneratingLink(true);
    try {
      let token = shareToken;

      // Generate new token if none exists
      if (!token) {
        token = generateShareToken();
        
        const { error } = await supabase
          .from('events')
          .update({ pwac_share_token: token })
          .eq('id', eventId);

        if (error) throw error;
        setShareToken(token);
      }

      // Copy link to clipboard
      const shareUrl = `${window.location.origin}/plan/${token}`;
      await navigator.clipboard.writeText(shareUrl);

      toast({
        title: "Link copied",
        description: "Anyone with this link can view your plan.",
      });
    } catch (error) {
      console.error('Error generating share link:', error);
      toast({
        title: "Could not generate link",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleViewSharedPlan = () => {
    if (!shareToken) return;
    window.open(`/plan/${shareToken}`, '_blank');
  };

  const handlePrintPlan = async () => {
    setIsPrinting(true);
    try {
      // Fetch exported items from database
      let items: Array<{ name: string; category: string; notes?: string; status: string }> = [];
      let tasks: Array<{ title: string; completed: boolean }> = [];

      if (eventId) {
        // Fetch from database - only exported items/tasks
        const { data: itemsData } = await supabase
          .from('event_items')
          .select('name, category, notes, fulfillment_status')
          .eq('event_id', eventId)
          .eq('include_in_export', true)
          .order('created_at', { ascending: true });

        const { data: tasksData } = await supabase
          .from('tasks')
          .select('title, status')
          .eq('event_id', eventId)
          .eq('include_in_export', true)
          .order('created_at', { ascending: true });

        items = (itemsData || []).map(item => ({
          name: item.name,
          category: item.category || 'Other',
          notes: item.notes || undefined,
          status: item.fulfillment_status === 'fulfilled' ? 'Done' : 'Not started',
        }));

        tasks = (tasksData || []).map(task => ({
          title: task.title,
          completed: task.status === 'done',
        }));
      } else {
        // Fallback to plan data if no event yet
        plan.menuItems.forEach(category => {
          category.items.forEach(item => {
            items.push({
              name: item.name,
              category: category.category,
              notes: item.note,
              status: 'Not started',
            });
          });
        });

        tasks = plan.hostTodos.map(todo => ({
          title: todo,
          completed: false,
        }));
      }

      const success = printPWACPlan({
        eventName,
        eventDate,
        plan,
        items,
        tasks,
      });

      if (!success) {
        toast({
          title: "Could not open print dialog",
          description: "Please check your popup blocker settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error printing plan:', error);
      toast({
        title: "Print failed",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  // Not authenticated - show sign in notice
  if (!isAuthenticated) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Sign in to share your event plan.
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => window.location.href = '/auth'}
          className="h-10"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Sign In
        </Button>
      </div>
    );
  }

  // Authenticated but not the host - hide share actions (view-only)
  if (!isHost) {
    return null;
  }

  // Offline state
  if (!isOnline) {
    return (
      <div className="bg-muted/50 rounded-lg p-4 text-center">
        <WifiOff className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Reconnect to share your plan.
        </p>
      </div>
    );
  }

  // Host view - show all share actions
  return (
    <>
      {/* Mobile: Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 pb-safe z-40 md:hidden">
        <div className="flex gap-2 max-w-screen-sm mx-auto">
          <Button
            onClick={handleCopyShareLink}
            disabled={!eventId || isGeneratingLink}
            className="flex-1 h-11"
            size="sm"
          >
            {isGeneratingLink ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Copy className="mr-2 h-4 w-4" />
            )}
            Copy Link
          </Button>
          
          {shareToken && (
            <Button
              onClick={handleViewSharedPlan}
              variant="secondary"
              className="h-11"
              size="sm"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            onClick={handlePrintPlan}
            variant="outline"
            disabled={isPrinting}
            className="h-11"
            size="sm"
          >
            {isPrinting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Desktop: Top toolbar */}
      <div className="hidden md:flex gap-3 items-center bg-muted/30 rounded-lg p-3 mb-4">
        <Button
          onClick={handleCopyShareLink}
          disabled={!eventId || isGeneratingLink}
          size="sm"
        >
          {isGeneratingLink ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Copy className="mr-2 h-4 w-4" />
          )}
          Copy Share Link
        </Button>
        
        {shareToken && (
          <Button
            onClick={handleViewSharedPlan}
            variant="secondary"
            size="sm"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View Shared Plan
          </Button>
        )}
        
        <Button
          onClick={handlePrintPlan}
          variant="outline"
          disabled={isPrinting}
          size="sm"
        >
          {isPrinting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Printer className="mr-2 h-4 w-4" />
          )}
          Print Plan
        </Button>
      </div>

      {/* Spacer for mobile sticky bar */}
      <div className="h-20 md:hidden" />
    </>
  );
};

export default PWACShareActionBar;
