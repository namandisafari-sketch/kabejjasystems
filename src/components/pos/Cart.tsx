import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
  isProcessing: boolean;
}

export function Cart({ items, onUpdateQuantity, onRemoveItem, onCheckout, isProcessing }: CartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.unit_price * item.quantity,
    0
  );
  const tax = 0; // Can be configured
  const total = subtotal + tax;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Cart ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Cart is empty</p>
            <p className="text-sm">Add products to start a sale</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.product.id} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.product.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(item.product.unit_price)} each
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => onUpdateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                    className="w-12 h-7 text-center p-1"
                    min={1}
                    max={item.product.stock_quantity ?? 999}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                    disabled={item.quantity >= (item.product.stock_quantity ?? 999)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => onRemoveItem(item.product.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {items.length > 0 && (
        <CardFooter className="flex-col border-t pt-4">
          <div className="w-full space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Tax</span>
                <span>{formatCurrency(tax)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>
          <Button 
            className="w-full mt-4" 
            size="lg"
            onClick={onCheckout}
            disabled={isProcessing}
          >
            {isProcessing ? "Processing..." : `Checkout ${formatCurrency(total)}`}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
