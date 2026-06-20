import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getStudentSession } from "@/pages/StudentLogin";
import { CreditCard, Download, Receipt, Printer } from "lucide-react";
import { format } from "date-fns";
import { FeeReceiptThermal } from "@/components/fees/FeeReceiptThermal";

export default function StudentFees() {
  const session = getStudentSession()!;
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  const { data: feeRecord } = useQuery({
    queryKey: ["student-fee-record", session.studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("student_fees")
        .select("id, total_amount, amount_paid, balance, status, due_date, academic_terms(name)")
        .eq("student_id", session.studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as any;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["student-fee-payments", session.studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("fee_payments")
        .select("id, amount, payment_date, payment_method, receipt_number, reference_number, notes, created_at")
        .eq("student_id", session.studentId)
        .order("payment_date", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: tenant } = useQuery({
    queryKey: ["student-tenant-receipt", session.tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenants")
        .select("name, phone, email, address, logo_url")
        .eq("id", session.tenantId)
        .single();
      return data;
    },
  });

  const { data: receiptSettings } = useQuery({
    queryKey: ["student-receipt-settings", session.tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("receipt_settings")
        .select("*")
        .eq("tenant_id", session.tenantId)
        .maybeSingle();
      return data;
    },
  });

  const handlePrintReceipt = (payment: any) => {
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    const receiptEl = document.getElementById("receipt-content");
    if (!receiptEl) return;
    printWin.document.write(`
      <!DOCTYPE html><html><head><title>Receipt ${payment.receipt_number}</title>
      <style>body { font-family: 'Inter', sans-serif; display: flex; justify-content: center; padding: 20px; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>${receiptEl.innerHTML}</body></html>
    `);
    printWin.document.close();
    setTimeout(() => { printWin.print(); printWin.close(); }, 500);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" /> Fees & Receipts
        </h1>
        <p className="text-muted-foreground">View your fee statements and payment receipts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Due</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {feeRecord ? new Intl.NumberFormat().format(feeRecord.total_amount) : "—"}
            </p>
            {feeRecord?.academic_terms?.name && (
              <p className="text-xs text-muted-foreground">{feeRecord.academic_terms.name}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {feeRecord ? new Intl.NumberFormat().format(feeRecord.amount_paid) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${(feeRecord?.balance || 0) > 0 ? "text-red-500" : "text-green-600"}`}>
              {feeRecord ? new Intl.NumberFormat().format(feeRecord.balance || 0) : "—"}
            </p>
            {feeRecord && (
              <Badge variant={feeRecord.balance > 0 ? "destructive" : "default"} className="mt-1">
                {feeRecord.balance > 0 ? "Outstanding" : "Cleared"}
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" /> Payment History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Receipt #</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments?.length ? (
                payments.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>{p.payment_date ? format(new Date(p.payment_date), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{p.receipt_number || "—"}</TableCell>
                    <TableCell className="font-medium">{new Intl.NumberFormat().format(p.amount)}</TableCell>
                    <TableCell className="capitalize">{p.payment_method || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.reference_number || "—"}</TableCell>
                    <TableCell>
                      {p.receipt_number && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedPayment(p)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No payment records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedPayment} onOpenChange={(o) => { if (!o) setSelectedPayment(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          <div id="receipt-content">
            {selectedPayment && tenant && (
              <FeeReceiptThermal
                receipt_number={selectedPayment.receipt_number}
                student={{
                  full_name: session.fullName,
                  admission_number: session.admissionNumber,
                  class_name: session.className,
                }}
                amount={selectedPayment.amount}
                payment_method={selectedPayment.payment_method}
                reference_number={selectedPayment.reference_number}
                date={new Date(selectedPayment.payment_date || selectedPayment.created_at)}
                previous_balance={(feeRecord?.total_amount || 0) - (feeRecord?.amount_paid || 0) + selectedPayment.amount}
                new_balance={(feeRecord?.balance || 0)}
                tenant={{
                  name: tenant.name,
                  phone: tenant.phone || undefined,
                  email: tenant.email || undefined,
                  address: tenant.address || undefined,
                  logo_url: tenant.logo_url || undefined,
                }}
                term={feeRecord?.academic_terms ? { name: feeRecord.academic_terms.name, year: new Date().getFullYear() } : undefined}
                settings={receiptSettings || undefined}
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedPayment(null)}>Close</Button>
            <Button onClick={() => handlePrintReceipt(selectedPayment)}>
              <Printer className="h-4 w-4 mr-2" /> Print
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
