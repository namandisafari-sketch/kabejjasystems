import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Banknote, Smartphone, Plus, Trash2, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaymentSplit {
  id: string;
  method: string;
  amount: number;
  reference?: string;
}

interface SplitPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalAmount: number;
  onConfirm: (payments: PaymentSplit[]) => void;
  isProcessing: boolean;
}

export function SplitPaymentDialog({
  open,
  onOpenChange,
  totalAmount,
  onConfirm,
  isProcessing,
}: SplitPaymentDialogProps) {
  const [payments, setPayments] = useState<PaymentSplit[]>([
    { id: crypto.randomUUID(), method: "cash", amount: 0 },
  ]);

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining = totalAmount - totalPaid;

  const addPayment = () => {
    setPayments([
      ...payments,
      { id: crypto.randomUUID(), method: "cash", amount: remaining > 0 ? remaining : 0 },
    ]);
  };

  const removePayment = (id: string) => {
    if (payments.length > 1) {
      setPayments(payments.filter((p) => p.id !== id));
    }
  };

  const updatePayment = (id: string, field: keyof PaymentSplit, value: string | number) => {
    setPayments(
      payments.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      )
    );
  };

  const handleConfirm = () => {
    if (remaining === 0 && payments.every((p) => p.amount > 0)) {
      onConfirm(payments);
    }
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <Banknote className="h-4 w-4" />;
      case "mobile_money":
      case "mtn_momo":
      case "airtel_money":
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Banknote className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Split Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span className="font-medium">Total Amount</span>
            <span className="text-xl font-bold text-primary">
              {totalAmount.toLocaleString()} UGX
            </span>
          </div>

          <div className="space-y-3">
            {payments.map((payment, index) => (
              <div key={payment.id} className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Payment {index + 1}</Badge>
                  {payments.length > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => removePayment(payment.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Method</Label>
                    <Select
                      value={payment.method}
                      onValueChange={(v) => updatePayment(payment.id, "method", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            Cash
                          </div>
                        </SelectItem>
                        <SelectItem value="mtn_momo">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-yellow-500" />
                            MTN MoMo
                          </div>
                        </SelectItem>
                        <SelectItem value="airtel_money">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-red-500" />
                            Airtel Money
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Amount (UGX)</Label>
                    <Input
                      type="number"
                      value={payment.amount || ""}
                      onChange={(e) =>
                        updatePayment(payment.id, "amount", parseFloat(e.target.value) || 0)
                      }
                      placeholder="0"
                    />
                  </div>
                </div>

                {payment.method !== "cash" && (
                  <div>
                    <Label className="text-xs">Reference Number</Label>
                    <Input
                      value={payment.reference || ""}
                      onChange={(e) => updatePayment(payment.id, "reference", e.target.value)}
                      placeholder="Transaction ID"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full" onClick={addPayment}>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>

          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <span>Remaining</span>
            <span className={`text-lg font-bold ${remaining === 0 ? "text-green-600" : remaining < 0 ? "text-red-600" : "text-orange-600"}`}>
              {remaining.toLocaleString()} UGX
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={remaining !== 0 || isProcessing}
          >
            {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Complete Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
