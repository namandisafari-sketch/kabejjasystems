// File: src/pages/business/Customers.tsx
// MOBILE-FIRST RESPONSIVE DESIGN

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
import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, Users, Search, Edit, Trash2, Banknote, AlertCircle, History, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [paymentCustomer, setPaymentCustomer] = useState<any>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
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

  const { data: payments } = useQuery({
    queryKey: ['customer-payments', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('customer_payments')
        .select(`*, customers (name)`)
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

  const formatCompact = (amount: number) => {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1) + 'M';
    } else if (amount >= 1000) {
      return (amount / 1000).toFixed(0) + 'K';
    }
    return amount.toString();
  };

  const CustomerForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
          className="mt-1.5 h-11"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="mt-1.5 h-11"
          />
        </div>
        <div>
          <Label htmlFor="credit_limit">Credit Limit</Label>
          <Input
            id="credit_limit"
            type="number"
            min="0"
            value={formData.credit_limit}
            onChange={(e) => setFormData(prev => ({ ...prev, credit_limit: e.target.value }))}
            className="mt-1.5 h-11"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          className="mt-1.5 h-11"
        />
      </div>

      <div>
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          rows={2}
          className="mt-1.5"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setIsDialogOpen(false);
            setEditingCustomer(null);
            resetForm();
          }}
          className="flex-1 h-11"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saveCustomerMutation.isPending} className="flex-1 h-11">
          {saveCustomerMutation.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );

  const CustomerCard = ({ customer, showBalance = false }: { customer: any; showBalance?: boolean }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{customer.name}</p>
          {showBalance && (customer.current_balance || 0) > 0 && (
            <Badge variant="destructive" className="text-xs">
              {formatCompact(customer.current_balance)} UGX
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {customer.phone || customer.email || 'No contact info'}
        </p>
        {showBalance && customer.credit_limit > 0 && (
          <p className="text-xs text-muted-foreground">
            Limit: {formatCompact(customer.credit_limit)} UGX
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 ml-2">
        {(customer.current_balance || 0) > 0 && (
          <Button
            size="sm"
            variant="default"
            onClick={() => handleCollectPayment(customer)}
            className="h-8 px-2"
          >
            <Banknote className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleEdit(customer)}
          className="h-8 w-8 p-0"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            if (confirm('Delete this customer?')) {
              deleteCustomerMutation.mutate(customer.id);
            }
          }}
          className="h-8 w-8 p-0 text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Customers</h1>
            <p className="text-xs text-muted-foreground">{customers?.length || 0} total</p>
          </div>
          <Button onClick={() => setIsDialogOpen(true)} size={isMobile ? "icon" : "default"}>
            <Plus className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Add Customer</span>}
          </Button>
        </div>
      </header>

      {/* ADD/EDIT CUSTOMER DRAWER/DIALOG */}
      {isMobile ? (
        <Drawer open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingCustomer(null);
            resetForm();
          }
        }}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</DrawerTitle>
            </DrawerHeader>
            <div className="p-4">
              <CustomerForm />
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingCustomer(null);
            resetForm();
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? "Edit Customer" : "Add Customer"}</DialogTitle>
              <DialogDescription>Fill in the customer details</DialogDescription>
            </DialogHeader>
            <CustomerForm />
          </DialogContent>
        </Dialog>
      )}

      {/* MAIN CONTENT */}
      <div className="p-4 space-y-4">
        {/* STATS CARDS */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col">
                <Users className="h-4 w-4 text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{customers?.length || 0}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col">
                <AlertCircle className="h-4 w-4 text-destructive mb-1" />
                <p className="text-xs text-muted-foreground">With Balance</p>
                <p className="text-lg font-bold">{customersWithBalance.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col">
                <Banknote className="h-4 w-4 text-destructive mb-1" />
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-lg font-bold text-destructive">{formatCompact(totalOutstanding)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SEARCH */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="credit" className="text-xs">
              Credit
              {customersWithBalance.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs px-1">
                  {customersWithBalance.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs">
              <History className="h-3 w-3 mr-1" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {filteredCustomers?.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No customers found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCustomers?.map((customer) => (
                  <CustomerCard key={customer.id} customer={customer} showBalance />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="credit" className="mt-4">
            {customersWithBalance.length === 0 ? (
              <div className="text-center py-12">
                <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No outstanding balances</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customersWithBalance.map((customer) => (
                  <CustomerCard key={customer.id} customer={customer} showBalance />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            {!payments || payments.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No payment history</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{payment.customers?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.payment_date), 'dd MMM yyyy')} • {payment.payment_method}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">+{Number(payment.amount).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">UGX</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Collect Payment Dialog */}
      {paymentCustomer && profile?.tenant_id && (
        <CollectPaymentDialog
          open={showPaymentDialog}
          onOpenChange={setShowPaymentDialog}
          customer={paymentCustomer}
          tenantId={profile.tenant_id}
        />
      )}
    </div>
  );
};

export default Customers;
