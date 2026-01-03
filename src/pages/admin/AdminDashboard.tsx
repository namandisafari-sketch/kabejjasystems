import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { db } from "@/hooks/use-database";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Users, Package, TrendingUp, DollarSign } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AdminDashboard = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");

  const { data: pendingPayments, isLoading } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: async () => {
      const { data, error } = await db
        .from('payment_uploads')
        .select(`
          *,
          tenants(name, business_type, email),
          packages(name, price, currency),
          profiles!payment_uploads_uploader_id_fkey(full_name, phone)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [tenants, payments, pendingCount, approvedPayments] = await Promise.all([
        db.from('tenants').select('id', { count: 'exact' }),
        db.from('payment_uploads').select('id', { count: 'exact' }),
        db.from('payment_uploads').select('id', { count: 'exact' }).eq('status', 'pending'),
        db.from('payment_uploads').select('amount').eq('status', 'approved'),
      ]);
      
      const totalRevenue = approvedPayments.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      
      return {
        totalTenants: tenants.count || 0,
        totalPayments: payments.count || 0,
        pendingPayments: pendingCount.count || 0,
        totalRevenue,
      };
    },
  });

  const { data: chartData } = useQuery({
    queryKey: ['admin-chart-data'],
    queryFn: async () => {
      // Get signups over last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: tenantsData } = await db
        .from('tenants')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString());
      
      const { data: paymentsData } = await db
        .from('payment_uploads')
        .select('created_at, amount, status')
        .eq('status', 'approved')
        .gte('created_at', sevenDaysAgo.toISOString());
      
      // Group by date
      const dateMap = new Map();
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        dateMap.set(dateStr, { date: dateStr, signups: 0, revenue: 0 });
      }
      
      tenantsData?.forEach(t => {
        const dateStr = t.created_at.split('T')[0];
        if (dateMap.has(dateStr)) {
          dateMap.get(dateStr).signups++;
        }
      });
      
      paymentsData?.forEach(p => {
        const dateStr = p.created_at.split('T')[0];
        if (dateMap.has(dateStr)) {
          dateMap.get(dateStr).revenue += Number(p.amount);
        }
      });
      
      return Array.from(dateMap.values());
    },
  });

  const approvePaymentMutation = useMutation({
    mutationFn: async ({ paymentId, tenantId }: { paymentId: string; tenantId: string }) => {
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: paymentError } = await db
        .from('payment_uploads')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;

      const { error: tenantError } = await db
        .from('tenants')
        .update({
          status: 'active',
          activated_at: new Date().toISOString(),
        })
        .eq('id', tenantId);

      if (tenantError) throw tenantError;

      return { paymentId, tenantId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-chart-data'] });
      setSelectedPayment(null);
      setAdminNotes("");
      toast({
        title: "Payment Approved",
        description: "Tenant account has been activated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await db
        .from('payment_uploads')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq('id', paymentId);

      if (error) throw error;
      return paymentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setSelectedPayment(null);
      setAdminNotes("");
      toast({
        title: "Payment Rejected",
        description: "Tenant will be notified to resubmit",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tenants
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTenants || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payments
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPayments || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Reviews
            </CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats?.pendingPayments || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {new Intl.NumberFormat('en-UG', {
                style: 'currency',
                currency: 'UGX',
                maximumFractionDigits: 0,
              }).format(stats?.totalRevenue || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last 7 Days Summary Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Last 7 Days Summary</CardTitle>
          <CardDescription>Signups and revenue overview</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-center">Signups</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartData?.map((row) => (
                <TableRow key={row.date}>
                  <TableCell className="font-medium">
                    {new Date(row.date).toLocaleDateString('en-UG', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={row.signups > 0 ? "default" : "secondary"}>
                      {row.signups}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium text-success">
                    {new Intl.NumberFormat('en-UG', {
                      style: 'currency',
                      currency: 'UGX',
                      maximumFractionDigits: 0,
                    }).format(row.revenue)}
                  </TableCell>
                </TableRow>
              ))}
              {/* Totals Row */}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>Total</TableCell>
                <TableCell className="text-center">
                  {chartData?.reduce((sum, row) => sum + row.signups, 0) || 0}
                </TableCell>
                <TableCell className="text-right text-success">
                  {new Intl.NumberFormat('en-UG', {
                    style: 'currency',
                    currency: 'UGX',
                    maximumFractionDigits: 0,
                  }).format(chartData?.reduce((sum, row) => sum + row.revenue, 0) || 0)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Payments Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Approval Queue</CardTitle>
          <CardDescription>Review and approve pending payment submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading payments...</p>
          ) : pendingPayments?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending payments</p>
          ) : (
            <div className="space-y-4">
              {pendingPayments?.map((payment) => (
                <Card key={payment.id} className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{payment.tenants?.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">
                          {payment.tenants?.business_type}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-warning/10 text-warning">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Package</p>
                        <p className="font-medium">{payment.packages?.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="font-medium">
                          {new Intl.NumberFormat('en-UG', {
                            style: 'currency',
                            currency: payment.currency,
                            maximumFractionDigits: 0,
                          }).format(payment.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Method</p>
                        <p className="font-medium">{payment.payment_method}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Transaction Ref</p>
                        <p className="font-medium">{payment.transaction_ref}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Contact</p>
                        <p className="font-medium">{payment.tenants?.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Submitted</p>
                        <p className="font-medium">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {selectedPayment?.id === payment.id ? (
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Add admin notes (optional)"
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setSelectedPayment(null);
                              setAdminNotes("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => rejectPaymentMutation.mutate(payment.id)}
                            disabled={rejectPaymentMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                          <Button
                            className="bg-success hover:bg-success/90"
                            onClick={() =>
                              approvePaymentMutation.mutate({
                                paymentId: payment.id,
                                tenantId: payment.tenant_id,
                              })
                            }
                            disabled={approvePaymentMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve & Activate
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button onClick={() => setSelectedPayment(payment)}>
                        Review Payment
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
