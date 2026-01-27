import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, CreditCard, DollarSign, ScanLine, History, Search, Calendar, Receipt, Printer, Eye, Filter, TrendingUp, Users, ShieldAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FeePaymentScanner } from "@/components/fees/FeePaymentScanner";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { FeeReceiptThermal } from "@/components/fees/FeeReceiptThermal";
import { BursarRulesManager } from "@/components/bursar/BursarRulesManager";
import { OverrideRequestsPanel } from "@/components/bursar/OverrideRequestsPanel";
import { format, subDays, startOfDay } from "date-fns";

interface FeeStructure {
  id: string;
  name: string;
  level: string;
  fee_type: string;
  amount: number;
  is_mandatory: boolean;
  is_active: boolean;
}

interface StudentFee {
  id: string;
  student_id: string;
  term_id: string;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  students?: { full_name: string; admission_number: string };
}

const ITEMS_PER_PAGE = 15;

export default function Fees() {
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeStructure | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    level: "",
    fee_type: "tuition",
    amount: "",
    is_mandatory: true,
  });
  
  // History tab state
  const [historySearch, setHistorySearch] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    amount: "",
    payment_method: "cash",
    reference_number: "",
    notes: "",
  });

  const { data: feeStructures = [], isLoading } = useQuery({
    queryKey: ['fee-structures', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fee_structures')
        .select('*')
        .eq('tenant_id', tenantData!.tenantId)
        .order('level', { ascending: true });
      if (error) throw error;
      return data as FeeStructure[];
    },
  });

  const { data: studentFees = [], isLoading: isLoadingStudentFees } = useQuery({
    queryKey: ['student-fees', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_fees')
        .select('*, students(full_name, admission_number)')
        .eq('tenant_id', tenantData!.tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as StudentFee[];
    },
  });

  // Payment history query
  const { data: paymentHistory = [], isLoading: isLoadingHistory } = useQuery({
    queryKey: ['payment-history', tenantData?.tenantId, dateFilter, paymentMethodFilter],
    queryFn: async () => {
      if (!tenantData?.tenantId) return [];

      let query = supabase
        .from('fee_payments')
        .select(`
          *,
          student:students(id, full_name, admission_number, class:school_classes(name)),
          student_fee:student_fees(term:academic_terms(name, year))
        `)
        .eq('tenant_id', tenantData.tenantId)
        .order('created_at', { ascending: false });

      if (dateFilter !== "all") {
        const now = new Date();
        let startDate: Date;
        switch (dateFilter) {
          case "today": startDate = startOfDay(now); break;
          case "week": startDate = subDays(now, 7); break;
          case "month": startDate = subDays(now, 30); break;
          default: startDate = subDays(now, 365);
        }
        query = query.gte('created_at', startDate.toISOString());
      }

      if (paymentMethodFilter !== "all") {
        query = query.eq('payment_method', paymentMethodFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantData?.tenantId,
  });

  // Tenant info for receipts
  const { data: tenantInfo } = useQuery({
    queryKey: ['tenant-info', tenantData?.tenantId],
    queryFn: async () => {
      if (!tenantData?.tenantId) return null;
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantData.tenantId)
        .maybeSingle();
      return data;
    },
    enabled: !!tenantData?.tenantId,
  });

  // Receipt settings
  const { data: receiptSettings } = useQuery({
    queryKey: ['receipt-settings', tenantData?.tenantId],
    queryFn: async () => {
      if (!tenantData?.tenantId) return null;
      const { data } = await supabase
        .from('receipt_settings')
        .select('*')
        .eq('tenant_id', tenantData.tenantId)
        .maybeSingle();
      return data;
    },
    enabled: !!tenantData?.tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('fee_structures').insert({
        tenant_id: tenantData!.tenantId,
        name: data.name,
        level: data.level,
        fee_type: data.fee_type,
        amount: parseFloat(data.amount),
        is_mandatory: data.is_mandatory,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      toast({ title: "Fee structure added successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase.from('fee_structures').update({
        name: data.name,
        level: data.level,
        fee_type: data.fee_type,
        amount: parseFloat(data.amount),
        is_mandatory: data.is_mandatory,
      }).eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      toast({ title: "Fee structure updated successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fee_structures').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fee-structures'] });
      toast({ title: "Fee structure deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Payment edit mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async (data: { id: string; amount: number; payment_method: string; reference_number?: string; notes?: string }) => {
      const { error } = await supabase
        .from('fee_payments')
        .update({
          amount: data.amount,
          payment_method: data.payment_method,
          reference_number: data.reference_number || null,
          notes: data.notes || null,
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
      queryClient.invalidateQueries({ queryKey: ['student-fees'] });
      toast({ title: "Payment updated successfully" });
      setIsEditPaymentOpen(false);
      setEditingPayment(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({ name: "", level: "", fee_type: "tuition", amount: "", is_mandatory: true });
    setEditingFee(null);
    setIsDialogOpen(false);
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setEditPaymentForm({
      amount: payment.amount.toString(),
      payment_method: payment.payment_method || "cash",
      reference_number: payment.reference_number || "",
      notes: payment.notes || "",
    });
    setIsEditPaymentOpen(true);
  };

  const handleUpdatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    updatePaymentMutation.mutate({
      id: editingPayment.id,
      amount: parseFloat(editPaymentForm.amount),
      payment_method: editPaymentForm.payment_method,
      reference_number: editPaymentForm.reference_number,
      notes: editPaymentForm.notes,
    });
  };

  const handleEdit = (fee: FeeStructure) => {
    setEditingFee(fee);
    setFormData({
      name: fee.name,
      level: fee.level,
      fee_type: fee.fee_type,
      amount: fee.amount.toString(),
      is_mandatory: fee.is_mandatory,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFee) {
      updateMutation.mutate({ ...formData, id: editingFee.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0 }).format(amount);
  };

  const totalCollected = studentFees.reduce((sum, sf) => sum + sf.amount_paid, 0);
  const totalOutstanding = studentFees.reduce((sum, sf) => sum + (sf.balance || 0), 0);

  // History tab helpers
  const filteredPayments = paymentHistory.filter(payment => {
    if (!historySearch) return true;
    const search = historySearch.toLowerCase();
    return (
      payment.student?.full_name?.toLowerCase().includes(search) ||
      payment.student?.admission_number?.toLowerCase().includes(search) ||
      payment.receipt_number?.toLowerCase().includes(search)
    );
  });

  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const historyTotalCollected = paymentHistory.reduce((sum, p) => sum + Number(p.amount), 0);
  const todayPayments = paymentHistory.filter(p => 
    new Date(p.created_at).toDateString() === new Date().toDateString()
  );
  const todayTotal = todayPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const handleViewReceipt = (payment: any) => {
    setSelectedPayment(payment);
    setIsReceiptOpen(true);
  };

  const handlePrintReceipt = () => {
    const printContent = document.getElementById('receipt-print-area');
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Fee Receipt</title>
          <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
          <style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'DM Sans', sans-serif; }</style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => { printWindow.print(); printWindow.close(); };
  };

  const getPaymentMethodBadge = (method: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      cash: "default", mobile_money: "secondary", bank_transfer: "outline",
    };
    return <Badge variant={variants[method] || "outline"} className="capitalize">{method?.replace('_', ' ') || 'N/A'}</Badge>;
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fee Management</h1>
          <p className="text-muted-foreground">Manage fee structures and student payments</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalCollected)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalOutstanding)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee Structures</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feeStructures.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="payment">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="payment" className="flex items-center gap-2">
            <ScanLine className="h-4 w-4" />
            Collect Payment
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
          <TabsTrigger value="balances">Student Balances</TabsTrigger>
          <TabsTrigger value="bursar" className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Bursar Rules
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payment" className="mt-4">
          {tenantData?.tenantId && (
            <FeePaymentScanner tenantId={tenantData.tenantId} />
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          {/* History Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(historyTotalCollected)}</div>
                <p className="text-xs text-muted-foreground">{paymentHistory.length} payments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Today</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(todayTotal)}</div>
                <p className="text-xs text-muted-foreground">{todayPayments.length} payments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Students Paid</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{new Set(paymentHistory.map(p => p.student_id)).size}</div>
                <p className="text-xs text-muted-foreground">Unique students</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Payment</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(paymentHistory.length ? historyTotalCollected / paymentHistory.length : 0)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by student, admission number, or receipt..."
                    value={historySearch}
                    onChange={(e) => { setHistorySearch(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                <Select value={dateFilter} onValueChange={(v) => { setDateFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[180px]">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={paymentMethodFilter} onValueChange={(v) => { setPaymentMethodFilter(v); setCurrentPage(1); }}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Payments Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment Records
                <Badge variant="secondary" className="ml-2">{filteredPayments.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : paginatedPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No payment records found</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono text-sm">{payment.receipt_number || '-'}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{payment.student?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{payment.student?.admission_number}</p>
                            </div>
                          </TableCell>
                          <TableCell>{payment.student?.class?.name || '-'}</TableCell>
                          <TableCell className="font-semibold text-green-600">{formatCurrency(payment.amount)}</TableCell>
                          <TableCell>{getPaymentMethodBadge(payment.payment_method)}</TableCell>
                          <TableCell>
                            <div>
                              <p>{format(new Date(payment.created_at), 'MMM d, yyyy')}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(payment.created_at), 'h:mm a')}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleEditPayment(payment)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleViewReceipt(payment)} title="View Receipt">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {totalPages > 1 && (
                    <div className="mt-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = totalPages <= 5 ? i + 1 : currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i;
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink onClick={() => setCurrentPage(pageNum)} isActive={currentPage === pageNum} className="cursor-pointer">
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          })}
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Receipt Dialog */}
          <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Payment Receipt</span>
                  <Button variant="outline" size="sm" onClick={handlePrintReceipt}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </DialogTitle>
              </DialogHeader>
              {selectedPayment && (
                <div id="receipt-print-area">
                  <FeeReceiptThermal
                    receipt_number={selectedPayment.receipt_number || ''}
                    student={{
                      full_name: selectedPayment.student?.full_name || '',
                      admission_number: selectedPayment.student?.admission_number || '',
                      class_name: selectedPayment.student?.class?.name || '',
                    }}
                    amount={selectedPayment.amount}
                    payment_method={selectedPayment.payment_method || 'cash'}
                    reference_number={selectedPayment.reference_number}
                    date={new Date(selectedPayment.created_at)}
                    previous_balance={0}
                    new_balance={0}
                    tenant={{
                      name: tenantInfo?.name || '',
                      address: tenantInfo?.address || '',
                      phone: tenantInfo?.phone || '',
                      email: tenantInfo?.email || '',
                      logo_url: tenantInfo?.logo_url || '',
                    }}
                    term={{
                      name: selectedPayment.student_fee?.term?.name || '',
                      year: selectedPayment.student_fee?.term?.year || new Date().getFullYear(),
                    }}
                    settings={receiptSettings || {}}
                    cashier_name="Staff"
                  />
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Payment Dialog */}
          <Dialog open={isEditPaymentOpen} onOpenChange={setIsEditPaymentOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Payment</DialogTitle>
              </DialogHeader>
              {editingPayment && (
                <form onSubmit={handleUpdatePayment} className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">{editingPayment.student?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {editingPayment.student?.admission_number} • Receipt: {editingPayment.receipt_number}
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="edit-amount">Amount (UGX) *</Label>
                    <Input
                      id="edit-amount"
                      type="number"
                      value={editPaymentForm.amount}
                      onChange={(e) => setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })}
                      required
                      min="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-method">Payment Method</Label>
                    <Select 
                      value={editPaymentForm.payment_method} 
                      onValueChange={(v) => setEditPaymentForm({ ...editPaymentForm, payment_method: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="mobile_money">Mobile Money</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-reference">Reference Number</Label>
                    <Input
                      id="edit-reference"
                      value={editPaymentForm.reference_number}
                      onChange={(e) => setEditPaymentForm({ ...editPaymentForm, reference_number: e.target.value })}
                      placeholder="Transaction ID or reference"
                    />
                  </div>

                  <div>
                    <Label htmlFor="edit-notes">Notes</Label>
                    <Input
                      id="edit-notes"
                      value={editPaymentForm.notes}
                      onChange={(e) => setEditPaymentForm({ ...editPaymentForm, notes: e.target.value })}
                      placeholder="Reason for edit, corrections, etc."
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsEditPaymentOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updatePaymentMutation.isPending}>
                      {updatePaymentMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="structures" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Fee Structures</CardTitle>
                <CardDescription>Define fee types and amounts by level</CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Fee
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingFee ? "Edit Fee Structure" : "Add Fee Structure"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Fee Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Tuition Fee, Boarding Fee"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="level">Level *</Label>
                        <Select value={formData.level} onValueChange={v => setFormData({ ...formData, level: v })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kindergarten">Kindergarten</SelectItem>
                            <SelectItem value="primary">Primary</SelectItem>
                            <SelectItem value="secondary">Secondary</SelectItem>
                            <SelectItem value="all">All Levels</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="fee_type">Fee Type</Label>
                        <Select value={formData.fee_type} onValueChange={v => setFormData({ ...formData, fee_type: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tuition">Tuition</SelectItem>
                            <SelectItem value="boarding">Boarding</SelectItem>
                            <SelectItem value="transport">Transport</SelectItem>
                            <SelectItem value="uniform">Uniform</SelectItem>
                            <SelectItem value="meals">Meals</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="amount">Amount (UGX) *</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                      <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                        {editingFee ? "Update" : "Add"} Fee
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : feeStructures.length === 0 ? (
                <div className="text-center py-12">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No fee structures yet</h3>
                  <p className="text-muted-foreground">Add fee structures to start billing students</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeStructures.map(fee => (
                      <TableRow key={fee.id}>
                        <TableCell className="font-medium">{fee.name}</TableCell>
                        <TableCell>{fee.level}</TableCell>
                        <TableCell className="capitalize">{fee.fee_type}</TableCell>
                        <TableCell>{formatCurrency(fee.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={fee.is_active ? "default" : "secondary"}>
                            {fee.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(fee)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate(fee.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Balances</CardTitle>
              <CardDescription>View and manage student fee balances</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStudentFees ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : studentFees.length === 0 ? (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No student fees yet</h3>
                  <p className="text-muted-foreground">Fees will appear here when assigned to students</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No.</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentFees.map(sf => (
                      <TableRow key={sf.id}>
                        <TableCell className="font-medium">{sf.students?.full_name || "Unknown"}</TableCell>
                        <TableCell>{sf.students?.admission_number || "-"}</TableCell>
                        <TableCell>{formatCurrency(sf.total_amount)}</TableCell>
                        <TableCell className="text-green-600">{formatCurrency(sf.amount_paid)}</TableCell>
                        <TableCell className="text-orange-600">{formatCurrency(sf.balance || 0)}</TableCell>
                        <TableCell>
                          <Badge variant={sf.status === 'paid' ? "default" : sf.status === 'partial' ? "secondary" : "destructive"}>
                            {sf.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bursar" className="mt-4 space-y-6">
          <BursarRulesManager />
          <OverrideRequestsPanel showPendingOnly={false} maxHeight="500px" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
