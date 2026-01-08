import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
}

interface LayawayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  cartItems: CartItem[];
  totalAmount: number;
  onConfirm: (data: {
    depositAmount: number;
    installmentCount: number;
    dueDate: Date | undefined;
    notes: string;
  }) => void;
  isProcessing: boolean;
}

export function LayawayDialog({
  open,
  onOpenChange,
  customer,
  cartItems,
  totalAmount,
  onConfirm,
  isProcessing,
}: LayawayDialogProps) {
  const [depositAmount, setDepositAmount] = useState(Math.round(totalAmount * 0.3));
  const [installmentCount, setInstallmentCount] = useState(3);
  const [dueDate, setDueDate] = useState<Date>();
  const [notes, setNotes] = useState("");

  const remainingAfterDeposit = totalAmount - depositAmount;
  const installmentAmount = installmentCount > 0 ? Math.ceil(remainingAfterDeposit / installmentCount) : 0;

  const handleConfirm = () => {
    if (depositAmount >= 0 && installmentCount > 0) {
      onConfirm({
        depositAmount,
        installmentCount,
        dueDate,
        notes,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Layaway Plan</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-medium">{customer.name}</p>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Items ({cartItems.length})</p>
            <div className="space-y-1 mt-1 max-h-24 overflow-y-auto">
              {cartItems.map((item) => (
                <p key={item.id} className="text-sm">
                  {item.name} × {item.quantity} = {(item.price * item.quantity).toLocaleString()} UGX
                </p>
              ))}
            </div>
            <p className="font-bold mt-2 text-primary">
              Total: {totalAmount.toLocaleString()} UGX
            </p>
          </div>

          <div>
            <Label>Deposit Amount (UGX)</Label>
            <Input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
              placeholder="Initial deposit"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Recommended: 30% ({Math.round(totalAmount * 0.3).toLocaleString()} UGX)
            </p>
          </div>

          <div>
            <Label>Number of Installments</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={installmentCount}
              onChange={(e) => setInstallmentCount(parseInt(e.target.value) || 1)}
            />
            {remainingAfterDeposit > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {installmentAmount.toLocaleString()} UGX per installment
              </p>
            )}
          </div>

          <div>
            <Label>Final Due Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dueDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special arrangements..."
              rows={2}
            />
          </div>

          <div className="p-3 border rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Amount</span>
              <span>{totalAmount.toLocaleString()} UGX</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Deposit Today</span>
              <span>-{depositAmount.toLocaleString()} UGX</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Remaining Balance</span>
              <span>{remainingAfterDeposit.toLocaleString()} UGX</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing || depositAmount < 0}>
            {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Layaway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
