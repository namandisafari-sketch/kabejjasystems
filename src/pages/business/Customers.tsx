import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users, Search, Edit, Trash2, Banknote, AlertCircle, History } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { CollectPaymentDialog } from "@/components/customers/CollectPaymentDialog";
import { format } from "date-fns";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional(),
  address: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  credit_limit: z.number().min(0).default(0),
});

const Customers = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    credit_limit: "0",
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      return data;
    },
  });

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const { data: payments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['customer-payments', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('customer_payments')
        .select(`
          *,
          customers (name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.tenant_id,
  });

  const filteredCustomers = customers?.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const customersWithBalance = filteredCustomers?.filter(c => (c.current_balance || 0) > 0) || [];
  const totalOutstanding = customers?.reduce((sum, c) => sum + (c.current_balance || 0), 0) || 0;

  const saveCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const validated = customerSchema.parse({
        ...data,
        email: data.email || undefined,
        credit_limit: parseFloat(data.credit_limit) || 0,
      });

      const payload = {
        name: validated.name,
        email: validated.email || null,
        phone: validated.phone || null,
        address: validated.address || null,
        notes: validated.notes || null,
        credit_limit: validated.credit_limit,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(payload)
          .eq('id', editingCustomer.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([{
            ...payload,
            tenant_id: profile!.tenant_id,
            created_by: user.id,
            current_balance: 0,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsDialogOpen(false);
      setEditingCustomer(null);
      resetForm();
      toast({
        title: editingCustomer ? "Customer Updated" : "Customer Created",
        description: "Customer has been saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: "Customer Deleted",
        description: "Customer has been removed",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      notes: "",
      credit_limit: "0",
    });
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      notes: customer.notes || "",
      credit_limit: (customer.credit_limit || 0).toString(),
    });
    setIsDialogOpen(true);
  };

  const handleCollectPayment = (customer: any) => {
    setPaymentCustomer(customer);
    setShowPaymentDialog(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveCustomerMutation.mutate(formData);
  };

  const CustomerTable = ({ data, showBalance = false }: { data: any[]; showBalance?: boolean }) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            {showBalance && <TableHead>Credit Limit</TableHead>}
            {showBalance && <TableHead>Balance</TableHead>}
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{customer.name}</p>
                  {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
                </div>
              </TableCell>
              <TableCell>{customer.phone || '-'}</TableCell>
              {showBalance && (
                <TableCell>{(customer.credit_limit || 0).toLocaleString()} UGX</TableCell>
              )}
              {showBalance && (
                <TableCell>
                  {(customer.current_balance || 0) > 0 ? (
                    <Badge variant="destructive">
                      {(customer.current_balance || 0).toLocaleString()} UGX
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Paid</Badge>
                  )}
                </TableCell>
              )}
              <TableCell className="text-right">
                {(customer.current_balance || 0) > 0 && (
                  <Button
                    size="sm"
                    variant="default"
                    className="mr-2"
                    onClick={() => handleCollectPayment(customer)}
                  >
                    <Banknote className="h-4 w-4 mr-1" />
                    Collect
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(customer)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this customer?')) {
                      deleteCustomerMutation.mutate(customer.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground">Manage your customer database and credit accounts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingCustomer(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
              <DialogDescription>
                Fill in the customer details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="credit_limit">Credit Limit (UGX)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  min="0"
                  value={formData.credit_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum amount this customer can owe. Set to 0 to disable credit.
                </p>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingCustomer(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saveCustomerMutation.isPending}>
                  {saveCustomerMutation.isPending ? "Saving..." : "Save Customer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{customers?.length || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">With Outstanding Balance</p>
                <p className="text-2xl font-bold">{customersWithBalance.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold text-destructive">{totalOutstanding.toLocaleString()} UGX</p>
              </div>
              <Banknote className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Customer List</CardTitle>
              <CardDescription>{filteredCustomers?.length || 0} customers</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Customers</TabsTrigger>
              <TabsTrigger value="credit">
                Credit Accounts
                {customersWithBalance.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{customersWithBalance.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="payments">
                <History className="h-4 w-4 mr-1" />
                Payment History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="all">
              {isLoading ? (
                <p>Loading customers...</p>
              ) : filteredCustomers?.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No customers found</p>
                </div>
              ) : (
                <CustomerTable data={filteredCustomers || []} showBalance />
              )}
            </TabsContent>
            
            <TabsContent value="credit">
              {customersWithBalance.length === 0 ? (
                <div className="text-center py-12">
                  <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No outstanding balances</p>
                </div>
              ) : (
                <CustomerTable data={customersWithBalance} showBalance />
              )}
            </TabsContent>

            <TabsContent value="payments">
              {paymentsLoading ? (
                <p>Loading payments...</p>
              ) : payments?.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No payment history yet</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments?.map((payment: any) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            {payment.payment_date 
                              ? format(new Date(payment.payment_date), 'MMM dd, yyyy HH:mm')
                              : '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {payment.customers?.name || 'Unknown'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              +{payment.amount.toLocaleString()} UGX
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize">
                            {payment.payment_method || '-'}
                          </TableCell>
                          <TableCell>
                            {payment.reference_number || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground max-w-[200px] truncate">
                            {payment.notes || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CollectPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        customer={paymentCustomer}
        tenantId={profile?.tenant_id || ""}
      />
    </div>
  );
};

export default Customers;
