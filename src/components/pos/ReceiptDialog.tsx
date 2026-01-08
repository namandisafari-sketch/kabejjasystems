import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer, Download, CheckCircle } from "lucide-react";
import { CartItem } from "./Cart";

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  cartItems: CartItem[];
  paymentMethod: string;
  onNewSale: () => void;
}

export function ReceiptDialog({ open, onOpenChange, saleId, cartItems, paymentMethod, onNewSale }: ReceiptDialogProps) {
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            Sale Complete!
          </DialogTitle>
        </DialogHeader>
        
        <div className="bg-muted p-4 rounded-lg font-mono text-sm" id="receipt">
          <div className="text-center mb-4">
            <h3 className="font-bold text-lg">RECEIPT</h3>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              Sale ID: {saleId.slice(0, 8)}
            </p>
          </div>
          
          <Separator className="my-2" />
          
          <div className="space-y-1">
            {cartItems.map((item) => (
              <div key={item.product.id} className="flex justify-between">
                <div>
                  <span>{item.product.name}</span>
                  <span className="text-muted-foreground ml-2">x{item.quantity}</span>
                </div>
                <span>{formatCurrency(item.product.unit_price * item.quantity)}</span>
              </div>
            ))}
          </div>
          
          <Separator className="my-2" />
          
          <div className="flex justify-between font-bold">
            <span>TOTAL</span>
            <span>{formatCurrency(total)}</span>
          </div>
          
          <div className="flex justify-between text-muted-foreground mt-1">
            <span>Payment</span>
            <span className="capitalize">{paymentMethod}</span>
          </div>
          
          <Separator className="my-2" />
          
          <div className="text-center text-xs text-muted-foreground mt-4">
            <p>Thank you for your purchase!</p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handlePrint} className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={onNewSale} className="flex-1">
            New Sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
