import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Pill, HeartPulse, AlertTriangle, Clock, CheckCircle,
  TrendingUp, TrendingDown, ShoppingCart, Plus, FileText,
  Calendar, Package, FlaskConical
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { format } from "date-fns";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency', currency: 'UGX', minimumFractionDigits: 0,
  }).format(amount);
};

const PharmacyDashboard = ({ tenantId }: { tenantId: string }) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { data: stats } = useQuery({
    queryKey: ['pharmacy-dashboard-stats', tenantId],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");

      const [rxRes, dispensedRes, productsRes, salesRes, pendingUploadsRes] = await Promise.all([
        supabase.from('prescriptions').select('id, status', { count: 'exact' }).eq('tenant_id', tenantId).eq('status', 'pending'),
        supabase.from('prescriptions').select('id, status, prescription_items(total_price)', { count: 'exact' })
          .eq('tenant_id', tenantId).eq('status', 'dispensed').gte('dispensed_at', `${today}T00:00:00`).lte('dispensed_at', `${today}T23:59:59`),
        supabase.from('products').select('id, name, stock_quantity, min_stock_level, expiry_date, cost_price, unit_price')
          .eq('tenant_id', tenantId).eq('is_active', true),
        supabase.from('sales').select('total_amount').eq('tenant_id', tenantId)
          .gte('sale_date', `${today}T00:00:00`).lte('sale_date', `${today}T23:59:59`),
        supabase.from('prescription_uploads').select('id', { count: 'exact' }).eq('tenant_id', tenantId).eq('status', 'pending'),
      ]);

      const products = productsRes.data || [];
      const now = new Date();
      const lowStock = products.filter(p => p.min_stock_level && p.stock_quantity <= p.min_stock_level);
      const expired = products.filter(p => p.expiry_date && new Date(p.expiry_date) < now);
      const expiringSoon = products.filter(p => {
        if (!p.expiry_date) return false;
        const days = Math.ceil((new Date(p.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return days >= 0 && days <= 30;
      });

      const todaySales = salesRes.data?.reduce((s, r) => s + Number(r.total_amount), 0) || 0;
      const todayDispensedValue = dispensedRes.data?.reduce((s, r: any) => {
        const items = r.prescription_items || [];
        return s + items.reduce((si: number, i: any) => si + (Number(i.total_price) || 0), 0);
      }, 0) || 0;

      return {
        pendingRx: rxRes.count || 0,
        dispensedToday: dispensedRes.count || 0,
        todayDispensedValue,
        lowStock: lowStock.length,
        expired: expired.length,
        expiringSoon: expiringSoon.length,
        todaySales,
        totalProducts: products.length,
        pendingUploads: pendingUploadsRes.count || 0,
        lowStockItems: lowStock.slice(0, 5),
        expiringItems: expiringSoon.slice(0, 5),
      };
    },
    enabled: !!tenantId,
  });

  const { data: recentPrescriptions } = useQuery({
    queryKey: ['pharmacy-recent-rx', tenantId],
    queryFn: async () => {
      const { data } = await supabase.from('prescriptions')
        .select('*, patients(full_name, phone), prescription_items(*)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!tenantId,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Pharmacy Dashboard</h1>
            <p className="text-xs text-muted-foreground">Today's overview & alerts</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => navigate('/business/prescriptions')}>
              <Plus className="h-4 w-4 mr-1" />New RX
            </Button>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Quick Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/business/prescriptions')}>
              <Pill className="h-5 w-5" />
              <span className="text-xs">Prescriptions</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/business/patients')}>
              <HeartPulse className="h-5 w-5" />
              <span className="text-xs">Patients</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/business/inventory')}>
              <Package className="h-5 w-5" />
              <span className="text-xs">Inventory</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/business/stock-alerts')}>
              <AlertTriangle className="h-5 w-5" />
              <span className="text-xs">Alerts</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/business/sales')}>
              <ShoppingCart className="h-5 w-5" />
              <span className="text-xs">Sales</span>
            </Button>
            <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => navigate('/business/pos')}>
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs">POS</span>
            </Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className={stats?.pendingRx ? "border-amber-300" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Pending RX</p>
                    <p className="text-2xl font-bold text-amber-600">{stats?.pendingRx || 0}</p>
                  </div>
                  <Clock className="h-6 w-6 text-amber-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Dispensed Today</p>
                    <p className="text-2xl font-bold text-green-600">{stats?.dispensedToday || 0}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(stats?.todayDispensedValue || 0)}</p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card className={stats?.lowStock ? "border-red-300" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Low Stock</p>
                    <p className="text-2xl font-bold text-destructive">{stats?.lowStock || 0}</p>
                  </div>
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
              </CardContent>
            </Card>
            <Card className={stats?.expiringSoon ? "border-amber-300" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Expiring (&le;30d)</p>
                    <p className="text-2xl font-bold text-amber-600">{stats?.expiringSoon || 0}</p>
                  </div>
                  <FlaskConical className="h-6 w-6 text-amber-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Today Sales</p>
                  <p className="font-bold">{formatCurrency(stats?.todaySales || 0)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Products</p>
                  <p className="font-bold">{stats?.totalProducts || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Pending Uploads</p>
                  <p className="font-bold">{stats?.pendingUploads || 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card className={stats?.expired ? "border-destructive/50" : ""}>
              <CardContent className="p-3 flex items-center gap-3">
                <TrendingDown className={`h-5 w-5 ${stats?.expired ? "text-destructive" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-xs text-muted-foreground">Expired Items</p>
                  <p className={`font-bold ${stats?.expired ? "text-destructive" : ""}`}>{stats?.expired || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Alerts Section */}
            <div className="space-y-3">
              {/* Low Stock Alerts */}
              {stats?.lowStockItems?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      Low Stock Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stats.lowStockItems.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                        <span className="font-medium truncate flex-1">{item.name}</span>
                        <Badge variant="destructive" className="ml-2 shrink-0">{item.stock_quantity}/{item.min_stock_level}</Badge>
                      </div>
                    ))}
                    <Button variant="link" size="sm" className="w-full" onClick={() => navigate('/business/stock-alerts')}>
                      View All Alerts
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Expiry Alerts */}
              {stats?.expiringItems?.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-500" />
                      Expiring Soon
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {stats.expiringItems.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                        <span className="font-medium truncate flex-1">{item.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {item.expiry_date ? format(new Date(item.expiry_date), "MMM d") : "-"}
                        </span>
                      </div>
                    ))}
                    <Button variant="link" size="sm" className="w-full" onClick={() => navigate('/business/inventory')}>
                      View Inventory
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Recent Prescriptions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    Recent Prescriptions
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/business/prescriptions')}>
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!recentPrescriptions?.length ? (
                  <div className="text-center py-6">
                    <Pill className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No prescriptions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentPrescriptions.map((rx: any) => (
                      <div key={rx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{rx.patients?.full_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            {rx.prescription_number}
                            {rx.doctor_name ? ` — Dr. ${rx.doctor_name}` : ""}
                          </p>
                        </div>
                        <Badge variant={rx.status === 'pending' ? 'secondary' : rx.status === 'dispensed' ? 'default' : 'destructive'} className="ml-2 shrink-0 text-xs">
                          {rx.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default PharmacyDashboard;
