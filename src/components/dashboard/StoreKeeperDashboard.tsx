import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/hooks/use-tenant";
import { Link } from "react-router-dom";
import {
  Package, PackageMinus, Truck, ClipboardList,
  AlertTriangle, ShoppingCart, TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const StoreKeeperDashboard = () => {
  const { data: tenant } = useTenant();

  const { data: lowStockCount = 0 } = useQuery({
    queryKey: ['store-low-stock', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return 0;
      const { count } = await supabase
        .from('inventory')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.tenantId)
        .lte('quantity', 10);
      return count || 0;
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: pendingPOs = 0 } = useQuery({
    queryKey: ['store-pending-pos', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return 0;
      const { count } = await supabase
        .from('purchase_orders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.tenantId)
        .eq('status', 'pending');
      return count || 0;
    },
    enabled: !!tenant?.tenantId,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Store Dashboard</h1>
        <p className="text-muted-foreground">Inventory & procurement management</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Low Stock Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Items below threshold</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
            <ClipboardList className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingPOs}</div>
            <p className="text-xs text-muted-foreground">Awaiting fulfillment</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/business/inventory">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Package className="h-5 w-5" />
                <span className="text-xs">Inventory</span>
              </Button>
            </Link>
            <Link to="/business/purchase-orders">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <ShoppingCart className="h-5 w-5" />
                <span className="text-xs">Purchase Orders</span>
              </Button>
            </Link>
            <Link to="/business/suppliers">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Truck className="h-5 w-5" />
                <span className="text-xs">Suppliers</span>
              </Button>
            </Link>
            <Link to="/business/stock-alerts">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-xs">Stock Alerts</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StoreKeeperDashboard;
