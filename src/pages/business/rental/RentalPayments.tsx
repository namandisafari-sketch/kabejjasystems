import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Wallet, TrendingUp, Calendar, Receipt, Printer } from "lucide-react";
import { format, addMonths } from "date-fns";
import RentalPaymentReceipt from "@/components/rental/RentalPaymentReceipt";

export default function RentalPayments() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    lease_id: '',
    amount: '',
    payment_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: '',
    payment_method: 'cash',
    payment_type: 'rent',
    months_covered: 1,
    period_start: format(new Date(), 'yyyy-MM-dd'),
    reference_number: '',
    notes: '',
  });

  // Fetch tenant info for receipts
  const { data: tenantInfo } = useQuery({
    queryKey: ['tenant-info', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('name, address, phone, email, logo_url')
        .eq('id', tenantId!)
        .single();
      if (error) throw error;
      return data;
    }
  });

  const { data: leases = [] } = useQuery({
    queryKey: ['leases-active', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leases')
        .select('*, rental_units(unit_number, rental_properties(name)), rental_tenants(id, full_name)')
        .eq('tenant_id', tenantId!)
        .eq('status', 'active');
      if (error) throw error;
      return data;
    }
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['rental-payments', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_payments')
        .select('*, leases(lease_number, rental_units(unit_number, rental_properties(name)), rental_tenants(full_name))')
        .eq('tenant_id', tenantId!)
        .order('payment_date', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const lease = leases.find(l => l.id === data.lease_id);
      if (!lease) throw new Error('Lease not found');

      // Calculate period end based on months covered
      const periodStart = new Date(data.period_start);
      const periodEnd = addMonths(periodStart, data.months_covered);
      periodEnd.setDate(periodEnd.getDate() - 1);

      const { data: inserted, error } = await supabase.from('rental_payments').insert({
        tenant_id: tenantId,
        lease_id: data.lease_id,
        rental_tenant_id: (lease.rental_tenants as any)?.id,
        amount: parseFloat(data.amount),
        payment_date: data.payment_date,
        due_date: data.due_date || data.payment_date,
        payment_method: data.payment_method,
        payment_type: data.payment_type,
        months_covered: data.months_covered,
        period_start: data.period_start,
        period_end: format(periodEnd, 'yyyy-MM-dd'),
        reference_number: data.reference_number || null,
        notes: data.notes || null,
        status: 'completed',
      }).select('*, leases(lease_number, rental_units(unit_number, rental_properties(name)), rental_tenants(full_name))').single();
      if (error) throw error;
      return inserted;
    },
    onSuccess: (newPayment) => {
      queryClient.invalidateQueries({ queryKey: ['rental-payments'] });
      setOpen(false);
      resetForm();
      toast({ title: "Payment recorded successfully" });
      // Open receipt dialog for printing
      setSelectedPayment(newPayment);
      setReceiptOpen(true);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const resetForm = () => {
    setFormData({
      lease_id: '',
      amount: '',
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: '',
      payment_method: 'cash',
      payment_type: 'rent',
      months_covered: 1,
      period_start: format(new Date(), 'yyyy-MM-dd'),
      reference_number: '',
      notes: '',
    });
  };

  const handleLeaseChange = (leaseId: string) => {
    const lease = leases.find(l => l.id === leaseId);
    if (lease) {
      setFormData({
        ...formData,
        lease_id: leaseId,
        amount: lease.monthly_rent?.toString() || '',
        months_covered: 1,
      });
    }
  };

  const handleMonthsChange = (months: number) => {
    const lease = leases.find(l => l.id === formData.lease_id);
    const monthlyRent = parseFloat(lease?.monthly_rent?.toString() || '0');
    setFormData({
      ...formData,
      months_covered: months,
      amount: (monthlyRent * months).toString(),
    });
  };

  const handlePrintReceipt = (payment: any) => {
    setSelectedPayment(payment);
    setReceiptOpen(true);
  };

  const printReceipt = () => {
    if (receiptRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Rent Receipt</title>
              <style>
                body { margin: 0; padding: 0; font-family: monospace; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>${receiptRef.current.innerHTML}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const getPaymentTypeBadge = (type: string) => {
    switch (type) {
      case 'rent':
        return <Badge className="bg-blue-500">Rent</Badge>;
      case 'deposit':
        return <Badge className="bg-purple-500">Deposit</Badge>;
      case 'late_fee':
        return <Badge variant="destructive">Late Fee</Badge>;
      case 'utility':
        return <Badge variant="secondary">Utility</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Calculate summary stats
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const monthlyPayments = payments.filter(p => {
    const pDate = new Date(p.payment_date);
    return pDate.getMonth() === thisMonth && pDate.getFullYear() === thisYear;
  });
  const monthlyTotal = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const rentPayments = monthlyPayments.filter(p => p.payment_type === 'rent');
  const rentTotal = rentPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Track and record rental payments</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Lease / Tenant</Label>
                  <Select value={formData.lease_id} onValueChange={handleLeaseChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select lease" />
                    </SelectTrigger>
                    <SelectContent>
                      {leases.map(l => (
                        <SelectItem key={l.id} value={l.id}>
                          {(l.rental_tenants as any)?.full_name} - {(l.rental_units as any)?.unit_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount (UGX)</Label>
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Payment Type</Label>
                  <Select value={formData.payment_type} onValueChange={v => setFormData({ ...formData, payment_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent">Rent</SelectItem>
                      <SelectItem value="deposit">Deposit</SelectItem>
                      <SelectItem value="late_fee">Late Fee</SelectItem>
                      <SelectItem value="utility">Utility</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.payment_type === 'rent' && (
                  <div>
                    <Label>Months Covered</Label>
                    <Select 
                      value={formData.months_covered.toString()} 
                      onValueChange={v => handleMonthsChange(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 Month</SelectItem>
                        <SelectItem value="2">2 Months</SelectItem>
                        <SelectItem value="3">3 Months</SelectItem>
                        <SelectItem value="4">4 Months</SelectItem>
                        <SelectItem value="6">6 Months</SelectItem>
                        <SelectItem value="12">12 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.payment_type === 'rent' && (
                  <div>
                    <Label>Period Start</Label>
                    <Input
                      type="date"
                      value={formData.period_start}
                      onChange={e => setFormData({ ...formData, period_start: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <Label>Payment Date</Label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={e => setFormData({ ...formData, payment_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select value={formData.payment_method} onValueChange={v => setFormData({ ...formData, payment_method: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Reference Number</Label>
                  <Input
                    value={formData.reference_number}
                    onChange={e => setFormData({ ...formData, reference_number: e.target.value })}
                    placeholder="Transaction ID / Mobile Money Ref"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  Record Payment
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {monthlyTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{monthlyPayments.length} payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rent Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">UGX {rentTotal.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{rentPayments.length} rent payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leases.length}</div>
            <p className="text-xs text-muted-foreground">tenants to collect from</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map(payment => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono text-xs">{payment.receipt_number}</TableCell>
                  <TableCell>{format(new Date(payment.payment_date), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="font-medium">
                    {(payment.leases as any)?.rental_tenants?.full_name}
                  </TableCell>
                  <TableCell>{(payment.leases as any)?.rental_units?.unit_number}</TableCell>
                  <TableCell>{getPaymentTypeBadge(payment.payment_type)}</TableCell>
                  <TableCell className="text-right font-medium">
                    UGX {Number(payment.amount).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handlePrintReceipt(payment)}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No payments recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Receipt Preview Dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Rent Receipt
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-center bg-muted p-4 rounded-lg">
            {selectedPayment && tenantInfo && (
              <RentalPaymentReceipt
                ref={receiptRef}
                payment={{
                  receipt_number: selectedPayment.receipt_number || 'N/A',
                  payment_date: selectedPayment.payment_date,
                  amount: Number(selectedPayment.amount),
                  payment_type: selectedPayment.payment_type,
                  payment_method: selectedPayment.payment_method,
                  months_covered: selectedPayment.months_covered,
                  period_start: selectedPayment.period_start,
                  period_end: selectedPayment.period_end,
                  reference_number: selectedPayment.reference_number,
                  notes: selectedPayment.notes,
                  tenant_name: (selectedPayment.leases as any)?.rental_tenants?.full_name || '',
                  unit_number: (selectedPayment.leases as any)?.rental_units?.unit_number || '',
                  property_name: (selectedPayment.leases as any)?.rental_units?.rental_properties?.name || '',
                }}
                business={{
                  name: tenantInfo.name || '',
                  address: tenantInfo.address,
                  phone: tenantInfo.phone,
                  email: tenantInfo.email,
                  logo_url: tenantInfo.logo_url,
                }}
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReceiptOpen(false)}>
              Close
            </Button>
            <Button onClick={printReceipt}>
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}