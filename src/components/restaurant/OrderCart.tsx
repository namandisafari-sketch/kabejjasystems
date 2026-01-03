import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2, UtensilsCrossed, ShoppingBag, Store } from "lucide-react";
import { OrderType } from "./OrderTypeSelector";

interface MenuItem {
  id: string;
  name: string;
  unit_price: number;
  stock_quantity: number | null;
}

export interface OrderItem {
  item: MenuItem;
  quantity: number;
  notes?: string;
}

interface OrderCartProps {
  items: OrderItem[];
  orderType: OrderType;
  tableNumber?: string;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onCheckout: () => void;
  isProcessing: boolean;
}

const orderTypeIcons = {
  dine_in: UtensilsCrossed,
  takeaway: ShoppingBag,
  counter: Store,
};

const orderTypeLabels = {
  dine_in: 'Dine In',
  takeaway: 'Takeaway',
  counter: 'Counter',
};

export function OrderCart({ 
  items, 
  orderType, 
  tableNumber,
  onUpdateQuantity, 
  onRemoveItem, 
  onCheckout, 
  isProcessing 
}: OrderCartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.item.unit_price * item.quantity,
    0
  );
  const total = subtotal;

  const Icon = orderTypeIcons[orderType];

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5" />
            Current Order
          </CardTitle>
          <Badge variant="outline">
            {orderTypeLabels[orderType]}
            {tableNumber && ` • Table ${tableNumber}`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UtensilsCrossed className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No items yet</p>
            <p className="text-sm">Tap menu items to add</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((orderItem) => (
              <div key={orderItem.item.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{orderItem.item.name}</p>
                  <p className="text-sm text-primary font-semibold">
                    {formatCurrency(orderItem.item.unit_price * orderItem.quantity)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onUpdateQuantity(orderItem.item.id, orderItem.quantity - 1)}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-medium">{orderItem.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onUpdateQuantity(orderItem.item.id, orderItem.quantity + 1)}
                    disabled={orderItem.quantity >= (orderItem.item.stock_quantity ?? 999)}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => onRemoveItem(orderItem.item.id)}
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
              <span>Subtotal ({items.reduce((sum, i) => sum + i.quantity, 0)} items)</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
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
            disabled={isProcessing || items.length === 0}
          >
            {isProcessing ? "Processing..." : `Place Order • ${formatCurrency(total)}`}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
