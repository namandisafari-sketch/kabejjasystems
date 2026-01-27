import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Building2, Users, FileText, Wallet, Wrench, AlertTriangle, TrendingUp, Home, Copy, Key, 
  UserPlus, DoorOpen, ClipboardCheck, TrendingDown, CheckCircle2, XCircle, BarChart3, AlertCircle
} from "lucide-react";
import { format, addDays, isAfter, isBefore, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function RentalDashboard() {
  const { data: tenantData } = useTenant();
  const navigate = useNavigate();
  const tenantId = tenantData?.tenantId;
  const [activeTab, setActiveTab] = useState("overview");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const { data: properties = [] } = useQuery({
    queryKey: ['rental-properties', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_properties')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const { data: units = [] } = useQuery({
    queryKey: ['rental-units', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_units')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ['rental-tenants', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_tenants')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('status', 'active');
      if (error) throw error;
      return data;
    }
  });

  const { data: leases = [] } = useQuery({
    queryKey: ['leases', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leases')
        .select('*, rental_units(unit_number, monthly_rent), rental_tenants(full_name, phone)')
        .eq('tenant_id', tenantId!);
      if (error) throw error;
      return data;
    }
  });

  const activeLeases = leases.filter(l => l.status === 'active');

  // Get current month payments
  const currentMonthStart = startOfMonth(new Date()).toISOString();
  const currentMonthEnd = endOfMonth(new Date()).toISOString();

  const { data: monthlyPayments = [] } = useQuery({
    queryKey: ['rental-payments-current-month', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rental_payments')
        .select('*, leases(rental_tenants(full_name), rental_units(unit_number))')
        .eq('tenant_id', tenantId!)
        .gte('payment_date', currentMonthStart.split('T')[0])
        .lte('payment_date', currentMonthEnd.split('T')[0]);
      if (error) throw error;
      return data;
    }
  });

  // Get losses (leases marked as loss)
  const { data: losses = [] } = useQuery({
    queryKey: ['rental-losses', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leases')
        .select('*, rental_units(unit_number), rental_tenants(full_name, phone)')
        .eq('tenant_id', tenantId!)
        .eq('marked_as_loss', true)
        .order('loss_marked_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: maintenanceRequests = [] } = useQuery({
    queryKey: ['maintenance-open', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_requests')
        .select('*, rental_units(unit_number)')
        .eq('tenant_id', tenantId!)
        .in('status', ['open', 'in_progress', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    }
  });

  // Calculate metrics
  const occupiedUnits = units.filter(u => u.status === 'occupied').length;
  const availableUnits = units.filter(u => u.status === 'available').length;
  const occupancyRate = units.length > 0 ? ((occupiedUnits / units.length) * 100).toFixed(1) : 0;
  
  // Monthly financials
  const totalCollected = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const expectedMonthlyRent = activeLeases.reduce((sum, l) => sum + Number(l.monthly_rent), 0);
  const totalUncollected = Math.max(0, expectedMonthlyRent - totalCollected);
  const collectionRate = expectedMonthlyRent > 0 ? ((totalCollected / expectedMonthlyRent) * 100).toFixed(1) : 0;

  // Calculate outstanding balances per tenant
  const tenantsWithBalances = activeLeases.map(lease => {
    // Calculate months since lease start
    const startDate = new Date(lease.start_date);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()) + 1;
    const totalExpected = monthsDiff * Number(lease.monthly_rent);
    
    // Get total paid for this lease
    const paidAmount = monthlyPayments
      .filter(p => p.lease_id === lease.id)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    
    const balance = totalExpected - paidAmount;
    
    return {
      ...lease,
      tenantName: (lease.rental_tenants as any)?.full_name || 'Unknown',
      tenantPhone: (lease.rental_tenants as any)?.phone || '',
      unitNumber: (lease.rental_units as any)?.unit_number || '',
      monthlyRent: Number(lease.monthly_rent),
      totalPaid: paidAmount,
      balance: Math.max(0, balance),
      outstandingBalance: Number(lease.outstanding_balance) || 0, // From lease record
    };
  }).filter(t => t.balance > 0 || t.outstandingBalance > 0).sort((a, b) => b.balance - a.balance);

  // Total losses
  const totalLosses = losses.reduce((sum, l) => sum + Number(l.outstanding_balance || 0), 0);

  // Leases expiring within 30 days
  const expiringLeases = activeLeases.filter(l => {
    const endDate = new Date(l.end_date);
    const thirtyDaysFromNow = addDays(new Date(), 30);
    return isAfter(endDate, new Date()) && isBefore(endDate, thirtyDaysFromNow);
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const copyPropertyCode = () => {
    if (tenantData?.businessCode) {
      navigator.clipboard.writeText(tenantData.businessCode);
      toast.success("Property code copied to clipboard");
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Rental Dashboard</h1>
          <p className="text-muted-foreground">Overview of your property portfolio</p>
        </div>
        {/* Property Code Display */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <Key className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Property Code for Renter Portal</p>
            <p className="font-mono font-bold text-lg tracking-wider">{tenantData?.businessCode || '------'}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={copyPropertyCode} title="Copy property code">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs for Dashboard sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="collections">Collections & Dues</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* How to Enroll a Renter - Quick Guide */}
          <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-primary" />
                How to Enroll a Renter
              </CardTitle>
              <CardDescription className="text-xs">
                Follow these steps to give a renter access to the portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                <button
                  onClick={() => navigate('/business/rental/tenants')}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background hover:bg-accent transition-colors text-left"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserPlus className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">1. Add Tenant</p>
                    <p className="text-xs text-muted-foreground">Create tenant profile with a 4-digit access PIN</p>
                  </div>
                </button>
                <button
                  onClick={() => navigate('/business/rental/leases')}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background hover:bg-accent transition-colors text-left"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">2. Create Lease</p>
                    <p className="text-xs text-muted-foreground">Link the tenant to a unit with a lease agreement</p>
                  </div>
                </button>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <DoorOpen className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-emerald-700 dark:text-emerald-400">3. Share Access</p>
                    <p className="text-xs text-muted-foreground">Give renter: Property Code + Unit Number + PIN</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-300">Properties</CardTitle>
                <Building2 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{properties.length}</div>
                <p className="text-xs text-blue-600 dark:text-blue-400">{units.length} total units</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Occupancy Rate</CardTitle>
                <Home className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{occupancyRate}%</div>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">{occupiedUnits} occupied / {availableUnits} available</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-300">Active Tenants</CardTitle>
                <Users className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{tenants.length}</div>
                <p className="text-xs text-purple-600 dark:text-purple-400">{activeLeases.length} active leases</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">This Month</CardTitle>
                <Wallet className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                  {formatCurrency(totalCollected)}
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {collectionRate}% collected
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collected</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-emerald-600">{formatCurrency(totalCollected)}</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uncollected</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-orange-600">{formatCurrency(totalUncollected)}</div>
                <p className="text-xs text-muted-foreground">Outstanding this month</p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expected Rent</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-blue-600">{formatCurrency(expectedMonthlyRent)}</div>
                <p className="text-xs text-muted-foreground">Monthly total</p>
              </CardContent>
            </Card>

            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Losses</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-red-600">{formatCurrency(totalLosses)}</div>
                <p className="text-xs text-muted-foreground">{losses.length} tenant(s) left unpaid</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Expiring Leases */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <CardTitle>Leases Expiring Soon</CardTitle>
              </CardHeader>
              <CardContent>
                {expiringLeases.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No leases expiring in the next 30 days</p>
                ) : (
                  <div className="space-y-3">
                    {expiringLeases.map(lease => (
                      <div key={lease.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div>
                          <p className="font-medium">{(lease.rental_tenants as any)?.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            Unit {(lease.rental_units as any)?.unit_number}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          Expires {format(new Date(lease.end_date), 'MMM d')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Open Maintenance Requests */}
            <Card>
              <CardHeader className="flex flex-row items-center gap-2">
                <Wrench className="h-5 w-5 text-blue-500" />
                <CardTitle>Open Maintenance</CardTitle>
              </CardHeader>
              <CardContent>
                {maintenanceRequests.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No open maintenance requests</p>
                ) : (
                  <div className="space-y-3">
                    {maintenanceRequests.map(req => (
                      <div key={req.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(req.priority)}`} />
                          <div>
                            <p className="font-medium">{req.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Unit {(req.rental_units as any)?.unit_number}
                            </p>
                          </div>
                        </div>
                        <Badge variant="secondary">{req.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Collections & Dues Tab */}
        <TabsContent value="collections" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Total Collected This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">{formatCurrency(totalCollected)}</div>
                <p className="text-sm text-emerald-600/70 mt-1">
                  {monthlyPayments.length} payment(s) received
                </p>
              </CardContent>
            </Card>

            <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  Total Uncollected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{formatCurrency(totalUncollected)}</div>
                <p className="text-sm text-orange-600/70 mt-1">
                  {tenantsWithBalances.length} tenant(s) with dues
                </p>
              </CardContent>
            </Card>

            <Card className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">
                  Marked as Losses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{formatCurrency(totalLosses)}</div>
                <p className="text-sm text-red-600/70 mt-1">
                  {losses.length} tenant(s) left without paying
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tenants with Outstanding Balances */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Tenants with Outstanding Dues
              </CardTitle>
              <CardDescription>
                Current tenants who have unpaid balances
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tenantsWithBalances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-emerald-500" />
                  <p>All tenants are up to date with payments!</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Monthly Rent</TableHead>
                      <TableHead className="text-right">Balance Due</TableHead>
                      <TableHead>Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenantsWithBalances.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.tenantName}</TableCell>
                        <TableCell>{tenant.unitNumber}</TableCell>
                        <TableCell className="text-right">{formatCurrency(tenant.monthlyRent)}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-orange-600 font-semibold">
                            {formatCurrency(tenant.balance + tenant.outstandingBalance)}
                          </span>
                        </TableCell>
                        <TableCell>{tenant.tenantPhone || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Losses - Tenants who left without paying */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Losses (Left Without Paying)
              </CardTitle>
              <CardDescription>
                Former tenants who vacated with outstanding balances
              </CardDescription>
            </CardHeader>
            <CardContent>
              {losses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-emerald-500" />
                  <p>No losses recorded</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Amount Lost</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date Marked</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {losses.map((loss) => (
                      <TableRow key={loss.id}>
                        <TableCell className="font-medium">
                          {(loss.rental_tenants as any)?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell>{(loss.rental_units as any)?.unit_number || '-'}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-red-600 font-semibold">
                            {formatCurrency(Number(loss.outstanding_balance) || 0)}
                          </span>
                        </TableCell>
                        <TableCell>{loss.termination_reason || 'Left without paying'}</TableCell>
                        <TableCell>
                          {loss.loss_marked_at 
                            ? format(new Date(loss.loss_marked_at), 'MMM d, yyyy')
                            : '-'
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Monthly Collection Report */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Monthly Collection Summary
                </CardTitle>
                <CardDescription>{format(new Date(), 'MMMM yyyy')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Rent</span>
                    <span className="font-semibold">{formatCurrency(expectedMonthlyRent)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Collected</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(totalCollected)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Uncollected</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(totalUncollected)}</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between">
                    <span className="font-medium">Collection Rate</span>
                    <span className={`font-bold ${Number(collectionRate) >= 80 ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {collectionRate}%
                    </span>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-muted rounded-full h-3">
                  <div 
                    className="bg-emerald-500 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Number(collectionRate))}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Property Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Property Performance
                </CardTitle>
                <CardDescription>Overall portfolio metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Properties</span>
                    <span className="font-semibold">{properties.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Units</span>
                    <span className="font-semibold">{units.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Occupied Units</span>
                    <span className="font-semibold text-emerald-600">{occupiedUnits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vacant Units</span>
                    <span className="font-semibold text-orange-600">{availableUnits}</span>
                  </div>
                  <div className="h-px bg-border my-2" />
                  <div className="flex justify-between">
                    <span className="font-medium">Occupancy Rate</span>
                    <span className={`font-bold ${Number(occupancyRate) >= 80 ? 'text-emerald-600' : 'text-orange-600'}`}>
                      {occupancyRate}%
                    </span>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-muted rounded-full h-3">
                  <div 
                    className="bg-blue-500 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Number(occupancyRate))}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Financial Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Monthly Expected Revenue</TableCell>
                    <TableCell className="text-right">{formatCurrency(expectedMonthlyRent)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">Target</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">This Month Collected</TableCell>
                    <TableCell className="text-right text-emerald-600 font-semibold">
                      {formatCurrency(totalCollected)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Received
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Outstanding Dues</TableCell>
                    <TableCell className="text-right text-orange-600 font-semibold">
                      {formatCurrency(totalUncollected)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Total Losses (Bad Debt)</TableCell>
                    <TableCell className="text-right text-red-600 font-semibold">
                      {formatCurrency(totalLosses)}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                        <XCircle className="h-3 w-3 mr-1" />
                        Written Off
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-muted/50">
                    <TableCell className="font-bold">Net Collectible</TableCell>
                    <TableCell className="text-right font-bold">
                      {formatCurrency(expectedMonthlyRent - totalLosses)}
                    </TableCell>
                    <TableCell>
                      <Badge>Summary</Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Tenants Count Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{tenants.length}</div>
                  <p className="text-sm text-muted-foreground">Active Tenants</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">{activeLeases.length}</div>
                  <p className="text-sm text-muted-foreground">Active Leases</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <div className="text-2xl font-bold">{tenantsWithBalances.length}</div>
                  <p className="text-sm text-muted-foreground">With Balances</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Wrench className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{maintenanceRequests.length}</div>
                  <p className="text-sm text-muted-foreground">Open Maintenance</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
