import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatUGX } from "@/lib/accounting";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Wallet, TrendingUp, TrendingDown, Home, Download, BarChart3, Receipt, Building2 } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function RentalFinancialReports() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const [activeTab, setActiveTab] = useState("pnl");

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  const periodStart = startOfMonth(new Date(selectedYear, selectedMonth)).toISOString().split("T")[0];
  const periodEnd = endOfMonth(new Date(selectedYear, selectedMonth)).toISOString().split("T")[0];

  const { data: payments = [] } = useQuery({
    queryKey: ["rental-financial-payments", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_payments")
        .select("*, leases!inner(rental_tenants!inner(id, full_name, phone), rental_units!inner(id, unit_number))")
        .eq("tenant_id", tenantId!)
        .eq("status", "completed")
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["rental-financial-expenses", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("expense_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: units = [] } = useQuery({
    queryKey: ["rental-financial-units", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_units")
        .select("id, status")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: leases = [] } = useQuery({
    queryKey: ["rental-financial-leases", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leases")
        .select("*, rental_tenants!inner(id, full_name, phone), rental_units!inner(id, unit_number, monthly_rent)")
        .eq("tenant_id", tenantId!)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const occupiedUnits = units.filter((u: any) => u.status === "occupied").length;
  const occupancyRate = units.length > 0 ? (occupiedUnits / units.length) * 100 : 0;

  const filteredPayments = useMemo(
    () =>
      payments.filter((p: any) => {
        const d = p.payment_date;
        return d >= periodStart && d <= periodEnd;
      }),
    [payments, periodStart, periodEnd]
  );

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((e: any) => {
        const d = e.expense_date;
        return d >= periodStart && d <= periodEnd;
      }),
    [expenses, periodStart, periodEnd]
  );

  const totalIncome = filteredPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const totalExpenses = filteredExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  const netIncome = totalIncome - totalExpenses;

  const rentCollected = filteredPayments
    .filter((p: any) => p.payment_type === "rent")
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const lateFeesCollected = filteredPayments
    .filter((p: any) => p.payment_type === "late_fee")
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const depositsCollected = filteredPayments
    .filter((p: any) => p.payment_type === "deposit")
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const otherIncome = filteredPayments
    .filter((p: any) => p.payment_type === "other" || p.payment_type === "utility")
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  const expensesByCategory = filteredExpenses.reduce((acc: Record<string, number>, e: any) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {} as Record<string, number>);

  const expectedMonthlyRent = leases.reduce((sum: number, l: any) => sum + Number(l.monthly_rent || l.rental_units?.monthly_rent || 0), 0);
  const collectionRate = expectedMonthlyRent > 0 ? (totalIncome / expectedMonthlyRent) * 100 : 0;

  const tenantCollectionBreakdown = useMemo(() => {
    return leases.map((lease: any) => {
      const tenantName = (lease.rental_tenants as any)?.full_name || "Unknown";
      const unitNumber = (lease.rental_units as any)?.unit_number || "";
      const monthlyRent = Number(lease.monthly_rent || (lease.rental_units as any)?.monthly_rent || 0);
      const amountPaid = filteredPayments
        .filter((p: any) => p.lease_id === lease.id)
        .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
      const balance = Math.max(0, monthlyRent - amountPaid);
      let status: "paid" | "partial" | "unpaid";
      if (amountPaid >= monthlyRent) status = "paid";
      else if (amountPaid > 0) status = "partial";
      else status = "unpaid";
      return { tenantName, unitNumber, monthlyRent, amountPaid, balance, status };
    });
  }, [leases, filteredPayments]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Paid</Badge>;
      case "partial":
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Partial</Badge>;
      case "unpaid":
        return <Badge variant="destructive">Unpaid</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const exportCSV = (rows: any[], filename: string) => {
    const csv = rows.map((r) => Object.values(r).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generatePnLCSV = () => {
    const rows = [
      ["Category", "Amount (UGX)"],
      ["Total Rent Collected", rentCollected.toString()],
      ["Late Fees Collected", lateFeesCollected.toString()],
      ["Deposits Collected", depositsCollected.toString()],
      ["Other Income", otherIncome.toString()],
      ["Total Income", totalIncome.toString()],
      [],
      ...Object.entries(expensesByCategory).map(([cat, amt]) => [cat, amt.toString()]),
      ["Total Expenses", totalExpenses.toString()],
      [],
      ["Net Profit/Loss", netIncome.toString()],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pnl-${MONTHS[selectedMonth]}-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateCollectionCSV = () => {
    const rows = [
      ["Tenant Name", "Unit", "Monthly Rent (UGX)", "Amount Paid (UGX)", "Balance (UGX)", "Status"],
      ...tenantCollectionBreakdown.map((t: any) => [
        t.tenantName,
        t.unitNumber,
        t.monthlyRent.toString(),
        t.amountPaid.toString(),
        t.balance.toString(),
        t.status,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `collection-${MONTHS[selectedMonth]}-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const years = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i);

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
          <p className="text-muted-foreground">Rental income, expenses, and collection analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((name, i) => (
                <SelectItem key={i} value={i.toString()}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Rental Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatUGX(totalIncome)}</div>
            <p className="text-xs text-blue-600 dark:text-blue-400">{MONTHS[selectedMonth]} {selectedYear}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900 dark:text-red-100">{formatUGX(totalExpenses)}</div>
            <p className="text-xs text-red-600 dark:text-red-400">{filteredExpenses.length} expense(s)</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Net Income</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netIncome >= 0 ? "text-emerald-900 dark:text-emerald-100" : "text-red-900 dark:text-red-100"}`}>
              {formatUGX(netIncome)}
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              {netIncome >= 0 ? "Profitable" : "Loss"} period
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Occupancy Rate</CardTitle>
            <Home className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{occupancyRate.toFixed(1)}%</div>
            <p className="text-xs text-purple-600 dark:text-purple-400">{occupiedUnits} occupied / {units.length} total</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="collection">Collection</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="pnl" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                Profit & Loss Statement
              </CardTitle>
              <CardDescription>{MONTHS[selectedMonth]} {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-3/5">Category</TableHead>
                    <TableHead className="text-right w-2/5">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold text-base">Income</TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Total Rent Collected</TableCell>
                    <TableCell className="text-right font-medium">{formatUGX(rentCollected)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Late Fees Collected</TableCell>
                    <TableCell className="text-right font-medium">{formatUGX(lateFeesCollected)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Deposits Collected</TableCell>
                    <TableCell className="text-right font-medium">{formatUGX(depositsCollected)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Other Income</TableCell>
                    <TableCell className="text-right font-medium">{formatUGX(otherIncome)}</TableCell>
                  </TableRow>
                  <TableRow className="font-semibold border-t-2">
                    <TableCell>Total Income</TableCell>
                    <TableCell className="text-right text-emerald-600">{formatUGX(totalIncome)}</TableCell>
                  </TableRow>

                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold text-base pt-6">Expenses</TableCell>
                    <TableCell />
                  </TableRow>
                  {Object.entries(expensesByCategory).length === 0 ? (
                    <TableRow>
                      <TableCell className="pl-8 text-muted-foreground" colSpan={2}>No expenses recorded this period</TableCell>
                    </TableRow>
                  ) : (
                    Object.entries(expensesByCategory).map(([category, amount]) => (
                      <TableRow key={category}>
                        <TableCell className="pl-8">{category}</TableCell>
                        <TableCell className="text-right font-medium text-red-600">-{formatUGX(amount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="font-semibold border-t-2">
                    <TableCell>Total Expenses</TableCell>
                    <TableCell className="text-right text-red-600">-{formatUGX(totalExpenses)}</TableCell>
                  </TableRow>

                  <TableRow className="border-t-4 border-primary/20 bg-muted/50">
                    <TableCell className="font-bold text-base">Net Profit / Loss</TableCell>
                    <TableCell className={`text-right font-bold text-base ${netIncome >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatUGX(netIncome)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collection" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Expected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">{formatUGX(expectedMonthlyRent)}</div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{formatUGX(totalIncome)}</div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{formatUGX(Math.max(0, expectedMonthlyRent - totalIncome))}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-primary" />
                Collection Overview
              </CardTitle>
              <CardDescription>{MONTHS[selectedMonth]} {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Expected</span>
                    <span className="font-semibold">{formatUGX(expectedMonthlyRent)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4">
                    <div className="bg-emerald-500 h-4 rounded-full transition-all" style={{ width: "100%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Collected</span>
                    <span className="font-semibold">{formatUGX(totalIncome)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4">
                    <div
                      className="bg-blue-500 h-4 rounded-full transition-all"
                      style={{ width: `${expectedMonthlyRent > 0 ? Math.min(100, (totalIncome / expectedMonthlyRent) * 100) : 0}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Outstanding</span>
                    <span className="font-semibold">{formatUGX(Math.max(0, expectedMonthlyRent - totalIncome))}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-4">
                    <div
                      className="bg-orange-500 h-4 rounded-full transition-all"
                      style={{ width: `${expectedMonthlyRent > 0 ? Math.min(100, (Math.max(0, expectedMonthlyRent - totalIncome) / expectedMonthlyRent) * 100) : 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Collection Rate</p>
                <p className={`text-3xl font-bold ${collectionRate >= 80 ? "text-emerald-600" : collectionRate >= 50 ? "text-amber-600" : "text-red-600"}`}>
                  {collectionRate.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Tenant Collection Breakdown
              </CardTitle>
              <CardDescription>Per-tenant payment status for {MONTHS[selectedMonth]} {selectedYear}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Monthly Rent</TableHead>
                    <TableHead className="text-right">Amount Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantCollectionBreakdown.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No active leases found
                      </TableCell>
                    </TableRow>
                  ) : (
                    tenantCollectionBreakdown.map((t: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{t.tenantName}</TableCell>
                        <TableCell>{t.unitNumber}</TableCell>
                        <TableCell className="text-right">{formatUGX(t.monthlyRent)}</TableCell>
                        <TableCell className="text-right">{formatUGX(t.amountPaid)}</TableCell>
                        <TableCell className="text-right">{formatUGX(t.balance)}</TableCell>
                        <TableCell>{getStatusBadge(t.status)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Export Reports
              </CardTitle>
              <CardDescription>Download financial data as CSV files</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer" onClick={generatePnLCSV}>
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <Receipt className="h-12 w-12 text-primary mb-3" />
                    <h3 className="font-semibold text-lg">Profit & Loss Statement</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Income breakdown by type and expenses grouped by category
                    </p>
                    <Button variant="default" onClick={(e) => { e.stopPropagation(); generatePnLCSV(); }}>
                      <Download className="h-4 w-4 mr-2" />
                      Download P&L CSV
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer" onClick={generateCollectionCSV}>
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <BarChart3 className="h-12 w-12 text-primary mb-3" />
                    <h3 className="font-semibold text-lg">Collection Report</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Per-tenant collection status with rent, paid, and balance amounts
                    </p>
                    <Button variant="default" onClick={(e) => { e.stopPropagation(); generateCollectionCSV(); }}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Collection CSV
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  Reports are generated for <strong>{MONTHS[selectedMonth]} {selectedYear}</strong>.
                  Use the month and year selectors at the top to change the reporting period.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
