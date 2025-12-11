import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, CheckSquare } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ItemsSection } from "./ItemsSection";
import { TasksSectionV2 } from "../tasks/TasksSectionV2";
import { SuggestedItemsTab } from "../SuggestedItemsTab";
import { PaymentHistoryTab } from "../PaymentHistoryTab";
import { cn } from "@/lib/utils";
interface ItemsTasksTabV2Props {
  eventId: string;
  eventName: string;
  eventDate: string | null;
  eventLocation?: string;
  contributionsEnabled: boolean;
  contributionGoal: number;
  expectedGuestCount: number;
}
export const ItemsTasksTabV2 = ({
  eventId,
  eventName,
  eventDate,
  eventLocation = "",
  contributionsEnabled,
  contributionGoal,
  expectedGuestCount
}: ItemsTasksTabV2Props) => {
  const isMobile = useIsMobile();
  const [activeSegment, setActiveSegment] = useState<string>(() => {
    try {
      return localStorage.getItem('items-tasks-segment') || 'items';
    } catch {
      return 'items';
    }
  });
  const [subView, setSubView] = useState<'main' | 'suggestions' | 'payments'>('main');
  const [suggestionCount, setSuggestionCount] = useState(0);
  const [paymentCount, setPaymentCount] = useState(0);
  useEffect(() => {
    loadCounts();
    const channel = supabase.channel(`items-tasks-counts-${eventId}`).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'item_suggestions',
      filter: `event_id=eq.${eventId}`
    }, loadCounts).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'item_claims',
      filter: `event_id=eq.${eventId}`
    }, loadCounts).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId]);
  const loadCounts = async () => {
    const {
      count: suggestionsCount
    } = await supabase.from('item_suggestions').select('*', {
      count: 'exact',
      head: true
    }).eq('event_id', eventId).eq('status', 'pending');
    setSuggestionCount(suggestionsCount || 0);
    const {
      count: paymentsCount
    } = await supabase.from('item_claims').select('*', {
      count: 'exact',
      head: true
    }).eq('event_id', eventId).eq('claim_type', 'monetary').eq('payment_verified', false);
    setPaymentCount(paymentsCount || 0);
  };
  const handleSegmentChange = (value: string) => {
    setActiveSegment(value);
    setSubView('main');
    try {
      localStorage.setItem('items-tasks-segment', value);
    } catch {}
  };

  // Sub-views for Items (suggestions, payments)
  if (subView === 'suggestions') {
    return <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSubView('main')}>
            ← Back to Items
          </Button>
        </div>
        <SuggestedItemsTab eventId={eventId} />
      </div>;
  }
  if (subView === 'payments') {
    return <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSubView('main')}>
            ← Back to Items
          </Button>
        </div>
        <PaymentHistoryTab eventId={eventId} />
      </div>;
  }
  return <div className="space-y-4 pb-24 md:pb-8">
      {/* Header - compact on mobile, with helper on desktop */}
      <div className="space-y-1">
        <h1 className="text-base font-semibold text-foreground">Items & Tasks</h1>
        <p className="hidden md:block text-xs text-muted-foreground">
          Organize what guests bring and what you'll handle.
        </p>
      </div>

      {/* Segmented Control */}
      <div className={cn("sticky top-0 z-20 bg-background py-2 -mx-4 px-4", isMobile && "border-b")}>
        <Tabs value={activeSegment} onValueChange={handleSegmentChange}>
          <TabsList className="grid w-full grid-cols-2 h-11">
            <TabsTrigger value="items" className="h-9 gap-2">
              <Package className="h-4 w-4" />
              Items
            </TabsTrigger>
            <TabsTrigger value="tasks" className="h-9 gap-2">
              <CheckSquare className="h-4 w-4" />
              Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="mt-4 animate-fade-in">
            <ItemsSection eventId={eventId} eventName={eventName} eventDate={eventDate} eventLocation={eventLocation} contributionsEnabled={contributionsEnabled} expectedGuestCount={expectedGuestCount} onViewSuggestions={() => setSubView('suggestions')} onViewPayments={() => setSubView('payments')} suggestionCount={suggestionCount} paymentCount={paymentCount} />
          </TabsContent>

          {/* Tasks Content */}
          <TabsContent value="tasks" className="mt-4 animate-fade-in">
            <TasksSectionV2 eventId={eventId} eventDate={eventDate} eventName={eventName} />
          </TabsContent>
        </Tabs>
      </div>
    </div>;
};