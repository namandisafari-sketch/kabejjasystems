import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DollarSign, Clock, AlertTriangle, TrendingUp, Banknote, Smartphone, Wallet,
  Users, Package, Percent, CalendarIcon, Pill, ShoppingCart, ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", minimumFractionDigits: 0 }).format(amount);

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color?: string }) => (
  <Card className="rounded-xl border-border p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
        <Icon className={cn("h-4 w-4", color || "text-primary")} />
      </div>
    </div>
    <p className="text-2xl font-bold">{value}</p>
  </Card>
);

const statusColor = (s: string) => {
  switch (s) {
    case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "paid": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "partial": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
};

const PharmacyDashboard = ({ tenantId }: { tenantId: string }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [stats, setStats] = useState<any>(null);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [topDebtors, setTopDebtors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchDashboard = async () => {
      setLoading(true);
      const day = new Date(selectedDate);
      const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0).toISOString();
      const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59).toISOString();
      const startOfMonth = new Date(day.getFullYear(), day.getMonth(), 1).toISOString();

      const [salesRes, productsRes, recentSalesRes, customersRes, pendingRxRes] = await Promise.all([
        supabase.from("sales").select("total_amount, payment_method, sale_date, payment_status").eq("tenant_id", tenantId),
        supabase.from("products").select("name, stock_quantity, min_stock_level, unit_price, cost_price, expiry_date").eq("tenant_id", tenantId).eq("is_active", true),
        supabase.from("sales").select("id, total_amount, payment_status, sale_date, sale_items(quantity), customers!sales_customer_id_fkey(name)")
          .eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(5),
        supabase.from("customers").select("name, phone, current_balance").eq("tenant_id", tenantId).gt("current_balance", 0).order("current_balance", { ascending: false }).limit(5),
        supabase.from("prescriptions").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "pending"),
      ]);

      const allSales = salesRes.data || [];
      const daySales = allSales.filter(s => { const d = s.sale_date; return d && d >= startOfDay && d <= endOfDay; });
      const monthSales = allSales.filter(s => { const d = s.sale_date; return d && d >= startOfMonth && d <= endOfDay; });
      const products = productsRes.data || [];

      const dayRevenue = daySales.reduce((sum, s) => sum + Number(s.total_amount), 0);
      const cashRevenue = daySales.filter(s => s.payment_method === "cash").reduce((sum, s) => sum + Number(s.total_amount), 0);
      const momoRevenue = daySales.filter(s => s.payment_method === "mobile_money").reduce((sum, s) => sum + Number(s.total_amount), 0);
      const creditRevenue = daySales.filter(s => s.payment_method === "credit").reduce((sum, s) => sum + Number(s.total_amount), 0);
      const monthRevenue = monthSales.reduce((sum, s) => sum + Number(s.total_amount), 0);

      const lowStock = products.filter(p => p.min_stock_level && Number(p.stock_quantity) <= Number(p.min_stock_level));
      const inventoryValue = products.reduce((sum, p) => sum + (Number(p.unit_price) || 0) * (Number(p.stock_quantity) || 0), 0);
      const inventoryCost = products.reduce((sum, p) => sum + (Number(p.cost_price) || 0) * (Number(p.stock_quantity) || 0), 0);
      const profitMargin = inventoryValue > 0 ? ((inventoryValue - inventoryCost) / inventoryValue) * 100 : 0;

      const now = new Date();
      const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const expiringValue = products.reduce((sum, p) => {
        if (!p.expiry_date) return sum;
        const exp = new Date(p.expiry_date);
        if (exp >= now && exp <= thirtyDays) return sum + (Number(p.unit_price) || 0) * (Number(p.stock_quantity) || 0);
        return sum;
      }, 0);

      const totalCredit = customersRes.data?.reduce((sum: number, c: any) => sum + Number(c.current_balance), 0) || 0;
      const creditCustomers = customersRes.data?.length || 0;

      setStats({
        dayRevenue, cashRevenue, momoRevenue, creditRevenue, monthRevenue,
        pendingRx: pendingRxRes.count || 0,
        lowStock: lowStock.length,
        outstandingCredit: totalCredit,
        creditCustomers,
        inventoryValue, inventoryCost, profitMargin: profitMargin.toFixed(1),
        expiringValue,
        totalProducts: products.length,
      });
      setLowStockItems(lowStock.slice(0, 5));
      setRecentSales(recentSalesRes.data || []);
      setTopDebtors(customersRes.data || []);
      setLoading(false);
    };
    fetchDashboard();
  }, [selectedDate, tenantId]);

  if (!tenantId) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, {format(new Date(), "MMMM do, yyyy")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} initialFocus className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())}>Today</Button>
        </div>
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 13 }).map((_, i) => <Skeleton key={i} className="h-[110px] rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard label="Day's Sales" value={`UGX ${(stats?.dayRevenue || 0).toLocaleString()}`} icon={DollarSign} color="text-primary" />
          <StatCard label="Cash Received" value={`UGX ${(stats?.cashRevenue || 0).toLocaleString()}`} icon={Banknote} color="text-primary" />
          <StatCard label="Mobile Money" value={`UGX ${(stats?.momoRevenue || 0).toLocaleString()}`} icon={Smartphone} color="text-primary" />
          <StatCard label="Credit Sales (Day)" value={`UGX ${(stats?.creditRevenue || 0).toLocaleString()}`} icon={Wallet} color="text-destructive" />
          <StatCard label="Monthly Revenue" value={`UGX ${(stats?.monthRevenue || 0).toLocaleString()}`} icon={TrendingUp} color="text-primary" />
          <StatCard label="Pending Prescriptions" value={stats?.pendingRx || 0} icon={Clock} color="text-amber-500" />
          <StatCard label="Low Stock Items" value={stats?.lowStock || 0} icon={AlertTriangle} color="text-destructive" />
          <StatCard label="Outstanding Credit" value={`UGX ${(stats?.outstandingCredit || 0).toLocaleString()}`} icon={Wallet} color="text-destructive" />
          <StatCard label="Credit Customers" value={stats?.creditCustomers || 0} icon={Users} color="text-amber-500" />
          <StatCard label="Inventory Value" value={`UGX ${(stats?.inventoryValue || 0).toLocaleString()}`} icon={Package} color="text-primary" />
          <StatCard label="Inventory Cost" value={`UGX ${(stats?.inventoryCost || 0).toLocaleString()}`} icon={Banknote} color="text-muted-foreground" />
          <StatCard label="Profit Margin" value={`${stats?.profitMargin || 0}%`} icon={Percent} color="text-primary" />
          <StatCard label="Expiring Stock (30d)" value={`UGX ${(stats?.expiringValue || 0).toLocaleString()}`} icon={AlertTriangle} color="text-amber-500" />
        </div>
      )}

      {/* Recent Orders + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">Recent Orders</h3>
            <Link to="/business/sales" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4"><Skeleton className="h-10 w-full" /></div>
              ))
            ) : recentSales.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground text-center">No orders yet</p>
            ) : recentSales.map((sale: any) => (
              <div key={sale.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{sale.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {sale.customers?.name || "Walk-in"} · {(sale.sale_items || []).reduce((a: number, i: any) => a + (i.quantity || 0), 0)} items
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", statusColor(sale.payment_status))}>{sale.payment_status}</span>
                  <span className="text-sm font-semibold">UGX {Number(sale.total_amount).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Low Stock */}
          <div className="bg-card rounded-xl border border-border">
            <div className="p-5 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Low Stock
              </h3>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-8 w-full" /></div>)
              ) : lowStockItems.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground text-center">All stocked up!</p>
              ) : lowStockItems.map((item: any, i: number) => (
                <div key={i} className="p-4">
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs font-medium text-destructive mt-1">{item.stock_quantity} units left</p>
                </div>
              ))}
            </div>
          </div>

          {/* Top Debtors */}
          <div className="bg-card rounded-xl border border-border">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Wallet className="h-4 w-4 text-destructive" /> Top Debtors
              </h3>
              <Link to="/business/customers" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            <div className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => <div key={i} className="p-4"><Skeleton className="h-8 w-full" /></div>)
              ) : topDebtors.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground text-center">No outstanding credits</p>
              ) : topDebtors.map((d: any) => (
                <div key={d.name} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.phone || "—"}</p>
                  </div>
                  <span className="text-sm font-bold text-destructive">UGX {Number(d.current_balance).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: "New Prescription", icon: Pill, path: "/business/prescriptions" },
          { label: "Point of Sale", icon: ShoppingCart, path: "/business/pos" },
          { label: "Inventory", icon: Package, path: "/business/inventory" },
          { label: "Stock Alerts", icon: AlertTriangle, path: "/business/stock-alerts" },
          { label: "Patients", icon: Users, path: "/business/patients" },
          { label: "Sales", icon: TrendingUp, path: "/business/sales" },
        ].map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto py-4 flex-col gap-2 rounded-xl border-border"
            onClick={() => navigate(action.path)}
          >
            <action.icon className="h-5 w-5 text-primary" />
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default PharmacyDashboard;
