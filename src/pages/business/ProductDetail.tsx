import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Package, AlertTriangle, CheckCircle, Clock, Calendar, DollarSign, Tag, Barcode, Building, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, isBefore } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: sameProducts = [] } = useQuery({
    queryKey: ["same-products", product?.name, product?.tenant_id],
    queryFn: async () => {
      if (!product?.name || !product?.tenant_id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", product.tenant_id)
        .eq("name", product.name)
        .order("expiry_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!product?.name && !!product?.tenant_id,
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", minimumFractionDigits: 0 }).format(amount);

  const getStockBadge = (stock: number, minStock: number | null) => {
    if (stock === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (minStock && stock <= minStock) return <Badge variant="secondary">Low Stock</Badge>;
    return <Badge variant="outline">In Stock</Badge>;
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const days = differenceInDays(new Date(expiryDate), new Date());
    if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, variant: "destructive" as const };
    if (days <= 30) return { label: `${days}d left`, variant: "secondary" as const };
    if (days <= 90) return { label: `${days}d left`, variant: "outline" as const };
    return null;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/4" />
          <div className="h-48 bg-muted rounded" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <p className="text-lg font-medium">Product not found</p>
        <Link to="/business/products"><Button variant="link">Back to Products</Button></Link>
      </div>
    );
  }

  const totalStock = sameProducts.reduce((sum, p) => sum + (p.stock_quantity || 0), 0);
  const totalValue = sameProducts.reduce((sum, p) => sum + ((p.stock_quantity || 0) * (p.cost_price || p.unit_price || 0)), 0);
  const expiredBatches = sameProducts.filter(p => p.expiry_date && isBefore(new Date(p.expiry_date), new Date()));
  const expiringSoon = sameProducts.filter(p => {
    if (!p.expiry_date) return false;
    const days = differenceInDays(new Date(p.expiry_date), new Date());
    return days >= 0 && days <= 30;
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/business/inventory" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" /> Back to Inventory
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold">{product.name}</h1>
              {getStockBadge(product.stock_quantity, product.min_stock_level)}
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {product.sku && <span className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" />SKU: {product.sku}</span>}
              {product.barcode && <span className="flex items-center gap-1"><Barcode className="h-3.5 w-3.5" />{product.barcode}</span>}
              {product.category && <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />{product.category}</span>}
              {product.brand && <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5" />{product.brand}</span>}
            </div>
          </div>

          {product.description && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Description</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">{product.description}</p></CardContent>
            </Card>
          )}

          {/* Batch List */}
          {sameProducts.length > 1 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">All Batches ({sameProducts.length})</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Batch #</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sameProducts.map((p: any) => {
                      const expiryStatus = getExpiryStatus(p.expiry_date);
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">{p.batch_no || "-"}</TableCell>
                          <TableCell>{p.expiry_date ? format(new Date(p.expiry_date), "MMM d, yyyy") : "-"}</TableCell>
                          <TableCell>{p.stock_quantity} {p.unit_of_measure}</TableCell>
                          <TableCell>{formatCurrency(p.unit_price)}</TableCell>
                          <TableCell>
                            {expiryStatus ? (
                              <Badge variant={expiryStatus.variant}>{expiryStatus.label}</Badge>
                            ) : (
                              <Badge variant="outline">Good</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Unit Price</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{formatCurrency(product.unit_price)}</p>
            </CardContent>
          </Card>

          {product.cost_price && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Cost Price</CardTitle></CardHeader>
              <CardContent>
                <p className="text-lg font-bold">{formatCurrency(product.cost_price)}</p>
                <p className="text-xs text-muted-foreground">
                  Margin: {((product.unit_price - product.cost_price) / product.cost_price * 100).toFixed(0)}%
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Stock</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalStock} {product.unit_of_measure}</p>
              <p className="text-xs text-muted-foreground">Across {sameProducts.length} batch(es)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Stock Value</CardTitle></CardHeader>
            <CardContent>
              <p className="text-lg font-bold">{formatCurrency(totalValue)}</p>
            </CardContent>
          </Card>

          {(expiredBatches.length > 0 || expiringSoon.length > 0) && (
            <Card className={expiredBatches.length > 0 ? "border-destructive" : "border-yellow-500"}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-destructive" /> Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {expiredBatches.length > 0 && (
                  <p className="text-destructive">{expiredBatches.length} batch(es) expired</p>
                )}
                {expiringSoon.length > 0 && (
                  <p className="text-amber-600">{expiringSoon.length} batch(es) expiring within 30 days</p>
                )}
              </CardContent>
            </Card>
          )}

          {product.supplier && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Supplier</CardTitle></CardHeader>
              <CardContent><p className="font-medium">{product.supplier}</p></CardContent>
            </Card>
          )}

          <Link to={`/business/products`}>
            <Button variant="outline" className="w-full">
              <Package className="h-4 w-4 mr-2" />Manage Products
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
