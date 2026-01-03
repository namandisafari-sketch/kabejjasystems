import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Banknote, Smartphone } from "lucide-react";
import { OrderItem } from "./OrderCart";
import { OrderType } from "./OrderTypeSelector";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderItems: OrderItem[];
  orderType: OrderType;
  tableNumber?: string;
  onConfirm: (paymentMethod: string, notes: string) => void;
  isProcessing: boolean;
}

const orderTypeLabels = {
  dine_in: 'Dine In',
  takeaway: 'Takeaway',
  counter: 'Counter',
};

export function PaymentDialog({ 
  open, 
  onOpenChange, 
  orderItems, 
  orderType,
  tableNumber,
  onConfirm, 
  isProcessing 
}: PaymentDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

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

  const handleConfirm = () => {
    onConfirm(paymentMethod, notes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Order</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Order info */}
          <div className="flex items-center gap-2">
            <Badge variant="outline">{orderTypeLabels[orderType]}</Badge>
            {tableNumber && <Badge variant="secondary">Table {tableNumber}</Badge>}
          </div>

          {/* Order summary */}
          <div className="bg-muted p-3 rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">Order Summary</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {orderItems.map((item) => (
                <div key={item.item.id} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.item.name}</span>
                  <span>{formatCurrency(item.item.unit_price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={paymentMethod === "cash" ? "default" : "outline"}
                className="flex flex-col h-auto py-3"
                onClick={() => setPaymentMethod("cash")}
              >
                <Banknote className="h-5 w-5 mb-1" />
                <span className="text-xs">Cash</span>
              </Button>
              <Button
                type="button"
                variant={paymentMethod === "card" ? "default" : "outline"}
                className="flex flex-col h-auto py-3"
                onClick={() => setPaymentMethod("card")}
              >
                <CreditCard className="h-5 w-5 mb-1" />
                <span className="text-xs">Card</span>
              </Button>
              <Button
                type="button"
                variant={paymentMethod === "mobile" ? "default" : "outline"}
                className="flex flex-col h-auto py-3"
                onClick={() => setPaymentMethod("mobile")}
              >
                <Smartphone className="h-5 w-5 mb-1" />
                <span className="text-xs">Mobile</span>
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Order Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Special instructions, allergies, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? "Processing..." : `Pay ${formatCurrency(total)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
