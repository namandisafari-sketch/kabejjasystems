import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/hooks/use-database";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, TrendingDown, TrendingUp, CreditCard, Calendar, Bug } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { isSchoolBusiness } from "@/config/businessTypes";
import SchoolDashboard from "@/components/dashboard/SchoolDashboard";
import RentalDashboard from "./rental/RentalDashboard";

// Uganda timezone offset (UTC+3)
const getUgandaDate = (date?: Date) => {
  const d = date || new Date();
  // Get UTC time and add 3 hours for Uganda
  const ugandaOffset = 3 * 60; // 3 hours in minutes
  const localOffset = d.getTimezoneOffset();
  const ugandaTime = new Date(d.getTime() + (localOffset + ugandaOffset) * 60000);
  return ugandaTime;
};

const formatUgandaDate = (date: Date) => {
  return format(date, "yyyy-MM-dd");
};

const BusinessDashboard = () => {
  const { data: tenant } = useTenant();
  const [selectedDate, setSelectedDate] = useState<Date>(getUgandaDate());

  // Check if this is a school business type
  const isSchool = tenant?.businessType && isSchoolBusiness(tenant.businessType);
  
  // Check if this is a rental management business
  const isRental = tenant?.businessType === 'rental_management';
  
  const selectedDateStr = formatUgandaDate(selectedDate);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Daily stats query
  const { data: dailyStats, isLoading } = useQuery({
    queryKey: ['daily-dashboard-stats', tenant?.tenantId, selectedDateStr],
    queryFn: async () => {
      if (!tenant?.tenantId) return null;

      const startOfDay = `${selectedDateStr}T00:00:00`;
      const endOfDay = `${selectedDateStr}T23:59:59`;

      const [salesData, expensesData, paymentsData] = await Promise.all([
        // Get sales for the selected date
        db
          .from('sales')
          .select('total_amount, payment_status, payment_method')
          .eq('tenant_id', tenant.tenantId)
          .gte('sale_date', startOfDay)
          .lte('sale_date', endOfDay),
        
        // Get expenses for the selected date
        db
          .from('expenses')
          .select('amount')
          .eq('tenant_id', tenant.tenantId)
          .eq('expense_date', selectedDateStr),
        
        // Get customer credit payments for the selected date
        db
          .from('customer_payments')
          .select('amount, notes')
          .eq('tenant_id', tenant.tenantId)
          .gte('payment_date', startOfDay)
          .lte('payment_date', endOfDay),
      ]);

      // Calculate totals
      const totalSalesRevenue = salesData.data?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const totalSalesCount = salesData.data?.length || 0;
      
      // Credit sales (payment_status = 'credit' or 'unpaid')
      const creditSales = salesData.data?.filter(s => s.payment_status === 'credit' || s.payment_status === 'unpaid') || [];
      const totalCreditSalesAmount = creditSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
      
      // Cash received from sales (excluding credit sales)
      const cashFromSales = totalSalesRevenue - totalCreditSalesAmount;
      
      const totalExpenses = expensesData.data?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
      
      // Credit payments received (customers paying back credit)
      const creditPayments = paymentsData.data || [];
      const totalCreditPayments = creditPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      
      // Net = Cash from sales + Credit payments received - Expenses
      const netAmount = cashFromSales + totalCreditPayments - totalExpenses;

      return {
        totalSalesRevenue,
        totalSalesCount,
        totalExpenses,
        totalCreditPayments,
        creditPayments,
        netAmount,
        cashFromSales,
        totalCreditSalesAmount,
      };
    },
    enabled: !!tenant?.tenantId && !isSchool && !isRental,
  });

  // Weekly summary data
  const { data: weeklyData } = useQuery({
    queryKey: ['weekly-summary', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];

      const results = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = format(date, "yyyy-MM-dd");
        const displayDate = format(date, "EEE, MMM d");

        const startOfDay = `${dateStr}T00:00:00`;
        const endOfDay = `${dateStr}T23:59:59`;

        const [salesRes, expensesRes, paymentsRes] = await Promise.all([
          db
            .from('sales')
            .select('total_amount, payment_status')
            .eq('tenant_id', tenant.tenantId)
            .gte('sale_date', startOfDay)
            .lte('sale_date', endOfDay),
          db
            .from('expenses')
            .select('amount')
            .eq('tenant_id', tenant.tenantId)
            .eq('expense_date', dateStr),
          db
            .from('customer_payments')
            .select('amount')
            .eq('tenant_id', tenant.tenantId)
            .gte('payment_date', startOfDay)
            .lte('payment_date', endOfDay),
        ]);

        const sales = salesRes.data || [];
        const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount), 0);
        const creditSales = sales.filter(s => s.payment_status === 'credit' || s.payment_status === 'unpaid')
          .reduce((sum, s) => sum + Number(s.total_amount), 0);
        const cashFromSales = totalSales - creditSales;
        const expenses = expensesRes.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        const creditPayments = paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        const net = cashFromSales + creditPayments - expenses;

        results.push({
          date: displayDate,
          salesCount: sales.length,
          totalSales,
          expenses,
          creditPayments,
          net,
        });
      }

      return results;
    },
    enabled: !!tenant?.tenantId && !isSchool && !isRental,
  });

  // Recent sales query
  const { data: recentSales } = useQuery({
    queryKey: ['recent-sales', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];

      const { data } = await db
        .from('sales')
        .select(`
          *,
          customers(name)
        `)
        .eq('tenant_id', tenant.tenantId)
        .order('sale_date', { ascending: false })
        .limit(5);

      return data || [];
    },
    enabled: !!tenant?.tenantId && !isSchool && !isRental,
  });

  // If it's a rental business, render the rental-specific dashboard
  if (isRental) {
    return <RentalDashboard />;
  }

  // If it's a school, render the school-specific dashboard (after all hooks)
  if (isSchool) {
    return <SchoolDashboard />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Daily operations summary</p>
        </div>
        <div className="flex items-center gap-2">
          {tenant?.isDevMode && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500">
              <Bug className="h-3 w-3 mr-1" />
              Dev Mode
            </Badge>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Daily Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Sales
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dailyStats?.totalSalesRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dailyStats?.totalSalesCount || 0} transaction(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Expenses
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(dailyStats?.totalExpenses || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Business operating costs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Credit Payments Received
            </CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">
              {formatCurrency(dailyStats?.totalCreditPayments || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dailyStats?.creditPayments?.length || 0} payment(s) from credit customers
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Amount
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              (dailyStats?.netAmount || 0) >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(dailyStats?.netAmount || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cash sales + Credit payments - Expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Cash from Sales</p>
              <p className="font-semibold text-lg">{formatCurrency(dailyStats?.cashFromSales || 0)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Credit Sales (Not received)</p>
              <p className="font-semibold text-lg text-orange-500">{formatCurrency(dailyStats?.totalCreditSalesAmount || 0)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Credit Payments In</p>
              <p className="font-semibold text-lg text-blue-500">{formatCurrency(dailyStats?.totalCreditPayments || 0)}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground">Expenses Out</p>
              <p className="font-semibold text-lg text-destructive">{formatCurrency(dailyStats?.totalExpenses || 0)}</p>
            </div>
          </div>
          
          {/* Credit Payments Details */}
          {dailyStats?.creditPayments && dailyStats.creditPayments.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="font-medium mb-2">Credit Payments Received Today:</p>
              <div className="space-y-2">
                {dailyStats.creditPayments.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between text-sm p-2 bg-blue-500/10 rounded">
                    <span className="text-muted-foreground">{payment.notes || 'Credit payment'}</span>
                    <span className="font-medium text-blue-500">{formatCurrency(payment.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Summary Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Last 7 Days Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Sales</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Expenses</TableHead>
                <TableHead className="text-right">Credit Payments</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {weeklyData?.map((day, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{day.date}</TableCell>
                  <TableCell className="text-right">{day.salesCount}</TableCell>
                  <TableCell className="text-right">{formatCurrency(day.totalSales)}</TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(day.expenses)}</TableCell>
                  <TableCell className="text-right text-blue-500">{formatCurrency(day.creditPayments)}</TableCell>
                  <TableCell className={cn("text-right font-semibold", day.net >= 0 ? "text-success" : "text-destructive")}>
                    {formatCurrency(day.net)}
                  </TableCell>
                </TableRow>
              ))}
              {(!weeklyData || weeklyData.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No data available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent Sales */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sales</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentSales || recentSales.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No sales yet</p>
          ) : (
            <div className="space-y-4">
              {recentSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{sale.customers?.name || 'Walk-in Customer'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(sale.sale_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success">
                      {formatCurrency(sale.total_amount)}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">{sale.payment_method}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessDashboard;
