import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/hooks/use-database";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Users, Package } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (profile?.role !== 'superadmin' && profile?.role !== 'admin') {
        toast({
          title: "Access Denied",
          description: "You don't have admin permissions",
          variant: "destructive",
        });
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      navigate('/login');
    }
  };

  const { data: pendingPayments, isLoading } = useQuery({
    queryKey: ['pending-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
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
      const [tenants, payments, pendingCount] = await Promise.all([
        supabase.from('tenants').select('id', { count: 'exact' }),
        supabase.from('payment_uploads').select('id', { count: 'exact' }),
        supabase.from('payment_uploads').select('id', { count: 'exact' }).eq('status', 'pending'),
      ]);
      
      return {
        totalTenants: tenants.count || 0,
        totalPayments: payments.count || 0,
        pendingPayments: pendingCount.count || 0,
      };
    },
  });

  const approvePaymentMutation = useMutation({
    mutationFn: async ({ paymentId, tenantId }: { paymentId: string; tenantId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update payment status
      const { error: paymentError } = await supabase
        .from('payment_uploads')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
        })
        .eq('id', paymentId);

      if (paymentError) throw paymentError;

      // Activate tenant
      const { error: tenantError } = await supabase
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Kabejja Biz Track</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
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
        </div>

        {/* Pending Payments Queue */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Approval Queue</CardTitle>
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
      </main>
    </div>
  );
};

export default Admin;