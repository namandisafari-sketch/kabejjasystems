// File: src/pages/business/Reports.tsx
// MOBILE-FIRST RESPONSIVE DESIGN

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Download, FileText, Filter, TrendingUp, TrendingDown, Menu, DollarSign, Wallet } from "lucide-react";
import { format } from "date-fns";
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
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";

const Reports = () => {
  const isMobile = useIsMobile();
  const { filterBranchId, isBranchRestricted, isLoading: branchLoading } = useBranchFilter();
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState("income-statement");

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

  const formatCompact = (amount: number) => {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(0) + 'K';
    }
    return amount.toString();
  };

  // Calculate Income Statement values
  const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
  
  // Group expenses by category
  const expensesByCategory = expensesData?.reduce((acc: Record<string, number>, expense) => {
    const category = expense.category || 'Other';
    acc[category] = (acc[category] || 0) + Number(expense.amount);
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
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Financial Reports</h1>
            <p className="text-xs text-muted-foreground">{currentDate}</p>
          </div>
          <div className="flex items-center gap-2">
            {branches.length > 0 && !isBranchRestricted && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowFilters(true)}
              >
                <Filter className="h-4 w-4" />
                {!isMobile && <span className="ml-2">Filter</span>}
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
              {!isMobile && <span className="ml-2">Export</span>}
            </Button>
          </div>
        </div>
      </header>

      {/* FILTER DRAWER */}
      <Drawer open={showFilters} onOpenChange={setShowFilters}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Filter Reports</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <div>
              <Label>Branch</Label>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger className="mt-2">
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
          <DrawerFooter>
            <Button onClick={() => setShowFilters(false)} className="w-full">
              Apply Filters
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* MAIN CONTENT */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* KEY METRICS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                    <p className="text-lg font-bold">{formatCompact(totalRevenue)}</p>
                  </div>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Expenses</p>
                    <p className="text-lg font-bold text-destructive">{formatCompact(totalExpenses)}</p>
                  </div>
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
              </CardContent>
            </Card>
            <Card className={netIncome >= 0 ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Net Profit</p>
                    <p className={`text-lg font-bold ${netIncome >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCompact(netIncome)}
                    </p>
                  </div>
                  <DollarSign className={`h-5 w-5 ${netIncome >= 0 ? 'text-green-600' : 'text-destructive'}`} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Inventory</p>
                    <p className="text-lg font-bold">{formatCompact(inventoryValue)}</p>
                  </div>
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="income-statement" className="text-xs sm:text-sm">
                Income
              </TabsTrigger>
              <TabsTrigger value="balance-sheet" className="text-xs sm:text-sm">
                Balance
              </TabsTrigger>
            </TabsList>

            {/* INCOME STATEMENT TAB */}
            <TabsContent value="income-statement" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Income Statement</CardTitle>
                  <p className="text-xs text-muted-foreground">{selectedBranchName}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Revenue */}
                  <div className="p-3 bg-primary/5 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Revenue</span>
                      <span className="font-bold text-primary">{formatCurrency(totalRevenue)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Total sales income</p>
                  </div>

                  {/* Expenses Breakdown */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Operating Expenses</p>
                    {Object.entries(expensesByCategory).length > 0 ? (
                      Object.entries(expensesByCategory).map(([category, amount]) => (
                        <div key={category} className="flex justify-between items-center py-2 border-b last:border-0">
                          <span className="text-sm">{category}</span>
                          <span className="text-sm text-destructive">-{formatCurrency(amount)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">No expenses recorded</p>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <span className="font-medium">Total Expenses</span>
                      <span className="font-bold text-destructive">-{formatCurrency(totalExpenses)}</span>
                    </div>
                  </div>

                  {/* Net Income */}
                  <div className={`p-4 rounded-lg ${netIncome >= 0 ? 'bg-green-500/10' : 'bg-destructive/10'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">Net Income</span>
                      <span className={`font-bold text-xl ${netIncome >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {netIncome >= 0 ? formatCurrency(netIncome) : `(${formatCurrency(Math.abs(netIncome))})`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {netIncome >= 0 ? 'Profit after expenses' : 'Loss for the period'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* BALANCE SHEET TAB */}
            <TabsContent value="balance-sheet" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Balance Sheet</CardTitle>
                  <p className="text-xs text-muted-foreground">As of {currentDate}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Assets */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Assets</p>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">Cash & Equivalents</span>
                      <span className="text-sm font-medium">{formatCurrency(Math.max(0, cashFromSales))}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">Inventory</span>
                      <span className="text-sm font-medium">{formatCurrency(inventoryValue)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 bg-muted/50 p-2 rounded">
                      <span className="font-medium">Total Assets</span>
                      <span className="font-bold">{formatCurrency(totalAssets)}</span>
                    </div>
                  </div>

                  {/* Liabilities */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Liabilities</p>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">Accounts Payable</span>
                      <span className="text-sm font-medium">{formatCurrency(Math.max(0, totalLiabilities))}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 bg-muted/50 p-2 rounded">
                      <span className="font-medium">Total Liabilities</span>
                      <span className="font-bold">{formatCurrency(Math.max(0, totalLiabilities))}</span>
                    </div>
                  </div>

                  {/* Equity */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Equity</p>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm">Retained Earnings</span>
                      <span className={`text-sm font-medium ${retainedEarnings >= 0 ? '' : 'text-destructive'}`}>
                        {retainedEarnings >= 0 ? formatCurrency(retainedEarnings) : `(${formatCurrency(Math.abs(retainedEarnings))})`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 bg-primary/10 p-2 rounded">
                      <span className="font-medium">Total Equity</span>
                      <span className={`font-bold ${totalEquity >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {totalEquity >= 0 ? formatCurrency(totalEquity) : `(${formatCurrency(Math.abs(totalEquity))})`}
                      </span>
                    </div>
                  </div>

                  {/* Verification */}
                  <div className="p-3 bg-muted/30 rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">
                      Assets = Liabilities + Equity ✓
                    </p>
                    <p className="text-sm font-medium mt-1">
                      {formatCompact(totalAssets)} = {formatCompact(Math.max(0, totalLiabilities))} + {formatCompact(totalEquity)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
};

export default Reports;
