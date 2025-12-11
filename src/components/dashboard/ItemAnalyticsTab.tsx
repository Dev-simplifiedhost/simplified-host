import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Package, 
  DollarSign, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Clock
} from "lucide-react";

interface ItemAnalyticsTabProps {
  eventId: string;
}

interface AnalyticsData {
  totalItems: number;
  fulfilledItems: number;
  partiallyFulfilledItems: number;
  unfulfilledItems: number;
  attendingContributions: { total: number; count: number };
  maybeContributions: { total: number; count: number };
  noRsvpContributions: { total: number; count: number };
  verifiedPayments: { total: number; count: number };
  pendingPayments: { total: number; count: number };
  itemsNeedingAttention: Array<{
    id: string;
    name: string;
    category: string;
    issue: string;
    severity: 'high' | 'medium' | 'low';
  }>;
}

export function ItemAnalyticsTab({ eventId }: ItemAnalyticsTabProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();

    // Set up real-time subscriptions
    const itemsChannel = supabase
      .channel(`analytics-items-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_items',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          loadAnalytics();
        }
      )
      .subscribe();

    const claimsChannel = supabase
      .channel(`analytics-claims-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'item_claims',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          loadAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
      supabase.removeChannel(claimsChannel);
    };
  }, [eventId]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch all items and claims
      const { data: items, error: itemsError } = await supabase
        .from('event_items')
        .select(`
          *,
          item_claims(
            *,
            rsvps:rsvp_id(rsvp_status)
          )
        `)
        .eq('event_id', eventId);

      if (itemsError) throw itemsError;

      // Calculate analytics
      const data: AnalyticsData = {
        totalItems: items?.length || 0,
        fulfilledItems: items?.filter(i => i.fulfillment_status === 'fulfilled').length || 0,
        partiallyFulfilledItems: items?.filter(i => i.fulfillment_status === 'partially_fulfilled').length || 0,
        unfulfilledItems: items?.filter(i => i.fulfillment_status === 'unfulfilled').length || 0,
        attendingContributions: { total: 0, count: 0 },
        maybeContributions: { total: 0, count: 0 },
        noRsvpContributions: { total: 0, count: 0 },
        verifiedPayments: { total: 0, count: 0 },
        pendingPayments: { total: 0, count: 0 },
        itemsNeedingAttention: []
      };

      // Calculate RSVP-based contributions and payment status
      items?.forEach(item => {
        item.item_claims?.forEach((claim: any) => {
          const amount = claim.amount_contributed || 0;
          const rsvpStatus = claim.rsvps?.rsvp_status;

          // RSVP breakdown (monetary contributions only)
          if (claim.claim_type === 'monetary') {
            if (rsvpStatus === 'attending') {
              data.attendingContributions.total += amount;
              data.attendingContributions.count++;
            } else if (rsvpStatus === 'maybe') {
              data.maybeContributions.total += amount;
              data.maybeContributions.count++;
            } else {
              data.noRsvpContributions.total += amount;
              data.noRsvpContributions.count++;
            }

            // Payment verification status
            if (claim.payment_verified) {
              data.verifiedPayments.total += amount;
              data.verifiedPayments.count++;
            } else {
              data.pendingPayments.total += amount;
              data.pendingPayments.count++;
            }
          }
        });

        // Identify items needing attention
        if (item.fulfillment_status === 'unfulfilled') {
          data.itemsNeedingAttention.push({
            id: item.id,
            name: item.name,
            category: item.category,
            issue: 'No contributions yet',
            severity: 'high'
          });
        } else if (item.fulfillment_status === 'partially_fulfilled') {
          const remaining = (item.goal_quantity || 0) - item.current_quantity;
          const remainingAmount = (item.goal_amount || 0) - item.current_amount;
          if (remaining > 0 || remainingAmount > 0) {
            data.itemsNeedingAttention.push({
              id: item.id,
              name: item.name,
              category: item.category,
              issue: remaining > 0 
                ? `Still need ${remaining} items` 
                : `Still need $${remainingAmount.toFixed(2)}`,
              severity: 'medium'
            });
          }
        }

        // Check for unverified payments
        const unverifiedCount = item.item_claims?.filter((c: any) => 
          c.claim_type === 'monetary' && !c.payment_verified
        ).length || 0;

        if (unverifiedCount > 0) {
          data.itemsNeedingAttention.push({
            id: item.id,
            name: item.name,
            category: item.category,
            issue: `${unverifiedCount} unverified payment${unverifiedCount > 1 ? 's' : ''}`,
            severity: 'medium'
          });
        }
      });

      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!analytics) return null;

  const fulfillmentPercentage = analytics.totalItems > 0 
    ? Math.round((analytics.fulfilledItems / analytics.totalItems) * 100)
    : 0;

  const totalContributions = 
    analytics.attendingContributions.total + 
    analytics.maybeContributions.total + 
    analytics.noRsvpContributions.total;

  const verificationRate = analytics.verifiedPayments.count + analytics.pendingPayments.count > 0
    ? Math.round((analytics.verifiedPayments.count / (analytics.verifiedPayments.count + analytics.pendingPayments.count)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.fulfilledItems} fulfilled ({fulfillmentPercentage}%)
            </p>
            <Progress value={fulfillmentPercentage} className="mt-2 h-1" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fulfillment Status</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Fulfilled</span>
                <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                  {analytics.fulfilledItems}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Partial</span>
                <Badge variant="secondary">{analytics.partiallyFulfilledItems}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unfulfilled</span>
                <Badge variant="destructive">{analytics.unfulfilledItems}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contributions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalContributions.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {analytics.attendingContributions.count + analytics.maybeContributions.count + analytics.noRsvpContributions.count} contributors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Verification</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{verificationRate}%</div>
            <p className="text-xs text-muted-foreground">
              {analytics.verifiedPayments.count} verified, {analytics.pendingPayments.count} pending
            </p>
            <Progress value={verificationRate} className="mt-2 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* RSVP Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            RSVP-Based Contribution Breakdown
          </CardTitle>
          <CardDescription>Monetary contributions by guest RSVP status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Attending Guests</p>
                  <p className="text-sm text-muted-foreground">{analytics.attendingContributions.count} contributions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${analytics.attendingContributions.total.toFixed(2)}</p>
                {totalContributions > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {Math.round((analytics.attendingContributions.total / totalContributions) * 100)}% of total
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium">Maybe Guests</p>
                  <p className="text-sm text-muted-foreground">{analytics.maybeContributions.count} contributions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${analytics.maybeContributions.total.toFixed(2)}</p>
                {totalContributions > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {Math.round((analytics.maybeContributions.total / totalContributions) * 100)}% of total
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">No RSVP / Other</p>
                  <p className="text-sm text-muted-foreground">{analytics.noRsvpContributions.count} contributions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${analytics.noRsvpContributions.total.toFixed(2)}</p>
                {totalContributions > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {Math.round((analytics.noRsvpContributions.total / totalContributions) * 100)}% of total
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Verification Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Payment Verification Summary
          </CardTitle>
          <CardDescription>Track verified and pending payment confirmations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg border bg-green-50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-green-900">Verified Payments</p>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-900">${analytics.verifiedPayments.total.toFixed(2)}</p>
              <p className="text-sm text-green-700 mt-1">{analytics.verifiedPayments.count} payment{analytics.verifiedPayments.count !== 1 ? 's' : ''}</p>
            </div>

            <div className="p-4 rounded-lg border bg-orange-50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-orange-900">Pending Verification</p>
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-3xl font-bold text-orange-900">${analytics.pendingPayments.total.toFixed(2)}</p>
              <p className="text-sm text-orange-700 mt-1">{analytics.pendingPayments.count} payment{analytics.pendingPayments.count !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Needing Attention */}
      {analytics.itemsNeedingAttention.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Items Needing Attention
            </CardTitle>
            <CardDescription>Items that require follow-up or action</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.itemsNeedingAttention.map((item) => (
                <div key={`${item.id}-${item.issue}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={item.severity === 'high' ? 'destructive' : 'secondary'}
                      className="capitalize"
                    >
                      {item.severity}
                    </Badge>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.issue}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}