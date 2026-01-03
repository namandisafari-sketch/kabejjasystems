import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Banknote, Receipt } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";

const paymentSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  payment_method: z.string().min(1, "Payment method is required"),
  reference_number: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

interface CollectPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    id: string;
    name: string;
    current_balance: number;
  } | null;
  tenantId: string;
}

export function CollectPaymentDialog({ open, onOpenChange, customer, tenantId }: CollectPaymentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState<string>("");

  // Fetch credit sales for this customer
  const { data: creditSales = [] } = useQuery({
    queryKey: ['customer-credit-sales', customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      
      const { data, error } = await supabase
        .from('sales')
        .select('id, order_number, total_amount, sale_date, payment_status')
        .eq('customer_id', customer.id)
        .eq('payment_status', 'credit')
        .order('sale_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!customer?.id && open,
  });

  const collectPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!customer) throw new Error("No customer selected");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const parsedAmount = parseFloat(amount);
      
      // Validate
      paymentSchema.parse({
        amount: parsedAmount,
        payment_method: paymentMethod,
        reference_number: referenceNumber || undefined,
        notes: notes || undefined,
      });

      if (parsedAmount > customer.current_balance) {
        throw new Error("Payment amount cannot exceed outstanding balance");
      }

      // Create payment record with optional sale link
      const { error: paymentError } = await supabase
        .from('customer_payments')
        .insert({
          tenant_id: tenantId,
          customer_id: customer.id,
          amount: parsedAmount,
          payment_method: paymentMethod,
          reference_number: referenceNumber || null,
          notes: notes || null,
          received_by: user.id,
          sale_id: selectedSaleId || null,
        });

      if (paymentError) throw paymentError;

      // If linked to a sale, check if it's fully paid and update status
      if (selectedSaleId) {
        const linkedSale = creditSales.find(s => s.id === selectedSaleId);
        if (linkedSale && parsedAmount >= linkedSale.total_amount) {
          // Mark sale as paid
          await supabase
            .from('sales')
            .update({ payment_status: 'paid' })
            .eq('id', selectedSaleId);
        } else if (linkedSale) {
          // Mark as partial if not fully paid
          await supabase
            .from('sales')
            .update({ payment_status: 'partial' })
            .eq('id', selectedSaleId);
        }
      }

      // Update customer balance
      const newBalance = customer.current_balance - parsedAmount;
      const { error: updateError } = await supabase
        .from('customers')
        .update({ current_balance: newBalance })
        .eq('id', customer.id);

      if (updateError) throw updateError;

      return { newBalance };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-payments'] });
      queryClient.invalidateQueries({ queryKey: ['customer-credit-sales'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      toast({
        title: "Payment Collected",
        description: `Payment of ${parseFloat(amount).toLocaleString()} UGX received from ${customer?.name}`,
      });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setAmount("");
    setPaymentMethod("cash");
    setReferenceNumber("");
    setNotes("");
    setSelectedSaleId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    collectPaymentMutation.mutate();
  };

  const handlePayFullBalance = () => {
    if (customer) {
      setAmount(customer.current_balance.toString());
    }
  };

  const handleSelectSale = (saleId: string) => {
    setSelectedSaleId(saleId);
    if (saleId && saleId !== "none") {
      const sale = creditSales.find(s => s.id === saleId);
      if (sale) {
        setAmount(sale.total_amount.toString());
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Collect Payment
          </DialogTitle>
          <DialogDescription>
            Collect payment from {customer?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Outstanding Balance</p>
            <p className="text-2xl font-bold text-destructive">
              {(customer?.current_balance || 0).toLocaleString()} UGX
            </p>
          </div>

          {/* Credit Sales Selector */}
          {creditSales.length > 0 && (
            <div>
              <Label htmlFor="linkedSale" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Link to Credit Sale (Optional)
              </Label>
              <Select value={selectedSaleId} onValueChange={handleSelectSale}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a credit sale to link..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific sale</SelectItem>
                  {creditSales.map((sale) => (
                    <SelectItem key={sale.id} value={sale.id}>
                      Order #{sale.order_number} - {sale.total_amount.toLocaleString()} UGX 
                      ({format(new Date(sale.sale_date), 'MMM d, yyyy')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Linking helps track which sale this payment is for
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="amount">Amount to Collect *</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                max={customer?.current_balance || 0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                required
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handlePayFullBalance}>
                Pay Full
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="paymentMethod">Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="mobile_money">Mobile Money</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="referenceNumber">Reference Number</Label>
            <Input
              id="referenceNumber"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Transaction ID, receipt number, etc."
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes"
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={collectPaymentMutation.isPending || !amount}>
              {collectPaymentMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Collect {amount ? `${parseFloat(amount).toLocaleString()} UGX` : 'Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
