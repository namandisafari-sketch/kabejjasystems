import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

interface ProductSearchProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  isLoading: boolean;
}

export function ProductSearch({ products, onAddToCart, isLoading }: ProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = products?.filter(
    (product) =>
      product.is_active &&
      (product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category?.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products by name, SKU, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchTerm ? "No products found" : "No products available"}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                (product.stock_quantity ?? 0) <= 0 ? "opacity-50" : ""
              }`}
              onClick={() => (product.stock_quantity ?? 0) > 0 && onAddToCart(product)}
            >
              <CardContent className="p-3">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm line-clamp-2">{product.name}</h4>
                  {product.sku && (
                    <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                  )}
                  <p className="text-primary font-bold">{formatCurrency(product.unit_price)}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${(product.stock_quantity ?? 0) <= (product.min_stock_level ?? 5) ? "text-destructive" : "text-muted-foreground"}`}>
                      Stock: {product.stock_quantity ?? 0}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      disabled={(product.stock_quantity ?? 0) <= 0}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
