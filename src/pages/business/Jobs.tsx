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
import { Plus, Search, Wrench, Clock, CheckCircle, Phone, AlertCircle, Package, Truck, X, MessageCircle, UserPlus, DollarSign, User, Banknote, Printer, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import JobTicket from "@/components/repair/JobTicket";

const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Pending", color: "bg-yellow-500", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-500", icon: Wrench },
  waiting_parts: { label: "Waiting Parts", color: "bg-orange-500", icon: Package },
  completed: { label: "Completed", color: "bg-green-500", icon: CheckCircle },
  ready: { label: "Ready for Pickup", color: "bg-emerald-500", icon: Phone },
  delivered: { label: "Delivered", color: "bg-purple-500", icon: Truck },
  collected: { label: "Collected", color: "bg-gray-500", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-500", icon: X },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-gray-400" },
  normal: { label: "Normal", color: "bg-blue-400" },
  high: { label: "High", color: "bg-orange-500" },
  urgent: { label: "Urgent", color: "bg-red-500" },
};

export default function Jobs() {
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any>(null);
  const [isAddingNewCustomer, setIsAddingNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "" });
  const [paymentDialogJob, setPaymentDialogJob] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [printingJob, setPrintingJob] = useState<any>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    customer_id: "",
    device_type: "",
    device_model: "",
    device_imei: "",
    device_serial_number: "",
    device_state_before: "",
    fault_description: "",
    diagnosis: "",
    priority: "normal",
    status: "pending",
    due_date: "",
    assigned_to: "",
    total_amount: "",
    technician_fee: "",
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['repair-jobs', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('repair_jobs')
        .select(`
          *,
          customers(id, name, phone),
          employees(id, full_name)
        `)
        .eq('tenant_id', tenantData!.tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: tenantInfo } = useQuery({
    queryKey: ['tenant-info', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('name, phone')
        .eq('id', tenantData!.tenantId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone')
        .eq('tenant_id', tenantData!.tenantId)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('id, full_name')
        .eq('tenant_id', tenantData!.tenantId)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (customerData: { name: string; phone: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          tenant_id: tenantData!.tenantId,
          name: customerData.name,
          phone: customerData.phone,
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setFormData(prev => ({ ...prev, customer_id: data.id }));
      setNewCustomer({ name: "", phone: "" });
      setIsAddingNewCustomer(false);
      toast({ title: "Customer added" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const saveJobMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const totalAmount = parseFloat(data.total_amount) || 0;
      const techFee = parseFloat(data.technician_fee) || 0;
      
      if (editingJob) {
        const { error } = await supabase
          .from('repair_jobs')
          .update({
            customer_id: data.customer_id || null,
            device_type: data.device_type,
            device_model: data.device_model || null,
            device_imei: data.device_imei || null,
            device_serial_number: data.device_serial_number || null,
            device_state_before: data.device_state_before || null,
            fault_description: data.fault_description,
            diagnosis: data.diagnosis || null,
            priority: data.priority,
            status: data.status,
            due_date: data.due_date || null,
            assigned_to: data.assigned_to || null,
            total_amount: totalAmount,
            technician_fee: techFee,
          })
          .eq('id', editingJob.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('repair_jobs')
          .insert({
            tenant_id: tenantData!.tenantId,
            customer_id: data.customer_id || null,
            device_type: data.device_type,
            device_model: data.device_model || null,
            device_imei: data.device_imei || null,
            device_serial_number: data.device_serial_number || null,
            device_state_before: data.device_state_before || null,
            fault_description: data.fault_description,
            diagnosis: data.diagnosis || null,
            priority: data.priority,
            status: data.status,
            due_date: data.due_date || null,
            assigned_to: data.assigned_to || null,
            total_amount: totalAmount,
            technician_fee: techFee,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-jobs'] });
      toast({ title: editingJob ? "Job updated" : "Job created successfully" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: string }) => {
      const updateData: any = { status };
      if (status === 'completed') updateData.completed_at = new Date().toISOString();
      if (status === 'delivered' || status === 'collected') updateData.delivered_at = new Date().toISOString();
      
      const { error } = await supabase
        .from('repair_jobs')
        .update(updateData)
        .eq('id', jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-jobs'] });
      toast({ title: "Status updated" });
    },
  });

  const collectPaymentMutation = useMutation({
    mutationFn: async ({ jobId, amount }: { jobId: string; amount: number }) => {
      // Get current job data
      const { data: job, error: fetchError } = await supabase
        .from('repair_jobs')
        .select('amount_paid')
        .eq('id', jobId)
        .single();
      if (fetchError) throw fetchError;

      const newAmountPaid = (job.amount_paid || 0) + amount;
      
      const { error } = await supabase
        .from('repair_jobs')
        .update({ amount_paid: newAmountPaid })
        .eq('id', jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-jobs'] });
      toast({ title: "Payment recorded" });
      setPaymentDialogJob(null);
      setPaymentAmount("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const payTechnicianMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { error } = await supabase
        .from('repair_jobs')
        .update({ 
          technician_paid: true,
          technician_paid_at: new Date().toISOString()
        })
        .eq('id', jobId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repair-jobs'] });
      toast({ title: "Technician marked as paid" });
    },
  });

  // Quick status flow: pending -> in_progress -> completed -> ready
  const getNextStatus = (currentStatus: string) => {
    const flow: Record<string, string> = {
      pending: 'in_progress',
      in_progress: 'completed',
      completed: 'ready',
      ready: 'collected',
    };
    return flow[currentStatus];
  };

  const printTicket = (job: any) => {
    setPrintingJob(job);
    setTimeout(() => {
      if (ticketRef.current) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Job Ticket - ${job.job_ref}</title>
                <style>
                  body { margin: 0; padding: 0; display: flex; justify-content: center; }
                  @media print { body { -webkit-print-color-adjust: exact; } }
                </style>
              </head>
              <body>${ticketRef.current.outerHTML}</body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
          printWindow.close();
        }
      }
      setPrintingJob(null);
    }, 100);
  };

  const resetForm = () => {
    setFormData({
      customer_id: "",
      device_type: "",
      device_model: "",
      device_imei: "",
      device_serial_number: "",
      device_state_before: "",
      fault_description: "",
      diagnosis: "",
      priority: "normal",
      status: "pending",
      due_date: "",
      assigned_to: "",
      total_amount: "",
      technician_fee: "",
    });
    setEditingJob(null);
    setIsDialogOpen(false);
    setIsAddingNewCustomer(false);
    setNewCustomer({ name: "", phone: "" });
  };

  const handleEdit = (job: any) => {
    setEditingJob(job);
    setFormData({
      customer_id: job.customer_id || "",
      device_type: job.device_type,
      device_model: job.device_model || "",
      device_imei: job.device_imei || "",
      device_serial_number: job.device_serial_number || "",
      device_state_before: job.device_state_before || "",
      fault_description: job.fault_description,
      diagnosis: job.diagnosis || "",
      priority: job.priority,
      status: job.status,
      due_date: job.due_date || "",
      assigned_to: job.assigned_to || "",
      total_amount: job.total_amount?.toString() || "",
      technician_fee: job.technician_fee?.toString() || "",
    });
    setIsDialogOpen(true);
  };

  const openWhatsApp = (job: any) => {
    const phone = job.customers?.phone;
    if (!phone) return;
    
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    
    // Create message based on job status
    const statusMessages: Record<string, string> = {
      pending: `Hello! Your ${job.device_type}${job.device_model ? ` (${job.device_model})` : ''} repair job (${job.job_ref}) has been received and is pending review.`,
      in_progress: `Hello! Your ${job.device_type}${job.device_model ? ` (${job.device_model})` : ''} repair (${job.job_ref}) is currently being worked on.`,
      waiting_parts: `Hello! Your ${job.device_type}${job.device_model ? ` (${job.device_model})` : ''} repair (${job.job_ref}) is waiting for parts to arrive.`,
      completed: `Hello! Great news! Your ${job.device_type}${job.device_model ? ` (${job.device_model})` : ''} repair (${job.job_ref}) has been completed!`,
      ready: `Hello! Your ${job.device_type}${job.device_model ? ` (${job.device_model})` : ''} (${job.job_ref}) is ready for pickup!`,
      delivered: `Hello! Your ${job.device_type}${job.device_model ? ` (${job.device_model})` : ''} (${job.job_ref}) has been delivered. Thank you!`,
      collected: `Hello! Thank you for collecting your ${job.device_type}${job.device_model ? ` (${job.device_model})` : ''} (${job.job_ref}). We appreciate your business!`,
      cancelled: `Hello! Regarding your ${job.device_type}${job.device_model ? ` (${job.device_model})` : ''} repair (${job.job_ref}).`,
    };
    
    const message = statusMessages[job.status] || `Hello! Regarding your repair job ${job.job_ref}.`;
    const encodedMessage = encodeURIComponent(message);
    
    // Open WhatsApp in new tab
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.job_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.device_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.device_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.fault_description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const jobStats = {
    total: jobs.length,
    pending: jobs.filter(j => j.status === 'pending').length,
    inProgress: jobs.filter(j => j.status === 'in_progress').length,
    completed: jobs.filter(j => ['completed', 'ready', 'delivered', 'collected'].includes(j.status)).length,
    unpaidTechFees: jobs.filter(j => !j.technician_paid && j.technician_fee > 0 && ['completed', 'ready', 'delivered', 'collected'].includes(j.status)).reduce((sum, j) => sum + (j.technician_fee || 0), 0),
    totalBalance: jobs.reduce((sum, j) => sum + (j.balance_due || 0), 0),
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Repair Jobs</h1>
          <p className="text-muted-foreground">Manage device repairs and service jobs</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Job
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingJob ? "Edit Job" : "Create New Job"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); saveJobMutation.mutate(formData); }} className="space-y-4">
              {/* Customer Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Customer (leave empty for walk-in)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingNewCustomer(!isAddingNewCustomer);
                      if (!isAddingNewCustomer) {
                        setFormData(prev => ({ ...prev, customer_id: "" }));
                      }
                    }}
                    className="text-primary"
                  >
                    <UserPlus className="h-4 w-4 mr-1" />
                    {isAddingNewCustomer ? "Select Existing" : "Add New"}
                  </Button>
                </div>

                {isAddingNewCustomer ? (
                  <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/30">
                    <div>
                      <Label className="text-sm">Customer Name *</Label>
                      <Input
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Customer name"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Phone Number *</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newCustomer.phone}
                          onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="e.g., 0771234567"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (newCustomer.name && newCustomer.phone) {
                              createCustomerMutation.mutate(newCustomer);
                            } else {
                              toast({ title: "Please enter name and phone", variant: "destructive" });
                            }
                          }}
                          disabled={createCustomerMutation.isPending}
                        >
                          {createCustomerMutation.isPending ? "..." : "Add"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Select value={formData.customer_id} onValueChange={(v) => setFormData({ ...formData, customer_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Walk-in customer (no selection)" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} - {c.phone}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label>Assigned To</Label>
                <Select value={formData.assigned_to} onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select technician" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Device Type *</Label>
                  <Input
                    value={formData.device_type}
                    onChange={(e) => setFormData({ ...formData, device_type: e.target.value })}
                    placeholder="e.g., Phone, Laptop, TV"
                    required
                  />
                </div>
                <div>
                  <Label>Device Model</Label>
                  <Input
                    value={formData.device_model}
                    onChange={(e) => setFormData({ ...formData, device_model: e.target.value })}
                    placeholder="e.g., iPhone 14 Pro"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>IMEI Number</Label>
                  <Input
                    value={formData.device_imei}
                    onChange={(e) => setFormData({ ...formData, device_imei: e.target.value })}
                    placeholder="IMEI number"
                  />
                </div>
                <div>
                  <Label>Serial Number</Label>
                  <Input
                    value={formData.device_serial_number}
                    onChange={(e) => setFormData({ ...formData, device_serial_number: e.target.value })}
                    placeholder="Serial number"
                  />
                </div>
              </div>

              <div>
                <Label>Device State Before Repair</Label>
                <Textarea
                  value={formData.device_state_before}
                  onChange={(e) => setFormData({ ...formData, device_state_before: e.target.value })}
                  placeholder="Describe the condition of the device..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Fault Description *</Label>
                <Textarea
                  value={formData.fault_description}
                  onChange={(e) => setFormData({ ...formData, fault_description: e.target.value })}
                  placeholder="Describe the problem..."
                  required
                  rows={3}
                />
              </div>

              <div>
                <Label>Diagnosis / Notes</Label>
                <Textarea
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  placeholder="Technician's findings..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
              </div>

              {/* Pricing Section */}
              <div className="grid grid-cols-2 gap-4 p-3 border rounded-lg bg-muted/30">
                <div>
                  <Label className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Total Amount
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Technician Fee
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.technician_fee}
                    onChange={(e) => setFormData({ ...formData, technician_fee: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                <Button type="submit" disabled={saveJobMutation.isPending}>
                  {saveJobMutation.isPending ? "Saving..." : editingJob ? "Update Job" : "Create Job"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Payment Collection Dialog */}
      <Dialog open={!!paymentDialogJob} onOpenChange={(open) => !open && setPaymentDialogJob(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Collect Payment - {paymentDialogJob?.job_ref}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium ml-2">{paymentDialogJob?.total_amount?.toLocaleString() || 0}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Paid:</span>
                <span className="font-medium ml-2">{paymentDialogJob?.amount_paid?.toLocaleString() || 0}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Balance:</span>
                <span className="font-bold ml-2 text-destructive">{paymentDialogJob?.balance_due?.toLocaleString() || 0}</span>
              </div>
            </div>
            <div>
              <Label>Amount to Collect</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
              />
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-xs"
                onClick={() => setPaymentAmount(paymentDialogJob?.balance_due?.toString() || "0")}
              >
                Pay full balance
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPaymentDialogJob(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  const amount = parseFloat(paymentAmount);
                  if (amount > 0) {
                    collectPaymentMutation.mutate({ jobId: paymentDialogJob.id, amount });
                  }
                }}
                disabled={collectPaymentMutation.isPending || !paymentAmount}
              >
                {collectPaymentMutation.isPending ? "..." : "Collect Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Jobs</p>
                <p className="text-2xl font-bold">{jobStats.total}</p>
              </div>
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{jobStats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">{jobStats.inProgress}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-600">{jobStats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Customer Balance</p>
                <p className="text-2xl font-bold text-destructive">{jobStats.totalBalance.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unpaid Tech Fees</p>
                <p className="text-2xl font-bold text-orange-600">{jobStats.unpaidTechFees.toLocaleString()}</p>
              </div>
              <Banknote className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Ref</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Technician</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No jobs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => {
                  const StatusIcon = statusConfig[job.status]?.icon || Clock;
                  const isCompleted = ['completed', 'ready', 'delivered', 'collected'].includes(job.status);
                  return (
                    <TableRow key={job.id}>
                      <TableCell>
                        <div>
                          <p className="font-mono font-medium">{job.job_ref}</p>
                          <Badge className={`${priorityConfig[job.priority]?.color} text-xs`}>
                            {priorityConfig[job.priority]?.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        {job.customers ? (
                          <div>
                            <p className="font-medium">{job.customers.name}</p>
                            <p className="text-sm text-muted-foreground">{job.customers.phone}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Walk-in</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{job.device_type}</p>
                          {job.device_model && <p className="text-sm text-muted-foreground">{job.device_model}</p>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={job.status}
                          onValueChange={(v) => updateStatusMutation.mutate({ jobId: job.id, status: v })}
                        >
                          <SelectTrigger className="w-[130px]">
                            <div className="flex items-center gap-2">
                              <StatusIcon className="h-4 w-4" />
                              <span className="text-xs">{statusConfig[job.status]?.label}</span>
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <config.icon className="h-4 w-4" />
                                  {config.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{job.employees?.full_name || "-"}</p>
                          {job.technician_fee > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Fee:</span>
                              <span>{job.technician_fee.toLocaleString()}</span>
                              {isCompleted && !job.technician_paid && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1 text-xs text-orange-600 hover:text-orange-700"
                                  onClick={() => payTechnicianMutation.mutate(job.id)}
                                >
                                  Pay
                                </Button>
                              )}
                              {job.technician_paid && (
                                <CheckCircle className="h-3 w-3 text-green-500" />
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {job.total_amount?.toLocaleString() || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {job.balance_due > 0 ? (
                          <span className="font-bold text-destructive">{job.balance_due.toLocaleString()}</span>
                        ) : (
                          <span className="text-green-600">Paid</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* Quick Status Advance */}
                          {getNextStatus(job.status) && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => updateStatusMutation.mutate({ jobId: job.id, status: getNextStatus(job.status)! })}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title={`Move to ${statusConfig[getNextStatus(job.status)!]?.label}`}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Print Ticket */}
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => printTicket(job)}
                            className="h-8 w-8"
                            title="Print Ticket"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          {/* Collect Payment */}
                          {job.balance_due > 0 && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setPaymentDialogJob(job)}
                              className="h-8 w-8 text-primary hover:bg-primary/10"
                              title="Collect Payment"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          )}
                          {/* WhatsApp */}
                          {job.customers?.phone && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => openWhatsApp(job)}
                              className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Message on WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(job)}>
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Hidden Ticket for Printing */}
      {printingJob && (
        <div className="fixed left-[-9999px]">
          <JobTicket 
            ref={ticketRef}
            job={printingJob}
            businessName={tenantInfo?.name || "Repair Shop"}
            businessPhone={tenantInfo?.phone}
          />
        </div>
      )}
    </div>
  );
}
