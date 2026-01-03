import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShoppingBag, Heart, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";

interface CustomerHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  tenantId: string;
  onAddFavoriteToCart?: (productId: string) => void;
}

export function CustomerHistoryDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  tenantId,
  onAddFavoriteToCart,
}: CustomerHistoryDialogProps) {
  const { data: purchaseHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ["customer-history", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select(`
          id,
          total_amount,
          payment_method,
          payment_status,
          created_at,
          sale_items (
            quantity,
            unit_price,
            total_price,
            products (name)
          )
        `)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: open && !!customerId,
  });

  const { data: favorites, isLoading: loadingFavorites } = useQuery({
    queryKey: ["customer-favorites", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_favorites")
        .select(`
          id,
          times_purchased,
          products (id, name, unit_price)
        `)
        .eq("customer_id", customerId)
        .order("times_purchased", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: open && !!customerId,
  });

  const totalSpent = purchaseHistory?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
  const totalOrders = purchaseHistory?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {customerName}'s History
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-muted rounded-lg text-center">
            <p className="text-2xl font-bold text-primary">{totalOrders}</p>
            <p className="text-xs text-muted-foreground">Total Orders</p>
          </div>
          <div className="p-3 bg-muted rounded-lg text-center">
            <p className="text-2xl font-bold text-primary">{totalSpent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Spent (UGX)</p>
          </div>
        </div>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Purchase History
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Favorites
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <ScrollArea className="h-64">
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : purchaseHistory?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No purchase history</p>
              ) : (
                <div className="space-y-3">
                  {purchaseHistory?.map((sale) => (
                    <div key={sale.id} className="p-3 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{sale.total_amount.toLocaleString()} UGX</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(sale.created_at), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            {sale.payment_method || "cash"}
                          </Badge>
                          <Badge
                            variant={sale.payment_status === "paid" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {sale.payment_status}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {sale.sale_items?.slice(0, 3).map((item: any, i: number) => (
                          <span key={i}>
                            {item.products?.name} × {item.quantity}
                            {i < Math.min(sale.sale_items.length - 1, 2) && ", "}
                          </span>
                        ))}
                        {sale.sale_items?.length > 3 && ` +${sale.sale_items.length - 3} more`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="favorites">
            <ScrollArea className="h-64">
              {loadingFavorites ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : favorites?.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No favorites yet</p>
              ) : (
                <div className="space-y-2">
                  {favorites?.map((fav: any) => (
                    <div
                      key={fav.id}
                      className="p-3 border rounded-lg flex items-center justify-between hover:bg-muted/50 cursor-pointer"
                      onClick={() => onAddFavoriteToCart?.(fav.products?.id)}
                    >
                      <div>
                        <p className="font-medium">{fav.products?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {fav.products?.unit_price?.toLocaleString()} UGX
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {fav.times_purchased}×
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">purchased</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
