import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Printer, CheckCircle, UtensilsCrossed, ShoppingBag, Store } from "lucide-react";
import { OrderItem } from "./OrderCart";
import { OrderType } from "./OrderTypeSelector";

interface KitchenTicketProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: number;
  orderItems: OrderItem[];
  orderType: OrderType;
  tableNumber?: string;
  paymentMethod: string;
  onNewOrder: () => void;
}

const orderTypeLabels = {
  dine_in: 'DINE IN',
  takeaway: 'TAKEAWAY',
  counter: 'COUNTER',
};

export function KitchenTicket({ 
  open, 
  onOpenChange, 
  orderNumber,
  orderItems, 
  orderType, 
  tableNumber,
  paymentMethod,
  onNewOrder 
}: KitchenTicketProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const total = orderItems.reduce(
    (sum, item) => sum + item.item.unit_price * item.quantity,
    0
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Order Placed!
          </DialogTitle>
        </DialogHeader>
        
        <div className="bg-muted p-4 rounded-lg font-mono text-sm" id="kitchen-ticket">
          {/* Header */}
          <div className="text-center mb-3">
            <div className="text-2xl font-bold">#{orderNumber}</div>
            <Badge variant="secondary" className="text-xs">
              {orderTypeLabels[orderType]}
              {tableNumber && ` • TABLE ${tableNumber}`}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date().toLocaleString()}
            </p>
          </div>
          
          <Separator className="my-2" />
          
          {/* Items */}
          <div className="space-y-2">
            {orderItems.map((orderItem) => (
              <div key={orderItem.item.id} className="flex justify-between">
                <div className="flex gap-2">
                  <span className="font-bold">{orderItem.quantity}x</span>
                  <span>{orderItem.item.name}</span>
                </div>
                <span>{formatCurrency(orderItem.item.unit_price * orderItem.quantity)}</span>
              </div>
            ))}
          </div>
          
          <Separator className="my-2" />
          
          {/* Total */}
          <div className="flex justify-between font-bold text-lg">
            <span>TOTAL</span>
            <span>{formatCurrency(total)}</span>
          </div>
          
          <div className="flex justify-between text-muted-foreground mt-1 text-xs">
            <span>Payment</span>
            <span className="uppercase">{paymentMethod}</span>
          </div>
          
          <Separator className="my-2" />
          
          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground mt-3">
            <p className="font-bold">Thank you!</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handlePrint} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={onNewOrder} className="flex-1">
            New Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
