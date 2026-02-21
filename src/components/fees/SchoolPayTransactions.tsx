import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, Search, CheckCircle, AlertCircle, Clock, Download, Calendar } from "lucide-react";
import { format, subDays } from "date-fns";

interface SchoolPayTransactionsProps {
  tenantId: string;
}

export function SchoolPayTransactions({ tenantId }: SchoolPayTransactionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [syncDate, setSyncDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [syncToDate, setSyncToDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["schoolpay-transactions", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("schoolpay_transactions") as any)
        .select("*, students:matched_student_id(full_name, admission_number)")
        .eq("tenant_id", tenantId)
        .order("payment_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["schoolpay-settings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await (supabase
        .from("schoolpay_settings") as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      return data;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("schoolpay-sync", {
        body: {
          fromDate: syncDate,
          toDate: syncToDate,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["schoolpay-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["student-fees"] });
      queryClient.invalidateQueries({ queryKey: ["payment-history"] });
      queryClient.invalidateQueries({ queryKey: ["schoolpay-settings"] });
      toast({
        title: "Sync Complete",
        description: `${data.inserted} new transactions, ${data.autoReconciled} auto-reconciled, ${data.skipped} already existed`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
    },
  });

  const filteredTransactions = transactions.filter((txn: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      txn.student_name?.toLowerCase().includes(q) ||
      txn.student_payment_code?.toLowerCase().includes(q) ||
      txn.schoolpay_receipt_number?.toLowerCase().includes(q) ||
      txn.students?.full_name?.toLowerCase().includes(q) ||
      txn.students?.admission_number?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: transactions.length,
    reconciled: transactions.filter((t: any) => t.reconciliation_status === "reconciled").length,
    pending: transactions.filter((t: any) => t.reconciliation_status === "pending" || t.reconciliation_status === "matched").length,
    unmatched: transactions.filter((t: any) => t.reconciliation_status === "unmatched").length,
    totalAmount: transactions.reduce((sum: number, t: any) => sum + (parseFloat(t.amount) || 0), 0),
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "reconciled":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Reconciled</Badge>;
      case "matched":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"><Clock className="h-3 w-3 mr-1" />Matched</Badge>;
      case "unmatched":
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"><AlertCircle className="h-3 w-3 mr-1" />Unmatched</Badge>;
      case "needs_attention":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Needs Attention</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", maximumFractionDigits: 0 }).format(amount);

  if (!settings) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <img
            src="https://www.schoolpay.co.ug/assets/images/logo.png"
            alt="SchoolPay"
            className="h-10 mb-4 opacity-50"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <p className="text-muted-foreground text-center">
            SchoolPay is not configured yet. Go to <strong>Settings → SchoolPay</strong> to set up your integration.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Synced</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Reconciled</p>
            <p className="text-2xl font-bold text-green-600">{stats.reconciled}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Unmatched</p>
            <p className="text-2xl font-bold text-orange-600">{stats.unmatched}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="text-xl font-bold">{formatCurrency(stats.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Sync Transactions
          </CardTitle>
          <CardDescription>
            Pull historical transactions from SchoolPay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">From Date</label>
              <Input
                type="date"
                value={syncDate}
                onChange={(e) => setSyncDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">To Date</label>
              <Input
                type="date"
                value={syncToDate}
                onChange={(e) => setSyncToDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Sync Now
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSyncDate(format(subDays(new Date(), 7), "yyyy-MM-dd"));
                setSyncToDate(format(new Date(), "yyyy-MM-dd"));
              }}
            >
              Last 7 Days
            </Button>
          </div>
          {settings.last_sync_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Last synced: {new Date(settings.last_sync_at).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between gap-3">
            <CardTitle className="text-base">SchoolPay Transactions</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No SchoolPay transactions yet.</p>
              <p className="text-sm mt-1">Use the sync button above to pull transactions, or configure the webhook for real-time updates.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Payment Code</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((txn: any) => (
                    <TableRow key={txn.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {txn.payment_date
                          ? format(new Date(txn.payment_date), "MMM d, yyyy HH:mm")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{txn.student_name}</p>
                          {txn.students?.full_name && (
                            <p className="text-xs text-muted-foreground">
                              → {txn.students.full_name} ({txn.students.admission_number})
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{txn.student_payment_code}</TableCell>
                      <TableCell className="font-bold whitespace-nowrap">
                        {formatCurrency(parseFloat(txn.amount))}
                      </TableCell>
                      <TableCell className="text-xs">{txn.payment_channel}</TableCell>
                      <TableCell className="font-mono text-xs">{txn.schoolpay_receipt_number}</TableCell>
                      <TableCell>{getStatusBadge(txn.reconciliation_status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
