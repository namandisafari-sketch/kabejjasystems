import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStudentSession } from "@/pages/StudentLogin";
import { CreditCard, Download, Receipt } from "lucide-react";
import { format } from "date-fns";

export default function StudentFees() {
  const session = getStudentSession()!;

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
        .select("amount, payment_date, payment_method, receipt_number, reference_number, notes, created_at")
        .eq("student_id", session.studentId)
        .order("payment_date", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

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
                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
    </div>
  );
}
