import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CartItem } from "./Cart";
import { CreditCard, Banknote, Smartphone } from "lucide-react";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  onConfirm: (paymentMethod: string, notes: string) => void;
  isProcessing: boolean;
}

export function CheckoutDialog({ open, onOpenChange, cartItems, onConfirm, isProcessing }: CheckoutDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const total = cartItems.reduce(
    (sum, item) => sum + item.product.unit_price * item.quantity,
    0
  );

  const handleConfirm = () => {
    onConfirm(paymentMethod, notes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Sale</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <div className="text-sm text-muted-foreground mb-2">Order Summary</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {cartItems.map((item) => (
                <div key={item.product.id} className="flex justify-between text-sm">
                  <span>{item.product.name} x{item.quantity}</span>
                  <span>{formatCurrency(item.product.unit_price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t mt-2 pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(total)}</span>
            </div>
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any notes for this sale..."
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
