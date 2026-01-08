import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  ArrowLeft, Mail, Phone, MapPin, Calendar, CreditCard, Package, Check, X, 
  Users, Building2, ShoppingBag, Receipt, Banknote, GraduationCap, UserCheck, Clock, Trash2, AlertTriangle
} from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const AdminTenantDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          packages(name, price, currency, validity_days)
        `)
        .eq('id', id!)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ['tenant-payments', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_uploads')
        .select(`
          *,
          packages(name)
        `)
        .eq('tenant_id', id!)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch tenant statistics
  const { data: tenantStats } = useQuery({
    queryKey: ['tenant-stats', id],
    queryFn: async () => {
      if (!id) return null;
      
      const [
        profilesRes,
        employeesRes,
        branchesRes,
        productsRes,
        customersRes,
        salesRes,
        studentsRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id, full_name, role', { count: 'exact' }).eq('tenant_id', id),
        supabase.from('employees').select('id, full_name, role, is_active', { count: 'exact' }).eq('tenant_id', id),
        supabase.from('branches').select('id, name, is_active', { count: 'exact' }).eq('tenant_id', id),
        supabase.from('products').select('id', { count: 'exact' }).eq('tenant_id', id),
        supabase.from('customers').select('id', { count: 'exact' }).eq('tenant_id', id),
        supabase.from('sales').select('id, total_amount, payment_status').eq('tenant_id', id),
        supabase.from('students').select('id, is_active', { count: 'exact' }).eq('tenant_id', id),
      ]);

      const sales = salesRes.data || [];
      const totalSales = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      const paidSales = sales.filter(s => s.payment_status === 'paid').length;

      return {
        users: profilesRes.data || [],
        userCount: profilesRes.count || 0,
        employees: employeesRes.data || [],
        employeeCount: employeesRes.count || 0,
        branches: branchesRes.data || [],
        branchCount: branchesRes.count || 0,
        productCount: productsRes.count || 0,
        customerCount: customersRes.count || 0,
        salesCount: sales.length,
        totalSalesAmount: totalSales,
        paidSalesCount: paidSales,
        students: studentsRes.data || [],
        studentCount: studentsRes.count || 0,
        activeStudents: (studentsRes.data || []).filter(s => s.is_active).length,
      };
    },
    enabled: !!id,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tenants')
        .update({ 
          status: 'active',
          activated_at: new Date().toISOString()
        })
        .eq('id', id!);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Tenant Approved",
        description: "The tenant has been successfully activated.",
      });
      queryClient.invalidateQueries({ queryKey: ['tenant-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['all-tenants'] });
    },
    onError: (error) => {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tenants')
        .update({ status: 'rejected' })
        .eq('id', id!);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Tenant Rejected",
        description: "The tenant application has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ['tenant-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['all-tenants'] });
    },
    onError: (error) => {
      toast({
        title: "Rejection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Trial management state
  const [trialEnabled, setTrialEnabled] = useState(false);
  const [trialDays, setTrialDays] = useState(14);

  useEffect(() => {
    if (tenant) {
      setTrialEnabled(tenant.is_trial || false);
      setTrialDays(tenant.trial_days || 14);
    }
  }, [tenant]);

  // Delete tenant state
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const deleteTenantMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke('delete-tenant', {
        body: { tenantId: id, reason: deleteReason }
      });

      if (response.error) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (data) => {
      toast({
        title: "Tenant Deleted",
        description: data.message || "Tenant data backed up and deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['all-tenants'] });
      navigate('/admin/tenants');
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDeleteTenant = () => {
    deleteTenantMutation.mutate();
    setDeleteDialogOpen(false);
  };

  const trialMutation = useMutation({
    mutationFn: async ({ enabled, days }: { enabled: boolean; days: number }) => {
      const trialEndDate = enabled 
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : null;
      
      const { error } = await supabase
        .from('tenants')
        .update({ 
          is_trial: enabled,
          trial_days: days,
          trial_end_date: trialEndDate,
          status: enabled ? 'active' : tenant?.status,
          activated_at: enabled && !tenant?.activated_at ? new Date().toISOString() : tenant?.activated_at
        })
        .eq('id', id!);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Trial Updated",
        description: trialEnabled ? `Free trial enabled for ${trialDays} days.` : "Free trial disabled.",
      });
      queryClient.invalidateQueries({ queryKey: ['tenant-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['all-tenants'] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTrialSave = () => {
    trialMutation.mutate({ enabled: trialEnabled, days: trialDays });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string, label: string }> = {
      active: { className: "bg-success text-success-foreground", label: "Active" },
      pending: { className: "bg-warning/10 text-warning", label: "Pending" },
      approved: { className: "bg-success text-success-foreground", label: "Approved" },
      rejected: { className: "bg-destructive text-destructive-foreground", label: "Rejected" },
      suspended: { className: "bg-destructive text-destructive-foreground", label: "Suspended" },
    };
    const config = variants[status] || variants.pending;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const isSchool = tenant?.business_type?.toLowerCase().includes('school');

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading tenant details...</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Tenant not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => navigate('/admin/tenants')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Tenants
      </Button>

      {tenant.status === 'pending' && (
        <Card className="mb-6 border-warning">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Pending Approval</p>
                <p className="text-sm text-muted-foreground">Review and approve or reject this tenant application</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => approveMutation.mutate()}
                  disabled={approveMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {tenant.logo_url && (
                  <img 
                    src={tenant.logo_url} 
                    alt={tenant.name} 
                    className="h-16 w-16 rounded-lg object-cover border"
                  />
                )}
                <div>
                  <CardTitle className="text-2xl">{tenant.name}</CardTitle>
                  <CardDescription className="capitalize text-base mt-1">
                    {tenant.business_type || 'Business'}
                  </CardDescription>
                </div>
              </div>
              {getStatusBadge(tenant.status || 'pending')}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{tenant.email || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{tenant.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{tenant.address || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Referral Code</p>
                  <p className="font-medium font-mono">{tenant.referral_code || 'N/A'}</p>
                </div>
              </div>
              {tenant.referred_by_code && (
                <div className="flex items-start gap-3">
                  <UserCheck className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Referred By</p>
                    <p className="font-medium font-mono">{tenant.referred_by_code}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Package</p>
              <p className="font-medium text-lg">{tenant.packages?.name || 'No package'}</p>
            </div>
            {tenant.packages?.price && (
              <div>
                <p className="text-sm text-muted-foreground">Package Price</p>
                <p className="font-medium">{formatCurrency(tenant.packages.price)}</p>
              </div>
            )}
            {tenant.activated_at && (
              <div>
                <p className="text-sm text-muted-foreground">Activated</p>
                <p className="font-medium">
                  {new Date(tenant.activated_at).toLocaleDateString()}
                </p>
              </div>
            )}
            {tenant.expires_at && (
              <div>
                <p className="text-sm text-muted-foreground">Expires</p>
                <p className="font-medium">
                  {new Date(tenant.expires_at).toLocaleDateString()}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Registered</p>
              <p className="font-medium">
                {new Date(tenant.created_at || '').toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Free Trial Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Free Trial
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="trial-toggle">Enable Trial</Label>
                <p className="text-xs text-muted-foreground">Grant free access</p>
              </div>
              <Switch
                id="trial-toggle"
                checked={trialEnabled}
                onCheckedChange={setTrialEnabled}
              />
            </div>
            
            {trialEnabled && (
              <div className="space-y-2">
                <Label htmlFor="trial-days">Trial Duration (days)</Label>
                <Input
                  id="trial-days"
                  type="number"
                  min={1}
                  max={365}
                  value={trialDays}
                  onChange={(e) => setTrialDays(Number(e.target.value))}
                />
              </div>
            )}

            {tenant.is_trial && tenant.trial_end_date && (
              <div className="p-2 rounded bg-muted">
                <p className="text-xs text-muted-foreground">Trial ends</p>
                <p className="font-medium text-sm">
                  {new Date(tenant.trial_end_date).toLocaleDateString()}
                </p>
              </div>
            )}

            <Button 
              onClick={handleTrialSave}
              disabled={trialMutation.isPending}
              className="w-full"
              size="sm"
            >
              {trialMutation.isPending ? "Saving..." : "Save Trial Settings"}
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone - Delete Tenant */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Permanently delete this tenant and all associated data. A backup will be created before deletion.
            </p>
            
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Tenant
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    Delete Tenant: {tenant.name}
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-4">
                      <p>
                        This action will permanently delete the tenant and all associated data including:
                      </p>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>All user accounts ({tenantStats?.userCount || 0} users)</li>
                        <li>All employees ({tenantStats?.employeeCount || 0} records)</li>
                        <li>All products ({tenantStats?.productCount || 0} items)</li>
                        <li>All sales and transactions ({tenantStats?.salesCount || 0} records)</li>
                        {isSchool && <li>All students ({tenantStats?.studentCount || 0} records)</li>}
                        <li>All other business data</li>
                      </ul>
                      <p className="font-medium">
                        A backup will be created before deletion.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="delete-reason">Reason for deletion (optional)</Label>
                        <Textarea
                          id="delete-reason"
                          placeholder="Enter reason for deleting this tenant..."
                          value={deleteReason}
                          onChange={(e) => setDeleteReason(e.target.value)}
                        />
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteTenant}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteTenantMutation.isPending}
                  >
                    {deleteTenantMutation.isPending ? "Deleting..." : "Delete Permanently"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs">Users</span>
            </div>
            <p className="text-2xl font-bold">{tenantStats?.userCount || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="h-4 w-4" />
              <span className="text-xs">Branches</span>
            </div>
            <p className="text-2xl font-bold">{tenantStats?.branchCount || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ShoppingBag className="h-4 w-4" />
              <span className="text-xs">Products</span>
            </div>
            <p className="text-2xl font-bold">{tenantStats?.productCount || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Receipt className="h-4 w-4" />
              <span className="text-xs">Sales</span>
            </div>
            <p className="text-2xl font-bold">{tenantStats?.salesCount || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Banknote className="h-4 w-4" />
              <span className="text-xs">Revenue</span>
            </div>
            <p className="text-lg font-bold">{formatCurrency(tenantStats?.totalSalesAmount || 0)}</p>
          </CardContent>
        </Card>
        {isSchool && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <GraduationCap className="h-4 w-4" />
                <span className="text-xs">Students</span>
              </div>
              <p className="text-2xl font-bold">{tenantStats?.studentCount || 0}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Users and Employees */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              System Users
            </CardTitle>
            <CardDescription>Users with login access</CardDescription>
          </CardHeader>
          <CardContent>
            {!tenantStats?.users || tenantStats.users.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No users found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantStats.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{user.role || 'user'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employees
            </CardTitle>
            <CardDescription>Staff members</CardDescription>
          </CardHeader>
          <CardContent>
            {!tenantStats?.employees || tenantStats.employees.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No employees found</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tenantStats.employees.slice(0, 5).map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.full_name}</TableCell>
                      <TableCell className="capitalize">{emp.role}</TableCell>
                      <TableCell>
                        <Badge variant={emp.is_active ? "default" : "secondary"}>
                          {emp.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {(tenantStats?.employeeCount || 0) > 5 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                +{tenantStats!.employeeCount - 5} more employees
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Branches */}
      {(tenantStats?.branchCount || 0) > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Branches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenantStats?.branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium">{branch.name}</TableCell>
                    <TableCell>
                      <Badge variant={branch.is_active ? "default" : "secondary"}>
                        {branch.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>
            All payment submissions for this tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!payments || payments.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No payments found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Transaction Ref</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{payment.packages?.name}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell className="capitalize">{payment.payment_method}</TableCell>
                    <TableCell className="font-mono text-sm">{payment.transaction_ref || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(payment.status || 'pending')}</TableCell>
                    <TableCell>
                      {new Date(payment.created_at || '').toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTenantDetails;
