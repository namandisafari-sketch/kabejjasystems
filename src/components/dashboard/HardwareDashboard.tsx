import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DollarSign, Clock, AlertTriangle, TrendingUp, Banknote, Smartphone, Wallet,
  Users, Package, Percent, CalendarIcon, Hammer, ShoppingCart, ArrowRight,
  TrendingDown, BarChart3, Eye, PlusCircle, Wrench, CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", minimumFractionDigits: 0 }).format(amount);

const StatCard = ({ label, value, icon: Icon, color, trend, onClick }: { 
  label: string; 
  value: string | number; 
  icon: any; 
  color?: string;
  trend?: { value: number; isPositive: boolean };
  onClick?: () => void;
}) => (
  <Card className="rounded-xl border-border p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center">
        <Icon className={cn("h-4 w-4", color || "text-primary")} />
      </div>
    </div>
    <p className="text-2xl font-bold">{value}</p>
    {trend && (
      <div className="flex items-center gap-1 mt-2">
        {trend.isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-600" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-600" />
        )}
        <span className={cn("text-xs font-medium", trend.isPositive ? "text-green-600" : "text-red-600")}>
          {Math.abs(trend.value)}%
        </span>
      </div>
    )}
  </Card>
);

const AlertCard = ({ title, count, icon: Icon, color, onClick }: any) => (
  <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={onClick}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground mb-1">{title}</p>
        <p className="text-2xl font-bold">{count}</p>
      </div>
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", color)}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  </Card>
);

const HardwareDashboard = ({ tenantId }: { tenantId: string }) => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [stats, setStats] = useState<any>(null);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const fetchDashboard = async () => {
      setLoading(true);
      const day = new Date(selectedDate);
      const startOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0).toISOString();
      const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59).toISOString();
      const startOfMonth = new Date(day.getFullYear(), day.getMonth(), 1).toISOString();

      try {
        const [salesRes, productsRes, recentSalesRes, customersRes] = await Promise.all([
          supabase.from("sales").select("id, total_amount, payment_method, sale_date, payment_status, sale_items!sales_id_fkey(product_id, quantity, unit_price)")
            .eq("tenant_id", tenantId),
          supabase.from("products").select("id, name, stock_quantity, min_stock_level, unit_price, cost_price, category")
            .eq("tenant_id", tenantId).eq("is_active", true),
          supabase.from("sales").select("id, total_amount, payment_status, sale_date, payment_method, customers!sales_customer_id_fkey(name)")
            .eq("tenant_id", tenantId).order("sale_date", { ascending: false }).limit(8),
          supabase.from("customers").select("name, phone, current_balance").eq("tenant_id", tenantId).gt("current_balance", 0).order("current_balance", { ascending: false }).limit(5),
        ]);

        const allSales = salesRes.data || [];
        const daySales = allSales.filter(s => { const d = s.sale_date; return d && d >= startOfDay && d <= endOfDay; });
        const monthSales = allSales.filter(s => { const d = s.sale_date; return d && d >= startOfMonth && d <= endOfDay; });
        const products = productsRes.data || [];

        // Calculate revenue by payment method
        const dayRevenue = daySales.reduce((sum, s) => sum + Number(s.total_amount), 0);
        const cashRevenue = daySales.filter(s => s.payment_method === "cash").reduce((sum, s) => sum + Number(s.total_amount), 0);
        const momoRevenue = daySales.filter(s => s.payment_method === "mobile_money").reduce((sum, s) => sum + Number(s.total_amount), 0);
        const cardRevenue = daySales.filter(s => s.payment_method === "card").reduce((sum, s) => sum + Number(s.total_amount), 0);
        const creditRevenue = daySales.filter(s => s.payment_method === "credit").reduce((sum, s) => sum + Number(s.total_amount), 0);
        const monthRevenue = monthSales.reduce((sum, s) => sum + Number(s.total_amount), 0);

        // Calculate cost of goods sold and profit
        const dayCost = daySales.reduce((sum, s) => {
          return sum + (s.sale_items?.reduce((itemSum: number, item: any) => 
            itemSum + ((item.unit_price || 0) * item.quantity), 0) || 0);
        }, 0);
        const dayProfit = dayRevenue - dayCost;
        const dayMargin = dayRevenue > 0 ? ((dayProfit / dayRevenue) * 100).toFixed(1) : 0;

        // Low stock items
        const lowStock = products.filter(p => p.min_stock_level && Number(p.stock_quantity) <= Number(p.min_stock_level));
        
        // Stock value (inventory at selling price)
        const inventoryValue = products.reduce((sum, p) => sum + (Number(p.unit_price) || 0) * (Number(p.stock_quantity) || 0), 0);
        const inventoryCost = products.reduce((sum, p) => sum + (Number(p.cost_price) || 0) * (Number(p.stock_quantity) || 0), 0);
        const stockProfit = inventoryValue - inventoryCost;
        const stockMargin = inventoryValue > 0 ? ((stockProfit / inventoryValue) * 100).toFixed(1) : 0;

        // Top products by quantity sold today
        const productMap = new Map<string, any>();
        daySales.forEach(sale => {
          sale.sale_items?.forEach((item: any) => {
            if (!productMap.has(item.product_id)) {
              const prod = products.find(p => p.id === item.product_id);
              productMap.set(item.product_id, { ...prod, quantity: 0, revenue: 0 });
            }
            const entry = productMap.get(item.product_id);
            entry.quantity += item.quantity;
            entry.revenue += (item.unit_price || 0) * item.quantity;
          });
        });
        const topProductList = Array.from(productMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);

        // Payment method breakdown
        const paymentData = [];
        if (cashRevenue > 0) paymentData.push({ name: "Cash", value: cashRevenue, fill: "#10b981" });
        if (momoRevenue > 0) paymentData.push({ name: "Mobile Money", value: momoRevenue, fill: "#f59e0b" });
        if (cardRevenue > 0) paymentData.push({ name: "Card", value: cardRevenue, fill: "#3b82f6" });
        if (creditRevenue > 0) paymentData.push({ name: "Credit", value: creditRevenue, fill: "#ef4444" });

        const totalCredit = customersRes.data?.reduce((sum: number, c: any) => sum + Number(c.current_balance), 0) || 0;

        setStats({
          dayRevenue, cashRevenue, momoRevenue, cardRevenue, creditRevenue, monthRevenue,
          dayProfit, dayMargin,
          lowStock: lowStock.length,
          outstandingCredit: totalCredit,
          creditCustomers: customersRes.data?.length || 0,
          inventoryValue, inventoryCost, stockMargin,
          salesCount: daySales.length,
          transactionCount: daySales.length,
        });
        setLowStockItems(lowStock.slice(0, 5));
        setRecentSales(recentSalesRes.data || []);
        setTopProducts(topProductList);
        setPaymentBreakdown(paymentData);
        setLoading(false);
      } catch (err) {
        console.error("Dashboard error:", err);
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [selectedDate, tenantId]);

  if (!tenantId) return null;

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Date Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Hammer className="h-8 w-8 text-orange-600" />
            Hardware Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back, {format(selectedDate, "MMMM d, yyyy")}</p>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Button variant="outline" size="sm" className="w-full justify-center gap-2" onClick={() => navigate("/business/pos")}>
          <ShoppingCart className="h-4 w-4" /> New Sale
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-center gap-2" onClick={() => navigate("/business/inventory")}>
          <Package className="h-4 w-4" /> Inventory
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-center gap-2" onClick={() => navigate("/business/suppliers")}>
          <Wrench className="h-4 w-4" /> Suppliers
        </Button>
        <Button variant="outline" size="sm" className="w-full justify-center gap-2" onClick={() => navigate("/business/reports")}>
          <BarChart3 className="h-4 w-4" /> Reports
        </Button>
      </div>

      {/* KPI Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[110px] rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Row 1: Revenue & Profit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              label="Today's Sales" 
              value={formatCurrency(stats?.dayRevenue || 0)} 
              icon={DollarSign} 
              color="text-green-600"
              onClick={() => navigate("/business/pos")}
            />
            <StatCard 
              label="Profit (Today)" 
              value={formatCurrency(stats?.dayProfit || 0)} 
              icon={TrendingUp} 
              color="text-blue-600"
            />
            <StatCard 
              label="Profit Margin" 
              value={`${stats?.dayMargin || 0}%`} 
              icon={Percent} 
              color="text-purple-600"
            />
            <StatCard 
              label="Transactions" 
              value={stats?.transactionCount || 0} 
              icon={ShoppingCart} 
              color="text-orange-600"
            />
          </div>

          {/* Row 2: Payment Methods & Cash */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              label="Cash Received" 
              value={formatCurrency(stats?.cashRevenue || 0)} 
              icon={Banknote} 
              color="text-green-600"
            />
            <StatCard 
              label="Mobile Money" 
              value={formatCurrency(stats?.momoRevenue || 0)} 
              icon={Smartphone} 
              color="text-yellow-600"
            />
            <StatCard 
              label="Card" 
              value={formatCurrency(stats?.cardRevenue || 0)} 
              icon={CreditCard} 
              color="text-blue-600"
            />
            <StatCard 
              label="Credit Sales" 
              value={formatCurrency(stats?.creditRevenue || 0)} 
              icon={Wallet} 
              color="text-red-600"
            />
          </div>

          {/* Row 3: Inventory & Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              label="Stock Value" 
              value={formatCurrency(stats?.inventoryValue || 0)} 
              icon={Package} 
              color="text-indigo-600"
              onClick={() => navigate("/business/inventory")}
            />
            <StatCard 
              label="Stock Cost" 
              value={formatCurrency(stats?.inventoryCost || 0)} 
              icon={AlertTriangle} 
              color="text-orange-600"
            />
            <StatCard 
              label="Stock Margin" 
              value={`${stats?.stockMargin || 0}%`} 
              icon={Percent} 
              color="text-purple-600"
            />
            <StatCard 
              label="Outstanding Credit" 
              value={formatCurrency(stats?.outstandingCredit || 0)} 
              icon={Users} 
              color="text-red-600"
              onClick={() => navigate("/business/customers")}
            />
          </div>

          {/* Alerts Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <AlertCard 
              title="Low Stock Items" 
              count={stats?.lowStock || 0}
              icon={AlertTriangle}
              color="bg-red-100 dark:bg-red-900/30"
              onClick={() => navigate("/business/inventory")}
            />
            <AlertCard 
              title="Credit Customers" 
              count={stats?.creditCustomers || 0}
              icon={Users}
              color="bg-orange-100 dark:bg-orange-900/30"
              onClick={() => navigate("/business/customers")}
            />
            <AlertCard 
              title="Month's Sales" 
              count={`${(stats?.monthRevenue || 0).toLocaleString()}`}
              icon={TrendingUp}
              color="bg-green-100 dark:bg-green-900/30"
            />
            <AlertCard 
              title="Top Customers" 
              count="5"
              icon={Users}
              color="bg-blue-100 dark:bg-blue-900/30"
              onClick={() => navigate("/business/customers")}
            />
          </div>

          {/* Charts & Details Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Payment Breakdown Pie Chart */}
            {paymentBreakdown.length > 0 && (
              <Card className="rounded-xl border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Payment Methods Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={paymentBreakdown}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {paymentBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Top Products */}
            <Card className="rounded-xl border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Top Products Today</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px] w-full pr-4">
                  <div className="space-y-3">
                    {topProducts.length > 0 ? (
                      topProducts.map((product, idx) => (
                        <div key={idx} className="flex items-center justify-between pb-2 border-b last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground">{product.quantity} units</p>
                          </div>
                          <p className="font-semibold text-sm ml-2">{formatCurrency(product.revenue)}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No sales today</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Low Stock & Recent Sales Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Low Stock Items */}
            <Card className="rounded-xl border-border">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Low Stock Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px] w-full pr-4">
                  <div className="space-y-3">
                    {lowStockItems.length > 0 ? (
                      lowStockItems.map((item, idx) => (
                        <div key={idx} className="pb-3 border-b last:border-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm">{item.name}</p>
                            <Badge variant="destructive" className="text-xs">Low</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">Stock: {item.stock_quantity} (Min: {item.min_stock_level})</p>
                          <p className="text-xs font-medium mt-1">{formatCurrency(item.unit_price)}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">All items well stocked!</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recent Sales */}
            <Card className="rounded-xl border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[250px] w-full pr-4">
                  <div className="space-y-3">
                    {recentSales.length > 0 ? (
                      recentSales.map((sale, idx) => (
                        <div key={idx} className="flex items-center justify-between pb-3 border-b last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{sale.customers?.name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(sale.sale_date), "HH:mm")}</p>
                          </div>
                          <div className="text-right ml-2">
                            <p className="font-semibold text-sm">{formatCurrency(sale.total_amount)}</p>
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                            >
                              {sale.payment_method}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No transactions today</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default HardwareDashboard;
