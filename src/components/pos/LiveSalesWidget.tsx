import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, ShoppingCart, Clock } from "lucide-react";
import { format } from "date-fns";

interface LiveSalesWidgetProps {
  tenantId: string;
}

export function LiveSalesWidget({ tenantId }: LiveSalesWidgetProps) {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const { data: todaySales } = useQuery({
    queryKey: ["today-sales", tenantId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("sales")
        .select("total_amount, payment_status, created_at")
        .eq("tenant_id", tenantId)
        .gte("created_at", `${today}T00:00:00`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: bestSellers } = useQuery({
    queryKey: ["best-sellers", tenantId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("sale_items")
        .select(`
          quantity,
          product_id,
          products (name),
          sales!inner (tenant_id, created_at)
        `)
        .eq("sales.tenant_id", tenantId)
        .gte("sales.created_at", `${today}T00:00:00`);

      if (error) throw error;

      // Aggregate by product
      const productMap = new Map<string, { name: string; quantity: number }>();
      data?.forEach((item: any) => {
        const productId = item.product_id;
        const existing = productMap.get(productId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          productMap.set(productId, {
            name: item.products?.name || "Unknown",
            quantity: item.quantity,
          });
        }
      });

      return Array.from(productMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
    },
    enabled: !!tenantId,
  });

  // Subscribe to realtime sales updates
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel("live-sales")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sales",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          setLastUpdate(new Date());
          queryClient.invalidateQueries({ queryKey: ["today-sales", tenantId] });
          queryClient.invalidateQueries({ queryKey: ["best-sellers", tenantId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, queryClient]);

  const totalRevenue = todaySales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
  const totalTransactions = todaySales?.length || 0;
  const paidTransactions = todaySales?.filter((s) => s.payment_status === "paid").length || 0;
  const recentSales = todaySales?.slice(0, 3) || [];

  return (
    <div className="space-y-3">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today's Revenue</p>
                <p className="font-bold text-green-600">
                  {totalRevenue.toLocaleString()} UGX
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="font-bold text-blue-600">
                  {paidTransactions}/{totalTransactions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best Sellers */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-orange-500" />
            Best Sellers Today
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {bestSellers?.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No sales yet today</p>
          ) : (
            <div className="space-y-1">
              {bestSellers?.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2">
                    <Badge
                      variant={index === 0 ? "default" : "secondary"}
                      className="h-5 w-5 p-0 justify-center text-xs"
                    >
                      {index + 1}
                    </Badge>
                    <span className="truncate max-w-[120px]">{product.name}</span>
                  </span>
                  <span className="text-muted-foreground">{product.quantity}×</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Sales */}
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent Sales
            </span>
            <Badge variant="outline" className="text-xs font-normal">
              Live
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {recentSales.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No sales yet today</p>
          ) : (
            <div className="space-y-2">
              {recentSales.map((sale, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded"
                >
                  <span className="font-medium">{sale.total_amount.toLocaleString()} UGX</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(sale.created_at), "h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Last updated: {format(lastUpdate, "h:mm:ss a")}
      </p>
    </div>
  );
}
