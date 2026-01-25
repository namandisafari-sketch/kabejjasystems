// File: src/pages/business/BusinessDashboard.tsx
// MOBILE-FIRST RESPONSIVE DESIGN

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ShoppingCart, TrendingDown, TrendingUp, CreditCard, Calendar, Bug } from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { isSchoolBusiness } from "@/config/businessTypes";
import SchoolDashboard from "@/components/dashboard/SchoolDashboard";
import RentalDashboard from "./rental/RentalDashboard";
import { ScrollArea } from "@/components/ui/scroll-area";

// Uganda timezone offset (UTC+3)
const getUgandaDate = (date?: Date) => {
  const d = date || new Date();
  const ugandaOffset = 3 * 60;
  const localOffset = d.getTimezoneOffset();
  const ugandaTime = new Date(d.getTime() + (localOffset + ugandaOffset) * 60000);
  return ugandaTime;
};

const formatUgandaDate = (date: Date) => {
  return format(date, "yyyy-MM-dd");
};

const BusinessDashboard = () => {
  const { data: tenant } = useTenant();
  const isMobile = useIsMobile();
  const [selectedDate, setSelectedDate] = useState<Date>(getUgandaDate());

  const isSchool = tenant?.businessType && isSchoolBusiness(tenant.businessType);
  const isRental = tenant?.businessType === 'rental_management';
  const selectedDateStr = formatUgandaDate(selectedDate);

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

  // Daily stats query
  const { data: dailyStats, isLoading } = useQuery({
    queryKey: ['daily-dashboard-stats', tenant?.tenantId, selectedDateStr],
    queryFn: async () => {
      if (!tenant?.tenantId) return null;

      const startOfDay = `${selectedDateStr}T00:00:00`;
      const endOfDay = `${selectedDateStr}T23:59:59`;

      const [salesData, expensesData, paymentsData] = await Promise.all([
        supabase
          .from('sales')
          .select('total_amount, payment_status, payment_method')
          .eq('tenant_id', tenant.tenantId)
          .gte('sale_date', startOfDay)
          .lte('sale_date', endOfDay),
        supabase
          .from('expenses')
          .select('amount')
          .eq('tenant_id', tenant.tenantId)
          .eq('expense_date', selectedDateStr),
        supabase
          .from('customer_payments')
          .select('amount, notes')
          .eq('tenant_id', tenant.tenantId)
          .gte('payment_date', startOfDay)
          .lte('payment_date', endOfDay),
      ]);

      const totalSalesRevenue = salesData.data?.reduce((sum, sale) => sum + Number(sale.total_amount), 0) || 0;
      const totalSalesCount = salesData.data?.length || 0;
      const creditSales = salesData.data?.filter(s => s.payment_status === 'credit' || s.payment_status === 'unpaid') || [];
      const totalCreditSalesAmount = creditSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
      const cashFromSales = totalSalesRevenue - totalCreditSalesAmount;
      const totalExpenses = expensesData.data?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0;
      const creditPayments = paymentsData.data || [];
      const totalCreditPayments = creditPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);
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
        const displayDate = format(date, "EEE");

        const startOfDay = `${dateStr}T00:00:00`;
        const endOfDay = `${dateStr}T23:59:59`;

        const [salesRes, expensesRes, paymentsRes] = await Promise.all([
          supabase
            .from('sales')
            .select('total_amount, payment_status')
            .eq('tenant_id', tenant.tenantId)
            .gte('sale_date', startOfDay)
            .lte('sale_date', endOfDay),
          supabase
            .from('expenses')
            .select('amount')
            .eq('tenant_id', tenant.tenantId)
            .eq('expense_date', dateStr),
          supabase
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

      const { data } = await supabase
        .from('sales')
        .select(`*, customers(name)`)
        .eq('tenant_id', tenant.tenantId)
        .order('sale_date', { ascending: false })
        .limit(5);

      return data || [];
    },
    enabled: !!tenant?.tenantId && !isSchool && !isRental,
  });

  if (isRental) {
    return <RentalDashboard />;
  }

  if (isSchool) {
    return <SchoolDashboard />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-xs text-muted-foreground">Daily summary</p>
          </div>
          <div className="flex items-center gap-2">
            {tenant?.isDevMode && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500">
                <Bug className="h-3 w-3 mr-1" />
                Dev
              </Badge>
            )}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Calendar className="h-4 w-4 mr-1" />
                  {isMobile ? format(selectedDate, "dd/MM") : format(selectedDate, "MMM d")}
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
      </header>

      {/* MAIN CONTENT */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* KEY METRICS */}
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Sales</p>
                    <p className="text-xl font-bold">{formatCompact(dailyStats?.totalSalesRevenue || 0)}</p>
                    <p className="text-xs text-muted-foreground">{dailyStats?.totalSalesCount || 0} orders</p>
                  </div>
                  <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Expenses</p>
                    <p className="text-xl font-bold text-destructive">{formatCompact(dailyStats?.totalExpenses || 0)}</p>
                    <p className="text-xs text-muted-foreground">Today</p>
                  </div>
                  <TrendingDown className="h-6 w-6 text-destructive" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Credit In</p>
                    <p className="text-xl font-bold text-blue-500">{formatCompact(dailyStats?.totalCreditPayments || 0)}</p>
                    <p className="text-xs text-muted-foreground">{dailyStats?.creditPayments?.length || 0} payments</p>
                  </div>
                  <CreditCard className="h-6 w-6 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card className={(dailyStats?.netAmount || 0) >= 0 ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5"}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Net</p>
                    <p className={cn(
                      "text-xl font-bold",
                      (dailyStats?.netAmount || 0) >= 0 ? "text-green-600" : "text-destructive"
                    )}>
                      {formatCompact(dailyStats?.netAmount || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Cash flow</p>
                  </div>
                  <TrendingUp className={cn(
                    "h-6 w-6",
                    (dailyStats?.netAmount || 0) >= 0 ? "text-green-600" : "text-destructive"
                  )} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* DAILY BREAKDOWN */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Cash Sales</p>
                  <p className="font-semibold">{formatCompact(dailyStats?.cashFromSales || 0)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Credit Sales</p>
                  <p className="font-semibold text-orange-500">{formatCompact(dailyStats?.totalCreditSalesAmount || 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* WEEKLY MINI CHART */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Last 7 Days</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-1 h-20">
                {weeklyData?.map((day, i) => {
                  const maxNet = Math.max(...(weeklyData?.map(d => Math.abs(d.net)) || [1]));
                  const height = Math.max(10, (Math.abs(day.net) / maxNet) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={cn(
                          "w-full rounded-t",
                          day.net >= 0 ? "bg-green-500" : "bg-destructive"
                        )}
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-xs text-muted-foreground">{day.date}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* RECENT SALES */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Sales</CardTitle>
            </CardHeader>
            <CardContent>
              {!recentSales || recentSales.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">No sales yet</p>
              ) : (
                <div className="space-y-3">
                  {recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium text-sm">{sale.customers?.name || 'Walk-in'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sale.sale_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600 text-sm">
                          {formatCompact(sale.total_amount)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">{sale.payment_method}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};

export default BusinessDashboard;
