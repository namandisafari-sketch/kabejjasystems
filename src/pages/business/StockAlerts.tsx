import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Package, Search, RefreshCw, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";

const StockAlerts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isRestockDrawerOpen, setIsRestockDrawerOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [restockQuantity, setRestockQuantity] = useState("");

  const { data: profile } = useQuery({
    queryKey: ['user-profile-stock'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
      return data;
    },
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-stock', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      const { data, error } = await supabase.from('products').select('*').eq('tenant_id', profile.tenant_id).eq('is_active', true).order('stock_quantity', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const outOfStockProducts = products.filter(p => p.stock_quantity === 0);
  const lowStockProducts = products.filter(p => p.min_stock_level !== null && p.min_stock_level > 0 && p.stock_quantity <= p.min_stock_level && p.stock_quantity > 0);
  const alertProducts = products.filter(p => p.stock_quantity === 0 || (p.min_stock_level !== null && p.min_stock_level > 0 && p.stock_quantity <= p.min_stock_level));
  const filteredAlertProducts = alertProducts.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const restockMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error("Product not found");
      const { error } = await supabase.from('products').update({ stock_quantity: product.stock_quantity + quantity }).eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-stock'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsRestockDrawerOpen(false);
      setSelectedProduct(null);
      setRestockQuantity("");
      toast({ title: "Stock Updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleRestock = (product: any) => {
    setSelectedProduct(product);
    const suggestedQty = product.min_stock_level ? Math.max(product.min_stock_level * 2 - product.stock_quantity, 1) : 10;
    setRestockQuantity(suggestedQty.toString());
    setIsRestockDrawerOpen(true);
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !restockQuantity) return;
    restockMutation.mutate({ productId: selectedProduct.id, quantity: parseInt(restockQuantity) });
  };

  const getStockStatus = (product: any) => {
    if (product.stock_quantity === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (product.min_stock_level && product.stock_quantity <= product.min_stock_level) return { label: "Low Stock", variant: "secondary" as const };
    return { label: "In Stock", variant: "default" as const };
  };

  const getStockPercentage = (product: any) => {
    if (!product.min_stock_level || product.min_stock_level === 0) return 100;
    const optimalLevel = product.min_stock_level * 3;
    return Math.min((product.stock_quantity / optimalLevel) * 100, 100);
  };

  return (
    <div className="flex flex-col h-full">
      {/* HEADER */}
      <div className="p-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold">Stock Alerts</h1>
            <p className="text-xs text-muted-foreground">{alertProducts.length} need attention</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['products-stock'] })}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-10" />
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-2 p-4">
        <Card className={`p-3 ${outOfStockProducts.length > 0 ? "border-destructive" : ""}`}>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-destructive" />
            <div>
              <p className="text-xs text-muted-foreground">Out</p>
              <p className="text-lg font-bold text-destructive">{outOfStockProducts.length}</p>
            </div>
          </div>
        </Card>
        <Card className={`p-3 ${lowStockProducts.length > 0 ? "border-yellow-500" : ""}`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-xs text-muted-foreground">Low</p>
              <p className="text-lg font-bold text-yellow-600">{lowStockProducts.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{products.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* ALERT LIST */}
      <ScrollArea className="flex-1 px-4 pb-20">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : alertProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-green-500 mb-3" />
            <p className="text-lg font-medium text-green-600">All stock levels healthy!</p>
            <p className="text-sm text-muted-foreground">No products below reorder level</p>
          </div>
        ) : !filteredAlertProducts.length ? (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No matching products</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAlertProducts.map((product) => {
              const status = getStockStatus(product);
              const percentage = getStockPercentage(product);
              return (
                <Card key={product.id} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      {product.category && <p className="text-xs text-muted-foreground">{product.category}</p>}
                    </div>
                    <Badge variant={status.variant} className="text-xs ml-2">{status.label}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1">
                      <Progress value={percentage} className={`h-2 ${percentage < 33 ? '[&>div]:bg-destructive' : percentage < 66 ? '[&>div]:bg-yellow-500' : ''}`} />
                    </div>
                    <span className={`text-sm font-semibold ${product.stock_quantity === 0 ? "text-destructive" : ""}`}>
                      {product.stock_quantity}/{product.min_stock_level || "—"}
                    </span>
                  </div>
                  <Button size="sm" className="w-full" onClick={() => handleRestock(product)}>
                    <Plus className="h-4 w-4 mr-1" /> Restock
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* RESTOCK DRAWER */}
      <Drawer open={isRestockDrawerOpen} onOpenChange={setIsRestockDrawerOpen}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Restock {selectedProduct?.name}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Stock:</span>
                <span className="font-medium">{selectedProduct?.stock_quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reorder Level:</span>
                <span className="font-medium">{selectedProduct?.min_stock_level || 'Not set'}</span>
              </div>
            </div>
            <form id="restock-form" onSubmit={handleRestockSubmit}>
              <Label>Quantity to Add *</Label>
              <Input type="number" min="1" value={restockQuantity} onChange={(e) => setRestockQuantity(e.target.value)} required className="mt-2" />
              <p className="text-sm text-muted-foreground mt-2">
                New Stock: {(selectedProduct?.stock_quantity || 0) + parseInt(restockQuantity || '0')}
              </p>
            </form>
          </div>
          <DrawerFooter className="flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setIsRestockDrawerOpen(false)}>Cancel</Button>
            <Button type="submit" form="restock-form" className="flex-1" disabled={restockMutation.isPending}>
              {restockMutation.isPending ? "Updating..." : "Update Stock"}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default StockAlerts;
