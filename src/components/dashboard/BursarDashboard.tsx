import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/hooks/use-tenant";
import { Link } from "react-router-dom";
import { 
  Banknote, TrendingUp, AlertCircle, AlertTriangle, Calendar,
  Wallet, Receipt, Users, CreditCard
} from "lucide-react";

const BursarDashboard = () => {
  const { data: tenant } = useTenant();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const { data: currentTerm } = useQuery({
    queryKey: ['current-term', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return null;
      const { data } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('tenant_id', tenant.tenantId)
        .eq('is_current', true)
        .maybeSingle();
      return data;
    },
    enabled: !!tenant?.tenantId,
  });

  // Fee stats
  const { data: feeStats } = useQuery({
    queryKey: ['bursar-fee-stats', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return { totalExpected: 0, totalCollected: 0, totalPending: 0, collectionRate: 0, studentsOwing: 0, studentsPaid: 0 };
      
      const { data: studentFees } = await supabase
        .from('student_fees')
        .select('total_amount, amount_paid, balance')
        .eq('tenant_id', tenant.tenantId);
      
      if (!studentFees?.length) return { totalExpected: 0, totalCollected: 0, totalPending: 0, collectionRate: 0, studentsOwing: 0, studentsPaid: 0 };
      
      const totalExpected = studentFees.reduce((sum, f) => sum + Number(f.total_amount || 0), 0);
      const totalCollected = studentFees.reduce((sum, f) => sum + Number(f.amount_paid || 0), 0);
      const totalPending = studentFees.reduce((sum, f) => sum + Number(f.balance || 0), 0);
      const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
      const studentsOwing = studentFees.filter(f => Number(f.balance) > 0).length;
      const studentsPaid = studentFees.filter(f => Number(f.balance) <= 0).length;
      
      return { totalExpected, totalCollected, totalPending, collectionRate, studentsOwing, studentsPaid };
    },
    enabled: !!tenant?.tenantId,
  });

  // Recent payments
  const { data: recentPayments = [] } = useQuery({
    queryKey: ['bursar-recent-payments', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data } = await supabase
        .from('fee_payments')
        .select('id, amount, payment_date, payment_method, student_id')
        .eq('tenant_id', tenant.tenantId)
        .order('payment_date', { ascending: false })
        .limit(8);
      
      if (!data?.length) return [];
      
      const studentIds = [...new Set(data.map(p => p.student_id))];
      const { data: students } = await supabase
        .from('students')
        .select('id, full_name, admission_number')
        .in('id', studentIds);
      
      const map: Record<string, any> = {};
      (students || []).forEach(s => { map[s.id] = s; });
      
      return data.map(p => ({ ...p, student: map[p.student_id] || null }));
    },
    enabled: !!tenant?.tenantId,
  });

  // Students with highest balances
  const { data: topDebtors = [] } = useQuery({
    queryKey: ['bursar-top-debtors', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data } = await supabase
        .from('student_fees')
        .select('student_id, balance, total_amount, students(id, full_name, admission_number, school_classes(name))')
        .eq('tenant_id', tenant.tenantId)
        .gt('balance', 0)
        .order('balance', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!tenant?.tenantId,
  });

  // Today's payments total
  const { data: todayTotal = 0 } = useQuery({
    queryKey: ['bursar-today-total', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return 0;
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('fee_payments')
        .select('amount')
        .eq('tenant_id', tenant.tenantId)
        .gte('payment_date', today);
      return (data || []).reduce((sum, p) => sum + Number(p.amount), 0);
    },
    enabled: !!tenant?.tenantId,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bursar Dashboard</h1>
          <p className="text-muted-foreground">Fee collection & financial overview</p>
        </div>
        {currentTerm && (
          <Badge variant="secondary" className="text-sm">
            <Calendar className="h-3 w-3 mr-1" />
            {currentTerm.name} ({currentTerm.year})
          </Badge>
        )}
      </div>

      {/* Key Financial Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(feeStats?.collectionRate || 0).toFixed(1)}%</div>
            <Progress value={feeStats?.collectionRate || 0} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Collection</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(todayTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Students Owing</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{feeStats?.studentsOwing || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fully Paid</CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{feeStats?.studentsPaid || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Fee Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Fee Collection Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-sm">Total Expected</p>
              <p className="font-bold text-xl">{formatCurrency(feeStats?.totalExpected || 0)}</p>
            </div>
            <div className="p-4 bg-emerald-500/10 rounded-lg">
              <p className="text-muted-foreground text-sm">Total Collected</p>
              <p className="font-bold text-xl text-emerald-600">{formatCurrency(feeStats?.totalCollected || 0)}</p>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-muted-foreground text-sm flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Outstanding
              </p>
              <p className="font-bold text-xl text-destructive">{formatCurrency(feeStats?.totalPending || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Recent Payments
            </CardTitle>
            <Link to="/business/fees">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No payments yet</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment: any) => (
                  <div key={payment.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{payment.student?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.student?.admission_number} • {new Date(payment.payment_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600 text-sm">{formatCurrency(payment.amount)}</p>
                      <Badge variant="outline" className="text-xs capitalize">{payment.payment_method}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Debtors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Highest Outstanding Balances
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topDebtors.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No outstanding balances</p>
            ) : (
              <div className="space-y-3">
                {topDebtors.map((item: any) => (
                  <div key={item.student_id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{item.students?.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.students?.admission_number} • {item.students?.school_classes?.name || '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive text-sm">{formatCurrency(item.balance || 0)}</p>
                      <p className="text-xs text-muted-foreground">of {formatCurrency(item.total_amount || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/business/fees">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <CreditCard className="h-5 w-5" />
                <span className="text-xs">Collect Fees</span>
              </Button>
            </Link>
            <Link to="/business/reports">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <TrendingUp className="h-5 w-5" />
                <span className="text-xs">Reports</span>
              </Button>
            </Link>
            <Link to="/business/expenses">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Wallet className="h-5 w-5" />
                <span className="text-xs">Expenses</span>
              </Button>
            </Link>
            <Link to="/business/students">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Users className="h-5 w-5" />
                <span className="text-xs">Students</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BursarDashboard;
