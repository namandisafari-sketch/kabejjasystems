import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Package, Plus, Eye, CreditCard, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const AdminInstallations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInstallation, setSelectedInstallation] = useState<any>(null);
  
  const [newOrder, setNewOrder] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    business_name: "",
    business_type: "",
    selected_subscription_id: "",
    payment_plan: "3_installments",
    deposit_amount: 317000,
    notes: "",
  });

  const [newPayment, setNewPayment] = useState({
    amount: 0,
    payment_method: "cash",
    notes: "",
  });

  const { data: installations, isLoading } = useQuery({
    queryKey: ['installation-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installation_purchases')
        .select(`
          *,
          selected_subscription:packages!installation_purchases_selected_subscription_id_fkey(name, price),
          payments:installation_payments(*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: subscriptionPackages } = useQuery({
    queryKey: ['subscription-packages-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('is_active', true)
        .eq('package_type', 'subscription')
        .order('price', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (order: typeof newOrder) => {
      const { data, error } = await supabase
        .from('installation_purchases')
        .insert({
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          customer_email: order.customer_email || null,
          business_name: order.business_name,
          business_type: order.business_type,
          selected_subscription_id: order.selected_subscription_id || null,
          payment_plan: order.payment_plan,
          deposit_amount: order.deposit_amount,
          total_amount: 950000,
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Order Created", description: "Installation order created successfully" });
      setShowAddDialog(false);
      setNewOrder({
        customer_name: "",
        customer_phone: "",
        customer_email: "",
        business_name: "",
        business_type: "",
        selected_subscription_id: "",
        payment_plan: "3_installments",
        deposit_amount: 317000,
        notes: "",
      });
      queryClient.invalidateQueries({ queryKey: ['installation-orders'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: async ({ installationId, payment }: { installationId: string; payment: typeof newPayment }) => {
      const installation = installations?.find(i => i.id === installationId);
      if (!installation) throw new Error("Installation not found");

      const paymentCount = installation.payments?.length || 0;
      
      // Insert payment
      const { error: paymentError } = await supabase
        .from('installation_payments')
        .insert({
          installation_id: installationId,
          amount: payment.amount,
          payment_method: payment.payment_method,
          installment_number: paymentCount + 1,
          notes: payment.notes || null,
        });
      
      if (paymentError) throw paymentError;

      // Update installation amount_paid and status
      const newAmountPaid = (installation.amount_paid || 0) + payment.amount;
      let newStatus = installation.status;
      
      if (newAmountPaid >= installation.total_amount) {
        newStatus = 'fully_paid';
      } else if (newAmountPaid > 0) {
        newStatus = paymentCount === 0 ? 'deposit_paid' : 'partially_paid';
      }

      const { error: updateError } = await supabase
        .from('installation_purchases')
        .update({ 
          amount_paid: newAmountPaid,
          status: newStatus,
        })
        .eq('id', installationId);
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast({ title: "Payment Recorded", description: "Payment added successfully" });
      setShowPaymentDialog(false);
      setSelectedInstallation(null);
      setNewPayment({ amount: 0, payment_method: "cash", notes: "" });
      queryClient.invalidateQueries({ queryKey: ['installation-orders'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('installation_purchases')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Status Updated" });
      queryClient.invalidateQueries({ queryKey: ['installation-orders'] });
    },
  });

  const filteredInstallations = installations?.filter(order =>
    order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customer_phone?.includes(searchTerm)
  );

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-warning/10 text-warning border-warning/20",
      deposit_paid: "bg-info/10 text-info border-info/20",
      partially_paid: "bg-accent/10 text-accent border-accent/20",
      fully_paid: "bg-success/10 text-success border-success/20",
      installed: "bg-primary/10 text-primary border-primary/20",
      active: "bg-success/10 text-success border-success/20",
      refunded: "bg-destructive/10 text-destructive border-destructive/20",
      cancelled: "bg-muted text-muted-foreground border-muted",
    };
    return (
      <Badge variant="outline" className={styles[status] || styles.pending}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(amount);

  const stats = {
    total: installations?.length || 0,
    pending: installations?.filter(i => i.status === 'pending').length || 0,
    inProgress: installations?.filter(i => ['deposit_paid', 'partially_paid'].includes(i.status)).length || 0,
    completed: installations?.filter(i => ['fully_paid', 'installed', 'active'].includes(i.status)).length || 0,
    totalRevenue: installations?.reduce((sum, i) => sum + (i.amount_paid || 0), 0) || 0,
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Installation Orders</h1>
          <p className="text-muted-foreground">Manage installation package purchases and payments</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Installation Order</DialogTitle>
              <DialogDescription>Add a new installation package order</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input
                  value={newOrder.customer_name}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, customer_name: e.target.value }))}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone *</Label>
                <Input
                  value={newOrder.customer_phone}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, customer_phone: e.target.value }))}
                  placeholder="0700000000"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newOrder.customer_email}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, customer_email: e.target.value }))}
                  placeholder="email@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Business Name *</Label>
                <Input
                  value={newOrder.business_name}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, business_name: e.target.value }))}
                  placeholder="Business name"
                />
              </div>
              <div className="space-y-2">
                <Label>Business Type *</Label>
                <Select
                  value={newOrder.business_type}
                  onValueChange={(value) => setNewOrder(prev => ({ ...prev, business_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail Shop</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="kindergarten">Kindergarten/ECD</SelectItem>
                    <SelectItem value="primary_school">Primary School</SelectItem>
                    <SelectItem value="secondary_school">Secondary School</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Starting Subscription</Label>
                <Select
                  value={newOrder.selected_subscription_id}
                  onValueChange={(value) => setNewOrder(prev => ({ ...prev, selected_subscription_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    {subscriptionPackages?.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name} - {formatCurrency(pkg.price)}/month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Plan</Label>
                <Select
                  value={newOrder.payment_plan}
                  onValueChange={(value) => setNewOrder(prev => ({ ...prev, payment_plan: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Payment</SelectItem>
                    <SelectItem value="2_installments">2 Installments (50% each)</SelectItem>
                    <SelectItem value="3_installments">3 Installments (33% each)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button 
                onClick={() => createOrderMutation.mutate(newOrder)}
                disabled={!newOrder.customer_name || !newOrder.customer_phone || !newOrder.business_name || !newOrder.business_type}
              >
                Create Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-warning">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">In Progress</p>
            <p className="text-2xl font-bold text-info">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-2xl font-bold text-success">{formatCurrency(stats.totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Installation Orders
              </CardTitle>
              <CardDescription>Track installation package purchases</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !filteredInstallations?.length ? (
            <div className="text-center py-8 text-muted-foreground">No installation orders yet</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInstallations.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.business_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{order.business_type}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.selected_subscription?.name || 'Not selected'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatCurrency(order.amount_paid || 0)}</p>
                          <p className="text-xs text-muted-foreground">of {formatCurrency(order.total_amount)}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedInstallation(order);
                            setNewPayment({
                              amount: Math.ceil((order.total_amount - (order.amount_paid || 0)) / (order.payment_plan === '3_installments' ? 2 : 1)),
                              payment_method: "cash",
                              notes: "",
                            });
                            setShowPaymentDialog(true);
                          }}
                          disabled={order.status === 'fully_paid' || order.status === 'refunded'}
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                        {order.status === 'fully_paid' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'installed' })}
                          >
                            Mark Installed
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {selectedInstallation && (
                <>
                  For {selectedInstallation.customer_name} - {selectedInstallation.business_name}
                  <br />
                  Balance: {formatCurrency(selectedInstallation.total_amount - (selectedInstallation.amount_paid || 0))}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount *</Label>
              <Input
                type="number"
                value={newPayment.amount}
                onChange={(e) => setNewPayment(prev => ({ ...prev, amount: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={newPayment.payment_method}
                onValueChange={(value) => setNewPayment(prev => ({ ...prev, payment_method: value }))}
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
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newPayment.notes}
                onChange={(e) => setNewPayment(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button 
              onClick={() => selectedInstallation && addPaymentMutation.mutate({ 
                installationId: selectedInstallation.id, 
                payment: newPayment 
              })}
              disabled={!newPayment.amount || newPayment.amount <= 0}
            >
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInstallations;