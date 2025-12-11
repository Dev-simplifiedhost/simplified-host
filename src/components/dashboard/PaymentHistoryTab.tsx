import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Download, Filter, Search, DollarSign, CheckCircle, XCircle, Clock, Calendar, Mail, User, CreditCard, Banknote } from "lucide-react";
import { format } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BulkPaymentConfirmDialog } from "./BulkPaymentConfirmDialog";

interface PaymentRecord {
  id: string;
  contributor_name: string;
  contributor_email: string | null;
  amount_contributed: number;
  payment_verified: boolean;
  verified_at: string | null;
  created_at: string;
  payment_method: string | null;
  item: {
    name: string;
    category: string;
  };
}

interface PaymentHistoryTabProps {
  eventId: string;
}

export function PaymentHistoryTab({ eventId }: PaymentHistoryTabProps) {
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "unverified">("all");
  const [methodFilter, setMethodFilter] = useState<"all" | "card" | "manual">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedPayments, setSelectedPayments] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkConfirmDialog, setShowBulkConfirmDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<'verify' | 'deny' | null>(null);

  useEffect(() => {
    loadPaymentHistory();

    const channel = supabase
      .channel(`payment-history-${eventId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'item_claims', 
        filter: `event_id=eq.${eventId}` 
      }, loadPaymentHistory)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  const loadPaymentHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('item_claims')
        .select(`
          id,
          contributor_name,
          contributor_email,
          amount_contributed,
          payment_verified,
          verified_at,
          created_at,
          payment_method,
          item:event_items(name, category)
        `)
        .eq('event_id', eventId)
        .eq('claim_type', 'monetary')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error loading payment history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        payment.contributor_name.toLowerCase().includes(searchLower) ||
        payment.contributor_email?.toLowerCase().includes(searchLower) ||
        payment.item.name.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = 
        statusFilter === "all" ||
        (statusFilter === "verified" && payment.payment_verified) ||
        (statusFilter === "unverified" && !payment.payment_verified);

      // Payment method filter
      const isCardPayment = payment.payment_method === 'card';
      const matchesMethod =
        methodFilter === "all" ||
        (methodFilter === "card" && isCardPayment) ||
        (methodFilter === "manual" && !isCardPayment);

      // Date range filter
      const paymentDate = new Date(payment.created_at);
      const matchesDateFrom = !dateFrom || paymentDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || paymentDate <= new Date(dateTo + 'T23:59:59');

      return matchesSearch && matchesStatus && matchesMethod && matchesDateFrom && matchesDateTo;
    });
  }, [payments, searchTerm, statusFilter, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = filteredPayments.reduce((sum, p) => sum + p.amount_contributed, 0);
    const verified = filteredPayments
      .filter(p => p.payment_verified)
      .reduce((sum, p) => sum + p.amount_contributed, 0);
    const unverified = filteredPayments
      .filter(p => !p.payment_verified)
      .reduce((sum, p) => sum + p.amount_contributed, 0);
    
    return {
      total,
      verified,
      unverified,
      count: filteredPayments.length,
      verifiedCount: filteredPayments.filter(p => p.payment_verified).length,
      unverifiedCount: filteredPayments.filter(p => !p.payment_verified).length,
    };
  }, [filteredPayments]);

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Contributor Name',
      'Email',
      'Item',
      'Category',
      'Amount',
      'Payment Method',
      'Status',
      'Verified Date'
    ];

    const csvData = filteredPayments.map(payment => [
      format(new Date(payment.created_at), 'yyyy-MM-dd HH:mm:ss'),
      payment.contributor_name,
      payment.contributor_email || 'N/A',
      payment.item.name,
      payment.item.category,
      `$${payment.amount_contributed.toFixed(2)}`,
      payment.payment_method === 'card' ? 'Credit Card' : 'Manual',
      payment.payment_verified ? 'Verified' : 'Unverified',
      payment.verified_at ? format(new Date(payment.verified_at), 'yyyy-MM-dd HH:mm:ss') : 'N/A'
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: `Exported ${filteredPayments.length} payment records`,
    });
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setMethodFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  // Selection management
  const togglePaymentSelection = (paymentId: string) => {
    const newSelection = new Set(selectedPayments);
    if (newSelection.has(paymentId)) {
      newSelection.delete(paymentId);
    } else {
      newSelection.add(paymentId);
    }
    setSelectedPayments(newSelection);
  };

  const selectAllUnverified = () => {
    const unverifiedIds = filteredPayments
      .filter(p => !p.payment_verified)
      .map(p => p.id);
    setSelectedPayments(new Set(unverifiedIds));
  };

  const clearSelection = () => {
    setSelectedPayments(new Set());
  };

  const selectedPaymentObjects = useMemo(() => {
    return filteredPayments.filter(p => selectedPayments.has(p.id));
  }, [filteredPayments, selectedPayments]);

  // Bulk actions
  const handleBulkVerify = async () => {
    setBulkActionLoading(true);
    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      for (const paymentId of Array.from(selectedPayments)) {
        try {
          const { error } = await supabase
            .from('item_claims')
            .update({
              payment_verified: true,
              verified_at: new Date().toISOString(),
              verified_by: user?.id
            })
            .eq('id', paymentId);
          
          if (error) throw error;
          
          await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('reference_id', paymentId)
            .eq('notification_type', 'payment_pending');
          
          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Failed to verify payment: ${error.message}`);
        }
      }
      
      if (results.failed === 0) {
        toast({
          title: "Bulk verification complete",
          description: `Successfully verified ${results.success} payment${results.success !== 1 ? 's' : ''}`,
        });
      } else {
        toast({
          title: "Bulk verification completed with errors",
          description: `Verified: ${results.success}, Failed: ${results.failed}`,
          variant: "destructive",
        });
      }
      
      clearSelection();
      loadPaymentHistory();
    } finally {
      setBulkActionLoading(false);
      setShowBulkConfirmDialog(false);
    }
  };

  const handleBulkDeny = async () => {
    setBulkActionLoading(true);
    const results = { success: 0, failed: 0 };
    
    try {
      for (const paymentId of Array.from(selectedPayments)) {
        try {
          const { error } = await supabase
            .from('item_claims')
            .delete()
            .eq('id', paymentId);
          
          if (error) throw error;
          
          await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('reference_id', paymentId)
            .eq('notification_type', 'payment_pending');
          
          results.success++;
        } catch (error) {
          results.failed++;
        }
      }
      
      if (results.failed === 0) {
        toast({
          title: "Bulk denial complete",
          description: `Successfully denied ${results.success} payment${results.success !== 1 ? 's' : ''}`,
        });
      } else {
        toast({
          title: "Bulk denial completed with errors",
          description: `Denied: ${results.success}, Failed: ${results.failed}`,
          variant: "destructive",
        });
      }
      
      clearSelection();
      loadPaymentHistory();
    } finally {
      setBulkActionLoading(false);
      setShowBulkConfirmDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contributions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">${stats.total.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats.count} payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold text-green-600">${stats.verified.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats.verifiedCount} payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Verification</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-2xl font-bold text-amber-600">${stats.unverified.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{stats.unverifiedCount} payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verification Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {stats.count > 0 ? Math.round((stats.verifiedCount / stats.count) * 100) : 0}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.verifiedCount} of {stats.count}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedPayments.size > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-medium">
                  {selectedPayments.size} payment{selectedPayments.size !== 1 ? 's' : ''} selected
                </span>
                <Badge variant="outline" className="bg-background">
                  Total: ${selectedPaymentObjects.reduce((sum, p) => sum + p.amount_contributed, 0).toFixed(2)}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBulkAction('deny');
                    setShowBulkConfirmDialog(true);
                  }}
                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Deny Selected
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setBulkAction('verify');
                    setShowBulkConfirmDialog(true);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verify Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>View and manage all monetary contributions</CardDescription>
            </div>
            <Button onClick={exportToCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Controls */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Name, email, or item..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="verified">Verified Only</SelectItem>
                    <SelectItem value="unverified">Unverified Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Payment Method</Label>
                <Select value={methodFilter} onValueChange={(v: any) => setMethodFilter(v)}>
                  <SelectTrigger id="method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="card">Credit Card Only</SelectItem>
                    <SelectItem value="manual">Manual Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            {(searchTerm || statusFilter !== "all" || methodFilter !== "all" || dateFrom || dateTo) && (
              <Button variant="outline" size="sm" onClick={clearFilters} className="w-fit">
                Clear Filters
              </Button>
            )}
          </div>

          <Separator />

          {/* Payment Records Table */}
          <div className="rounded-md border">
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedPayments.size > 0 && 
                                 selectedPayments.size === filteredPayments.filter(p => !p.payment_verified).length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            selectAllUnverified();
                          } else {
                            clearSelection();
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Contributor</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No payment records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id} className={selectedPayments.has(payment.id) ? "bg-blue-50 dark:bg-blue-950" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPayments.has(payment.id)}
                            onCheckedChange={() => togglePaymentSelection(payment.id)}
                            disabled={payment.payment_verified}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(payment.created_at), 'MMM d, yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(payment.created_at), 'h:mm a')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2">
                            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="font-medium">{payment.contributor_name}</p>
                              {payment.contributor_email && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {payment.contributor_email}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payment.item.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {payment.item.category}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-bold">${payment.amount_contributed.toFixed(2)}</span>
                        </TableCell>
                        <TableCell>
                          {payment.payment_method === 'card' ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                              <CreditCard className="h-3 w-3 mr-1" />
                              Card
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700">
                              <Banknote className="h-3 w-3 mr-1" />
                              Manual
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {payment.payment_verified ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {payment.verified_at ? (
                            <div className="text-sm">
                              {format(new Date(payment.verified_at), 'MMM d, yyyy')}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Payment Details</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-muted-foreground">Contributor</Label>
                                    <p className="font-medium">{payment.contributor_name}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Amount</Label>
                                    <p className="font-medium text-lg">
                                      ${payment.amount_contributed.toFixed(2)}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Email</Label>
                                    <p className="font-medium">
                                      {payment.contributor_email || 'Not provided'}
                                    </p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Item</Label>
                                    <p className="font-medium">{payment.item.name}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Category</Label>
                                    <p className="font-medium capitalize">{payment.item.category}</p>
                                  </div>
                                  <div>
                                    <Label className="text-muted-foreground">Submitted</Label>
                                    <p className="font-medium">
                                      {format(new Date(payment.created_at), 'PPp')}
                                    </p>
                                  </div>
                                  <div className="col-span-2">
                                    <Label className="text-muted-foreground">Status</Label>
                                    <div className="mt-1">
                                      {payment.payment_verified ? (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Verified on {format(new Date(payment.verified_at!), 'PPp')}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                          <Clock className="h-3 w-3 mr-1" />
                                          Pending Verification
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Confirmation Dialog */}
      <BulkPaymentConfirmDialog
        open={showBulkConfirmDialog}
        onOpenChange={setShowBulkConfirmDialog}
        action={bulkAction || 'verify'}
        payments={selectedPaymentObjects}
        onConfirm={bulkAction === 'verify' ? handleBulkVerify : handleBulkDeny}
        loading={bulkActionLoading}
      />
    </div>
  );
}
