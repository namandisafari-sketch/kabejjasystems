import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/hooks/use-database";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Package, Search, TrendingDown, RefreshCw, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const StockAlerts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isRestockDialogOpen, setIsRestockDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [restockQuantity, setRestockQuantity] = useState("");

  const { data: profile } = useQuery({
    queryKey: ['user-profile-stock'],
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

  // Fetch all products with stock info
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products-stock', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .order('stock_quantity', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  // Filter for low stock products (at or below min_stock_level)
  const lowStockProducts = products.filter(p => 
    p.min_stock_level !== null && 
    p.min_stock_level > 0 && 
    p.stock_quantity <= p.min_stock_level
  );

  // Out of stock products
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0);

  // Products needing attention (either out of stock or below reorder level)
  const alertProducts = products.filter(p => 
    p.stock_quantity === 0 || 
    (p.min_stock_level !== null && p.min_stock_level > 0 && p.stock_quantity <= p.min_stock_level)
  );

  const filteredAlertProducts = alertProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const restockMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error("Product not found");

      const { error } = await supabase
        .from('products')
        .update({ stock_quantity: product.stock_quantity + quantity })
        .eq('id', productId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-stock'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsRestockDialogOpen(false);
      setSelectedProduct(null);
      setRestockQuantity("");
      toast({
        title: "Stock Updated",
        description: "Product stock has been restocked successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRestock = (product: any) => {
    setSelectedProduct(product);
    // Suggest quantity to bring stock to double the min level
    const suggestedQty = product.min_stock_level ? 
      Math.max(product.min_stock_level * 2 - product.stock_quantity, 1) : 10;
    setRestockQuantity(suggestedQty.toString());
    setIsRestockDialogOpen(true);
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !restockQuantity) return;
    restockMutation.mutate({ 
      productId: selectedProduct.id, 
      quantity: parseInt(restockQuantity) 
    });
  };

  const getStockStatus = (product: any) => {
    if (product.stock_quantity === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (product.min_stock_level && product.stock_quantity <= product.min_stock_level) {
      return { label: "Low Stock", variant: "secondary" as const };
    }
    return { label: "In Stock", variant: "default" as const };
  };

  const getStockPercentage = (product: any) => {
    if (!product.min_stock_level || product.min_stock_level === 0) return 100;
    const optimalLevel = product.min_stock_level * 3; // Consider 3x min level as optimal
    return Math.min((product.stock_quantity / optimalLevel) * 100, 100);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Stock Alerts</h1>
        <p className="text-muted-foreground">Monitor inventory levels and restock products</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className={outOfStockProducts.length > 0 ? "border-destructive" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <Package className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{outOfStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">products need immediate restocking</p>
          </CardContent>
        </Card>

        <Card className={lowStockProducts.length > 0 ? "border-yellow-500" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">products below reorder level</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">active products in inventory</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Products Needing Attention
              </CardTitle>
              <CardDescription>
                {alertProducts.length} products require restocking
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => queryClient.invalidateQueries({ queryKey: ['products-stock'] })}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading inventory...</p>
          ) : alertProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <p className="text-lg font-medium text-green-600">All stock levels are healthy!</p>
              <p className="text-sm text-muted-foreground mt-1">
                No products are currently below their reorder level
              </p>
            </div>
          ) : filteredAlertProducts.length === 0 ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No matching products found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlertProducts.map((product) => {
                    const status = getStockStatus(product);
                    const percentage = getStockPercentage(product);
                    const shortage = product.min_stock_level ? 
                      Math.max(product.min_stock_level - product.stock_quantity, 0) : 0;

                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.category && (
                              <p className="text-xs text-muted-foreground">{product.category}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {product.sku || '-'}
                        </TableCell>
                        <TableCell>
                          <span className={product.stock_quantity === 0 ? "text-destructive font-bold" : "font-medium"}>
                            {product.stock_quantity}
                          </span>
                          {product.unit_of_measure && product.unit_of_measure !== 'piece' && (
                            <span className="text-xs text-muted-foreground ml-1">
                              {product.unit_of_measure}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {product.min_stock_level || '-'}
                        </TableCell>
                        <TableCell className="w-32">
                          <div className="space-y-1">
                            <Progress 
                              value={percentage} 
                              className={`h-2 ${percentage < 33 ? '[&>div]:bg-destructive' : percentage < 66 ? '[&>div]:bg-yellow-500' : ''}`}
                            />
                            {shortage > 0 && (
                              <p className="text-xs text-destructive">
                                Need {shortage} more
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleRestock(product)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Restock
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Restock Dialog */}
      <Dialog open={isRestockDialogOpen} onOpenChange={setIsRestockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock Product</DialogTitle>
            <DialogDescription>
              Add stock quantity for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRestockSubmit} className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Current Stock:</span>
                <span className="font-medium">{selectedProduct?.stock_quantity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reorder Level:</span>
                <span className="font-medium">{selectedProduct?.min_stock_level || 'Not set'}</span>
              </div>
              {selectedProduct?.cost_price && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cost Price:</span>
                  <span className="font-medium">{formatCurrency(selectedProduct.cost_price)}</span>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="quantity">Quantity to Add *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={restockQuantity}
                onChange={(e) => setRestockQuantity(e.target.value)}
                placeholder="Enter quantity"
                required
              />
              {selectedProduct?.cost_price && restockQuantity && (
                <p className="text-sm text-muted-foreground mt-1">
                  Estimated cost: {formatCurrency(selectedProduct.cost_price * parseInt(restockQuantity || '0'))}
                </p>
              )}
            </div>

            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">New Stock Level: </span>
                {(selectedProduct?.stock_quantity || 0) + parseInt(restockQuantity || '0')}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRestockDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={restockMutation.isPending}>
                {restockMutation.isPending ? "Updating..." : "Update Stock"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockAlerts;
