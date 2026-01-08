import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "sonner";
import { 
  Home, 
  LogOut, 
  FileText, 
  Wallet, 
  Wrench, 
  Calendar,
  Phone,
  Mail,
  Building2,
  DoorOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Loader2,
  Printer,
  Key,
  CreditCard,
  Receipt
} from "lucide-react";
import { format } from "date-fns";
import { RenterAccessReceipt, printRenterAccessReceipt } from "@/components/rental/RenterAccessReceipt";
import RentalPaymentReceipt from "@/components/rental/RentalPaymentReceipt";

interface RenterSession {
  renterId: string;
  name: string;
  phone: string;
  email: string | null;
  tenantId: string;
  unitId?: string;
  propertyCode?: string;
  unitNumber?: string;
  accessPin?: string;
}

export default function RenterDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<RenterSession | null>(null);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [accessReceiptDialogOpen, setAccessReceiptDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [idCardDialogOpen, setIdCardDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const paymentReceiptRef = useRef<HTMLDivElement>(null);
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: "",
    description: "",
    category: "general",
    priority: "medium",
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "mobile_money",
    reference_number: "",
    notes: "",
  });

  useEffect(() => {
    const stored = sessionStorage.getItem("renter_session");
    if (!stored) {
      navigate("/renter");
      return;
    }
    setSession(JSON.parse(stored));
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem("renter_session");
    navigate("/renter");
  };

  // Fetch active lease
  const { data: lease, isLoading: isLoadingLease } = useQuery({
    queryKey: ["renter-lease", session?.renterId],
    enabled: !!session?.renterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leases")
        .select(`
          *,
          rental_units:unit_id (
            unit_number,
            floor_number,
            bedrooms,
            bathrooms,
            rental_properties:property_id (
              name,
              address
            )
          )
        `)
        .eq("rental_tenant_id", session!.renterId)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch recent payments
  const { data: payments = [], isLoading: isLoadingPayments } = useQuery({
    queryKey: ["renter-payments", session?.renterId],
    enabled: !!session?.renterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_payments")
        .select("*")
        .eq("rental_tenant_id", session!.renterId)
        .order("payment_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Fetch maintenance requests
  const { data: maintenanceRequests = [], isLoading: isLoadingMaintenance } = useQuery({
    queryKey: ["renter-maintenance", session?.renterId],
    enabled: !!session?.renterId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select("*")
        .eq("rental_tenant_id", session!.renterId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  // Fetch ID cards
  const { data: idCards = [], isLoading: isLoadingIdCards } = useQuery({
    queryKey: ["renter-id-cards", session?.unitId],
    enabled: !!session?.unitId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_id_cards")
        .select(`
          *,
          rental_units:unit_id (
            unit_number,
            rental_properties:property_id (
              name,
              address
            )
          )
        `)
        .eq("unit_id", session!.unitId)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
  });

  // Fetch tenant info for receipts
  const { data: tenantInfo } = useQuery({
    queryKey: ["tenant-info", session?.tenantId],
    enabled: !!session?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("name, address, phone, email, logo_url")
        .eq("id", session!.tenantId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Submit maintenance request
  const submitMaintenanceMutation = useMutation({
    mutationFn: async (formData: typeof maintenanceForm) => {
      if (!session || !lease) throw new Error("No session or lease found");

      const requestNumber = `MR-${Date.now().toString(36).toUpperCase()}`;
      
      const { error } = await supabase.from("maintenance_requests").insert({
        tenant_id: session.tenantId,
        unit_id: lease.unit_id,
        rental_tenant_id: session.renterId,
        request_number: requestNumber,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: "pending",
        reported_by: session.name,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renter-maintenance"] });
      setMaintenanceDialogOpen(false);
      setMaintenanceForm({ title: "", description: "", category: "general", priority: "medium" });
      toast.success("Maintenance request submitted successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit request");
    },
  });

  // Submit self-payment as payment proof for verification
  const submitPaymentMutation = useMutation({
    mutationFn: async (formData: typeof paymentForm) => {
      if (!session || !lease) throw new Error("No session or lease found");

      // Get the active ID card for this unit
      const activeCard = idCards.find(card => card.status === 'active');
      if (!activeCard) throw new Error("No active ID card found for this unit");

      // Map payment method to provider format
      const providerMap: Record<string, string> = {
        mobile_money: 'mtn',
        airtel_money: 'airtel',
        bank_transfer: 'bank',
        cash: 'bank'
      };

      const { error } = await supabase.from("rental_payment_proofs").insert({
        tenant_id: session.tenantId,
        card_id: activeCard.id,
        lease_id: lease.id,
        payer_name: session.name,
        amount: parseFloat(formData.amount),
        payment_provider: providerMap[formData.payment_method] || 'mtn',
        transaction_reference: formData.reference_number || null,
        payment_date: new Date().toISOString().split('T')[0],
        notes: formData.notes || null,
        status: "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renter-payments"] });
      setPaymentDialogOpen(false);
      setPaymentForm({ amount: "", payment_method: "mobile_money", reference_number: "", notes: "" });
      toast.success("Payment submitted! Your landlord will verify it shortly.");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit payment");
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: "bg-success text-success-foreground",
      pending: "bg-warning text-warning-foreground",
      overdue: "bg-destructive text-destructive-foreground",
      completed: "bg-success text-success-foreground",
      in_progress: "bg-blue-500 text-white",
    };
    return <Badge className={styles[status] || "bg-muted"}>{status.replace("_", " ")}</Badge>;
  };

  const handlePrintAccessReceipt = () => {
    if (receiptRef.current) {
      printRenterAccessReceipt(receiptRef.current);
    }
  };

  const handlePrintPaymentReceipt = () => {
    if (paymentReceiptRef.current) {
      const printContent = paymentReceiptRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Payment Receipt</title>
              <style>
                body { margin: 0; padding: 10mm; font-family: Arial, sans-serif; }
                @media print { body { margin: 0; padding: 0; } }
              </style>
            </head>
            <body>${printContent}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const openReceiptDialog = (payment: any) => {
    setSelectedPayment(payment);
    setReceiptDialogOpen(true);
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Home className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-sm sm:text-base text-primary truncate">KaRental Ko</h1>
              <p className="text-xs text-muted-foreground truncate">Welcome, {session.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {session.propertyCode && session.unitNumber && session.accessPin && (
              <Dialog open={accessReceiptDialogOpen} onOpenChange={setAccessReceiptDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="hidden xs:flex">
                    <Key className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Access Info</span>
                  </Button>
                </DialogTrigger>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon" className="xs:hidden h-8 w-8">
                    <Key className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md mx-auto">
                  <DialogHeader>
                    <DialogTitle>Your Access Credentials</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden bg-muted/50 overflow-x-auto">
                      <RenterAccessReceipt
                        ref={receiptRef}
                        renterName={session.name}
                        propertyCode={session.propertyCode}
                        unitNumber={session.unitNumber}
                        accessPin={session.accessPin}
                        propertyName={(lease?.rental_units as any)?.rental_properties?.name}
                        propertyAddress={(lease?.rental_units as any)?.rental_properties?.address}
                        monthlyRent={lease?.monthly_rent}
                        leaseEndDate={lease?.end_date}
                      />
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                      <Button variant="outline" onClick={() => setAccessReceiptDialogOpen(false)} className="w-full sm:w-auto">
                        Close
                      </Button>
                      <Button onClick={handlePrintAccessReceipt} className="w-full sm:w-auto">
                        <Printer className="h-4 w-4 mr-2" />
                        Print Receipt
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="px-2 sm:px-3">
              <LogOut className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Exit</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Current Unit Card */}
        {isLoadingLease ? (
          <Card>
            <CardContent className="py-6 sm:py-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </CardContent>
          </Card>
        ) : lease ? (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                    <span className="truncate">{(lease.rental_units as any)?.rental_properties?.name || "Your Property"}</span>
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs sm:text-sm truncate">
                    {(lease.rental_units as any)?.rental_properties?.address}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-primary text-primary self-start flex-shrink-0">
                  Active Lease
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <DoorOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Unit</p>
                    <p className="font-medium text-sm sm:text-base truncate">{(lease.rental_units as any)?.unit_number}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Monthly Rent</p>
                    <p className="font-medium text-sm sm:text-base truncate">{formatCurrency(lease.monthly_rent)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Due Date</p>
                    <p className="font-medium text-sm sm:text-base">{lease.payment_due_day || 1}th of month</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-muted-foreground">Lease Ends</p>
                    <p className="font-medium text-sm sm:text-base">{format(new Date(lease.end_date), "MMM dd, yyyy")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-6 sm:py-8 text-center text-muted-foreground">
              <FileText className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm sm:text-base">No active lease found</p>
            </CardContent>
          </Card>
        )}

        {/* Tabs for Payments and Maintenance */}
        <Tabs defaultValue="payments" className="space-y-3 sm:space-y-4">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="payments" className="gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm">
              <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm">
              <Wrench className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="idcard" className="gap-1 sm:gap-2 py-2 sm:py-2.5 text-xs sm:text-sm">
              <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              ID Card
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-3 sm:space-y-4">
            <div className="flex flex-col xs:flex-row justify-between xs:items-center gap-2">
              <div>
                <h3 className="font-semibold text-sm sm:text-base">Payment History</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Your recent rent payments</p>
              </div>
              <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={!lease} className="w-full xs:w-auto">
                    <Plus className="h-4 w-4 mr-1" />
                    Report Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg mx-auto">
                  <DialogHeader>
                    <DialogTitle>Report a Payment</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitPaymentMutation.mutate(paymentForm);
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount Paid (UGX)</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="e.g. 500000"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment_method">Payment Method</Label>
                      <Select
                        value={paymentForm.payment_method}
                        onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mobile_money">Mobile Money</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="reference_number">Transaction ID / Reference</Label>
                      <Input
                        id="reference_number"
                        placeholder="e.g. MP240XXXXX"
                        value={paymentForm.reference_number}
                        onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">From your mobile money or bank statement</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment_notes">Notes (optional)</Label>
                      <Textarea
                        id="payment_notes"
                        placeholder="Any additional details..."
                        value={paymentForm.notes}
                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)} className="w-full sm:w-auto">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitPaymentMutation.isPending} className="w-full sm:w-auto">
                        {submitPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Submit Payment
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                {isLoadingPayments ? (
                  <div className="text-center py-6 sm:py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : payments.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground">
                    <Wallet className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm sm:text-base">No payments recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {payments.map((payment: any) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-2.5 sm:p-3 bg-muted/50 rounded-lg gap-2"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          {payment.status === "completed" || payment.status === "paid" ? (
                            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success flex-shrink-0" />
                          ) : (
                            <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-warning flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm sm:text-base truncate">{formatCurrency(payment.amount)}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {payment.payment_date 
                                ? format(new Date(payment.payment_date), "MMM dd, yyyy")
                                : "Pending"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {getStatusBadge(payment.status)}
                          {(payment.status === "completed" || payment.status === "paid") && payment.receipt_number && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8"
                              onClick={() => openReceiptDialog(payment)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-3 sm:space-y-4">
            <div className="flex flex-col xs:flex-row justify-between xs:items-center gap-2">
              <div>
                <h3 className="font-semibold text-sm sm:text-base">Maintenance Requests</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Report issues with your unit</p>
              </div>
              <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={!lease} className="w-full xs:w-auto">
                    <Plus className="h-4 w-4 mr-1" />
                    New Request
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Submit Maintenance Request</DialogTitle>
                  </DialogHeader>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitMaintenanceMutation.mutate(maintenanceForm);
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="title">Issue Title</Label>
                      <Input
                        id="title"
                        placeholder="e.g. Leaking faucet"
                        value={maintenanceForm.title}
                        onChange={(e) =>
                          setMaintenanceForm({ ...maintenanceForm, title: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={maintenanceForm.category}
                          onValueChange={(value) =>
                            setMaintenanceForm({ ...maintenanceForm, category: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="plumbing">Plumbing</SelectItem>
                            <SelectItem value="electrical">Electrical</SelectItem>
                            <SelectItem value="appliances">Appliances</SelectItem>
                            <SelectItem value="structural">Structural</SelectItem>
                            <SelectItem value="pest_control">Pest Control</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select
                          value={maintenanceForm.priority}
                          onValueChange={(value) =>
                            setMaintenanceForm({ ...maintenanceForm, priority: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High - Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the issue in detail..."
                        value={maintenanceForm.description}
                        onChange={(e) =>
                          setMaintenanceForm({ ...maintenanceForm, description: e.target.value })
                        }
                        required
                        rows={4}
                      />
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setMaintenanceDialogOpen(false)}
                        className="w-full sm:w-auto"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={submitMaintenanceMutation.isPending} className="w-full sm:w-auto">
                        {submitMaintenanceMutation.isPending && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Submit Request
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                {isLoadingMaintenance ? (
                  <div className="text-center py-6 sm:py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : maintenanceRequests.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground">
                    <Wrench className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm sm:text-base">No maintenance requests</p>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3">
                    {maintenanceRequests.map((request: any) => (
                      <div
                        key={request.id}
                        className="p-2.5 sm:p-3 bg-muted/50 rounded-lg space-y-1.5 sm:space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">{request.title}</p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {request.request_number} • {request.category}
                            </p>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                          {request.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {format(new Date(request.created_at), "MMM dd, yyyy")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="idcard" className="space-y-3 sm:space-y-4">
            <Card>
              <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Your Rental ID Card
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Use this card for payment verification
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {isLoadingIdCards ? (
                  <div className="text-center py-6 sm:py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </div>
                ) : idCards.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground">
                    <CreditCard className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm sm:text-base">No ID card issued yet</p>
                    <p className="text-xs mt-1">Contact your landlord to get your rental ID card</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {idCards.map((card: any) => (
                      <div key={card.id} className="border rounded-lg p-4 bg-gradient-to-br from-primary/5 to-accent/5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
                              <CreditCard className="h-6 w-6 text-primary-foreground" />
                            </div>
                            <div>
                              <p className="font-bold text-lg">{card.card_number}</p>
                              <p className="text-xs text-muted-foreground">Card Number</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="border-success text-success">Active</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Property</p>
                            <p className="font-medium truncate">{(card.rental_units as any)?.rental_properties?.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Unit</p>
                            <p className="font-medium">{(card.rental_units as any)?.unit_number}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Holder</p>
                            <p className="font-medium truncate">{session.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Issued</p>
                            <p className="font-medium">{card.issued_at ? format(new Date(card.issued_at), "MMM dd, yyyy") : "N/A"}</p>
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">How to pay using your card:</p>
                          <p className="text-xs">
                            Use card number <strong>{card.card_number}</strong> when submitting payment proof at{" "}
                            <span className="text-primary">/pay</span> or show this card to your landlord.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Contact Info */}
        <Card>
          <CardHeader className="pb-2 sm:pb-3 px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg">Your Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="flex flex-col xs:flex-row flex-wrap gap-3 sm:gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{session.phone}</span>
              </div>
              {session.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{session.email}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Payment Receipt Dialog */}
      <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
          </DialogHeader>
          {selectedPayment && tenantInfo && lease && (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden bg-muted/50 overflow-x-auto">
                <RentalPaymentReceipt
                  ref={paymentReceiptRef}
                  payment={{
                    receipt_number: selectedPayment.receipt_number || `RNT-${selectedPayment.id.slice(0, 8).toUpperCase()}`,
                    payment_date: selectedPayment.payment_date,
                    amount: selectedPayment.amount,
                    payment_type: selectedPayment.payment_type,
                    payment_method: selectedPayment.payment_method,
                    months_covered: selectedPayment.months_covered,
                    period_start: selectedPayment.period_start,
                    period_end: selectedPayment.period_end,
                    reference_number: selectedPayment.reference_number,
                    notes: selectedPayment.notes,
                    tenant_name: session.name,
                    unit_number: (lease.rental_units as any)?.unit_number || session.unitNumber || "",
                    property_name: (lease.rental_units as any)?.rental_properties?.name || "",
                  }}
                  business={{
                    name: tenantInfo.name,
                    address: tenantInfo.address,
                    phone: tenantInfo.phone,
                    email: tenantInfo.email,
                    logo_url: tenantInfo.logo_url,
                  }}
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <Button variant="outline" onClick={() => setReceiptDialogOpen(false)} className="w-full sm:w-auto">
                  Close
                </Button>
                <Button onClick={handlePrintPaymentReceipt} className="w-full sm:w-auto">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="border-t py-3 sm:py-4 mt-6 sm:mt-8">
        <div className="container mx-auto px-3 sm:px-4 text-center">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Powered by Kabejja Systems
          </p>
        </div>
      </footer>
    </div>
  );
}
