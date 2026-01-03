import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/hooks/use-database";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Filter } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useBranchFilter } from "@/hooks/use-branch-filter";

const Reports = () => {
  const { filterBranchId, isBranchRestricted, isLoading: branchLoading } = useBranchFilter();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");

  // Set initial branch filter based on staff permissions
  useEffect(() => {
    if (filterBranchId) {
      setSelectedBranchId(filterBranchId);
    }
  }, [filterBranchId]);

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      return data;
    },
  });

  // Fetch branches for filter
  const { data: branches = [] } = useQuery({
    queryKey: ['branches', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data } = await supabase
        .from('branches')
        .select('id, name')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true);

      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });

  // Fetch sales data with optional branch filter
  const { data: salesData } = useQuery({
    queryKey: ['sales-report', profile?.tenant_id, selectedBranchId],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      let query = supabase
        .from('sales')
        .select('sale_date, total_amount, payment_method, branch_id, branches(name)')
        .eq('tenant_id', profile.tenant_id);

      if (selectedBranchId !== "all") {
        query = query.eq('branch_id', selectedBranchId);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });

  // Fetch expenses data with optional branch filter
  const { data: expensesData } = useQuery({
    queryKey: ['expenses-report', profile?.tenant_id, selectedBranchId],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      let query = supabase
        .from('expenses')
        .select('category, amount, expense_date, branch_id, branches(name)')
        .eq('tenant_id', profile.tenant_id);

      if (selectedBranchId !== "all") {
        query = query.eq('branch_id', selectedBranchId);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });

  // Fetch customer payments
  const { data: customerPaymentsData } = useQuery({
    queryKey: ['customer-payments-report', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data } = await supabase
        .from('customer_payments')
        .select('amount, payment_date, payment_method, customers(name)')
        .eq('tenant_id', profile.tenant_id);

      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });

  // Fetch products for inventory value
  const { data: productsData } = useQuery({
    queryKey: ['products-report', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data } = await supabase
        .from('products')
        .select('name, stock_quantity, unit_price, cost_price')
        .eq('tenant_id', profile.tenant_id);

      return data || [];
    },
    enabled: !!profile?.tenant_id,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate Income Statement values
  const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
  const totalCustomerPayments = customerPaymentsData?.reduce((sum, payment) => sum + Number(payment.amount), 0) || 0;
  
  // Calculate average basket size
  const totalTransactions = salesData?.length || 0;
  const averageBasketSize = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  
  // Group expenses by category
  const expensesByCategory = expensesData?.reduce((acc: Record<string, number>, expense) => {
    const category = expense.category || 'Other';
    acc[category] = (acc[category] || 0) + Number(expense.amount);
    return acc;
  }, {}) || {};

  // Group sales by branch
  const salesByBranch = salesData?.reduce((acc: Record<string, number>, sale: any) => {
    const branchName = sale.branches?.name || 'No Branch';
    acc[branchName] = (acc[branchName] || 0) + Number(sale.total_amount);
    return acc;
  }, {}) || {};

  // Group expenses by branch
  const expensesByBranch = expensesData?.reduce((acc: Record<string, number>, expense: any) => {
    const branchName = expense.branches?.name || 'No Branch';
    acc[branchName] = (acc[branchName] || 0) + Number(expense.amount);
    return acc;
  }, {}) || {};

  const totalExpenses = Object.values(expensesByCategory).reduce((sum, val) => sum + val, 0);
  const grossProfit = totalRevenue;
  const netIncome = grossProfit - totalExpenses;

  // Calculate Balance Sheet values
  const inventoryValue = productsData?.reduce((sum, product) => {
    const costPrice = Number(product.cost_price) || Number(product.unit_price) || 0;
    const quantity = Number(product.stock_quantity) || 0;
    return sum + (costPrice * quantity);
  }, 0) || 0;

  const cashFromSales = totalRevenue - totalExpenses;
  const totalAssets = inventoryValue + Math.max(0, cashFromSales);
  
  const retainedEarnings = netIncome;
  const totalEquity = retainedEarnings;
  const totalLiabilities = totalAssets - totalEquity;

  const currentDate = format(new Date(), 'MMMM dd, yyyy');
  const selectedBranchName = selectedBranchId === "all" 
    ? "All Branches" 
    : branches.find(b => b.id === selectedBranchId)?.name || "Selected Branch";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Financial Reports</h1>
          <p className="text-muted-foreground">Income Statement & Balance Sheet</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Branch Filter - only show if user has access to multiple branches */}
      {branches.length > 0 && !isBranchRestricted && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <Label htmlFor="branch-filter">Filter by Branch:</Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="income-statement" className="space-y-6">
        <TabsList>
          <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="branch-breakdown">Branch Breakdown</TabsTrigger>
          <TabsTrigger value="payments">Customer Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="income-statement">
          <Card>
            <CardHeader className="border-b">
              <div className="text-center">
                <CardTitle className="text-xl">Income Statement</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  For the Period Ending {currentDate} - {selectedBranchName}
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="text-right font-semibold">Amount (UGX)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Revenue Section */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={2} className="font-semibold">REVENUE</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Sales Revenue</TableCell>
                    <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Total Transactions</TableCell>
                    <TableCell className="text-right">{totalTransactions}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Average Basket Size</TableCell>
                    <TableCell className="text-right">{formatCurrency(averageBasketSize)}</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">Total Revenue</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(totalRevenue)}</TableCell>
                  </TableRow>

                  {/* Gross Profit */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={2} className="font-semibold">GROSS PROFIT</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Gross Profit</TableCell>
                    <TableCell className="text-right">{formatCurrency(grossProfit)}</TableCell>
                  </TableRow>

                  {/* Operating Expenses */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={2} className="font-semibold">OPERATING EXPENSES</TableCell>
                  </TableRow>
                  {Object.entries(expensesByCategory).length > 0 ? (
                    Object.entries(expensesByCategory).map(([category, amount]) => (
                      <TableRow key={category}>
                        <TableCell className="pl-8">{category}</TableCell>
                        <TableCell className="text-right text-destructive">({formatCurrency(amount)})</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="pl-8 text-muted-foreground">No expenses recorded</TableCell>
                      <TableCell className="text-right">-</TableCell>
                    </TableRow>
                  )}
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">Total Operating Expenses</TableCell>
                    <TableCell className="text-right font-semibold text-destructive">({formatCurrency(totalExpenses)})</TableCell>
                  </TableRow>

                  {/* Net Income */}
                  <TableRow className="bg-primary/10 border-t-4">
                    <TableCell className="font-bold text-lg">NET INCOME</TableCell>
                    <TableCell className={`text-right font-bold text-lg ${netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {netIncome >= 0 ? formatCurrency(netIncome) : `(${formatCurrency(Math.abs(netIncome))})`}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance-sheet">
          <Card>
            <CardHeader className="border-b">
              <div className="text-center">
                <CardTitle className="text-xl">Balance Sheet</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  As of {currentDate}
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="text-right font-semibold">Amount (UGX)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Assets Section */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={2} className="font-semibold">ASSETS</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/20">
                    <TableCell className="pl-4 font-medium">Current Assets</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Cash and Cash Equivalents</TableCell>
                    <TableCell className="text-right">{formatCurrency(Math.max(0, cashFromSales))}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Inventory</TableCell>
                    <TableCell className="text-right">{formatCurrency(inventoryValue)}</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">Total Current Assets</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(totalAssets)}</TableCell>
                  </TableRow>
                  <TableRow className="bg-primary/10 border-t-4">
                    <TableCell className="font-bold text-lg">TOTAL ASSETS</TableCell>
                    <TableCell className="text-right font-bold text-lg">{formatCurrency(totalAssets)}</TableCell>
                  </TableRow>

                  {/* Liabilities Section */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={2} className="font-semibold">LIABILITIES</TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/20">
                    <TableCell className="pl-4 font-medium">Current Liabilities</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Accounts Payable</TableCell>
                    <TableCell className="text-right">{formatCurrency(Math.max(0, totalLiabilities))}</TableCell>
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">Total Liabilities</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(Math.max(0, totalLiabilities))}</TableCell>
                  </TableRow>

                  {/* Equity Section */}
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={2} className="font-semibold">EQUITY</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="pl-8">Retained Earnings</TableCell>
                    <TableCell className={`text-right ${retainedEarnings >= 0 ? '' : 'text-destructive'}`}>
                      {retainedEarnings >= 0 ? formatCurrency(retainedEarnings) : `(${formatCurrency(Math.abs(retainedEarnings))})`}
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-t-2">
                    <TableCell className="font-semibold">Total Equity</TableCell>
                    <TableCell className={`text-right font-semibold ${totalEquity >= 0 ? '' : 'text-destructive'}`}>
                      {totalEquity >= 0 ? formatCurrency(totalEquity) : `(${formatCurrency(Math.abs(totalEquity))})`}
                    </TableCell>
                  </TableRow>

                  {/* Total Liabilities + Equity */}
                  <TableRow className="bg-primary/10 border-t-4">
                    <TableCell className="font-bold text-lg">TOTAL LIABILITIES & EQUITY</TableCell>
                    <TableCell className="text-right font-bold text-lg">{formatCurrency(totalAssets)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branch-breakdown">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Sales by Branch */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sales by Branch</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Sales (UGX)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(salesByBranch).length > 0 ? (
                      Object.entries(salesByBranch).map(([branch, amount]) => (
                        <TableRow key={branch}>
                          <TableCell>{branch}</TableCell>
                          <TableCell className="text-right">{formatCurrency(amount)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No sales data
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalRevenue)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Expenses by Branch */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expenses by Branch</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Branch</TableHead>
                      <TableHead className="text-right">Expenses (UGX)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(expensesByBranch).length > 0 ? (
                      Object.entries(expensesByBranch).map(([branch, amount]) => (
                        <TableRow key={branch}>
                          <TableCell>{branch}</TableCell>
                          <TableCell className="text-right text-destructive">({formatCurrency(amount)})</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No expenses data
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-right text-destructive">({formatCurrency(totalExpenses)})</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customer Payments Received</CardTitle>
              <p className="text-sm text-muted-foreground">
                Total: {formatCurrency(totalCustomerPayments)}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Amount (UGX)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerPaymentsData && customerPaymentsData.length > 0 ? (
                    customerPaymentsData.map((payment: any, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{payment.customers?.name || 'N/A'}</TableCell>
                        <TableCell>
                          {payment.payment_date 
                            ? format(new Date(payment.payment_date), 'MMM dd, yyyy')
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="capitalize">{payment.payment_method || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(payment.amount)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No customer payments recorded
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {(!salesData?.length && !expensesData?.length && !productsData?.length) && (
        <Card className="mt-6">
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No financial data available yet. Start recording sales and expenses to generate reports.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;
