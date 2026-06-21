import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  GraduationCap, Users, BookOpen, Banknote, Calendar, Bug,
  TrendingUp, AlertCircle, School, UserCheck, AlertTriangle,
  Bell, Eye, HeartPulse
} from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AdminSchoolDashboard = () => {
  const { data: tenant } = useTenant();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency', currency: 'UGX', maximumFractionDigits: 0,
    }).format(amount);
  };

  const { data: currentTerm } = useQuery({
    queryKey: ['current-term', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return null;
      const { data } = await supabase.from('academic_terms').select('*')
        .eq('tenant_id', tenant.tenantId).eq('is_current', true).maybeSingle();
      return data;
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: studentStats } = useQuery({
    queryKey: ['student-stats', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return { total: 0, active: 0, inactive: 0 };
      const { data, count } = await supabase.from('students').select('is_active', { count: 'exact' })
        .eq('tenant_id', tenant.tenantId);
      const students = data || [];
      const active = students.filter(s => s.is_active === true).length;
      return { total: count || students.length, active, inactive: students.length - active };
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: classStats } = useQuery({
    queryKey: ['class-stats', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return { total: 0 };
      const { count } = await supabase.from('school_classes').select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.tenantId).eq('is_active', true);
      return { total: count || 0 };
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: staffStats } = useQuery({
    queryKey: ['staff-stats', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return { total: 0, teachers: 0 };
      const { data } = await supabase.from('employees').select('role')
        .eq('tenant_id', tenant.tenantId).eq('is_active', true);
      const employees = data || [];
      const teachers = employees.filter(e => e.role?.toLowerCase().includes('teacher') || e.role?.toLowerCase().includes('tutor')).length;
      return { total: employees.length, teachers };
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: parentStats } = useQuery({
    queryKey: ['parent-stats', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return { total: 0, linked: 0 };
      const { data: parents } = await supabase.from('parents').select('id').eq('tenant_id', tenant.tenantId);
      const { data: links } = await supabase.from('parent_students').select('parent_id').eq('tenant_id', tenant.tenantId);
      const uniqueLinked = new Set(links?.map(l => l.parent_id) || []);
      return { total: parents?.length || 0, linked: uniqueLinked.size };
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: feeStats } = useQuery({
    queryKey: ['fee-stats', tenant?.tenantId, currentTerm?.id],
    queryFn: async () => {
      if (!tenant?.tenantId) return { totalExpected: 0, totalCollected: 0, totalPending: 0, collectionRate: 0 };
      const { data: studentFees } = await supabase.from('student_fees').select('total_amount, amount_paid, balance').eq('tenant_id', tenant.tenantId);
      if (!studentFees?.length) return { totalExpected: 0, totalCollected: 0, totalPending: 0, collectionRate: 0 };
      const totalExpected = studentFees.reduce((sum, f) => sum + Number(f.total_amount || 0), 0);
      const totalCollected = studentFees.reduce((sum, f) => sum + Number(f.amount_paid || 0), 0);
      const totalPending = studentFees.reduce((sum, f) => sum + Number(f.balance || 0), 0);
      return { totalExpected, totalCollected, totalPending, collectionRate: totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0 };
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: recentPayments } = useQuery({
    queryKey: ['recent-fee-payments', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data } = await supabase.from('fee_payments').select('id, amount, payment_date, payment_method, student_id')
        .eq('tenant_id', tenant.tenantId).order('payment_date', { ascending: false }).limit(5);
      if (!data?.length) return [];
      const studentIds = [...new Set(data.map(p => p.student_id))];
      const { data: students } = await supabase.from('students').select('id, full_name, admission_number').in('id', studentIds);
      const map: Record<string, any> = {};
      (students || []).forEach(s => { map[s.id] = s; });
      return data.map(p => ({ ...p, student: map[p.student_id] || null }));
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: classesWithEnrollment } = useQuery({
    queryKey: ['classes-enrollment', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data: classes } = await supabase.from('school_classes').select('id, name, grade, level, capacity')
        .eq('tenant_id', tenant.tenantId).eq('is_active', true).order('level').limit(6);
      if (!classes) return [];
      const classIds = classes.map(c => c.id);
      const { data: studentsData } = await supabase.from('students').select('class_id')
        .eq('tenant_id', tenant.tenantId).eq('is_active', true).in('class_id', classIds);
      const counts: Record<string, number> = {};
      (studentsData || []).forEach(s => { counts[s.class_id] = (counts[s.class_id] || 0) + 1; });
      return classes.map(c => ({ ...c, enrolled: counts[c.id] || 0 }));
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: studentsWithBalances = [] } = useQuery({
    queryKey: ['students-with-balances', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data } = await supabase.from('student_fees')
        .select('student_id, balance, total_amount, students(id, full_name, admission_number, school_classes(name))')
        .eq('tenant_id', tenant.tenantId).gt('balance', 0).order('balance', { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: todayAttendance } = useQuery({
    queryKey: ['today-attendance', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return null;
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase.from('student_attendance').select('status')
        .eq('tenant_id', tenant.tenantId).eq('date', today);
      if (!data?.length) return null;
      const present = data.filter(a => a.status === 'present').length;
      return { total: data.length, present, rate: Math.round((present / data.length) * 100) };
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: openDiscipline } = useQuery({
    queryKey: ['open-discipline', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return 0;
      const { count } = await supabase.from('discipline_cases').select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.tenantId).neq('status', 'resolved');
      return count || 0;
    },
    enabled: !!tenant?.tenantId,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header — Executive Briefing Tone */}
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">The Principal's Desk</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <Eye className="h-4 w-4" />
            This morning's snapshot &mdash; everything at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {tenant?.isDevMode && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500">
              <Bug className="h-3 w-3 mr-1" />
              Dev Mode
            </Badge>
          )}
          {currentTerm && (
            <Badge variant="secondary" className="text-sm">
              <Calendar className="h-3 w-3 mr-1" />
              {currentTerm.name} ({currentTerm.year})
            </Badge>
          )}
        </div>
      </div>

      {/* Pulse Check — Key Health Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Enrolled Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-600 font-medium">{studentStats?.active || 0} active</span>
              {studentStats?.inactive ? `, ${studentStats.inactive} inactive` : ''}
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Classes running this term</p>
          </CardContent>
        </Card>
        <Link to="/business/parents" className="block">
          <Card className="hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Registered Parents</CardTitle>
              <UserCheck className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{parentStats?.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">{parentStats?.linked || 0} linked to students</p>
            </CardContent>
          </Card>
        </Link>
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Staff on Payroll</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{staffStats?.teachers || 0} teaching staff</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5 hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fee Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(feeStats?.collectionRate || 0).toFixed(1)}%</div>
            <Progress value={feeStats?.collectionRate || 0} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Things That Need Your Attention */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-amber-800">
              <Bell className="h-5 w-5" />
              Things to Note
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayAttendance?.rate != null && todayAttendance.rate < 90 && (
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-amber-200">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Attendance dipping today</p>
                  <p className="text-xs text-muted-foreground">{todayAttendance.rate}% attendance rate so far ({todayAttendance.present}/{todayAttendance.total} students present)</p>
                </div>
              </div>
            )}
            {todayAttendance?.rate == null && (
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200">
                <HeartPulse className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Attendance not yet recorded today</p>
                  <p className="text-xs text-muted-foreground">Today's attendance register hasn't been filled in.</p>
                </div>
              </div>
            )}
            {openDiscipline != null && openDiscipline > 0 && (
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-amber-200">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{openDiscipline} open discipline case{openDiscipline !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-muted-foreground">There {openDiscipline === 1 ? 'is' : 'are'} unresolved discipline matters awaiting your attention.</p>
                </div>
              </div>
            )}
            {studentsWithBalances.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
                <Banknote className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{studentsWithBalances.length} student{studentsWithBalances.length !== 1 ? 's' : ''} with outstanding fee balances</p>
                  <p className="text-xs text-muted-foreground">Top balance: {formatCurrency(studentsWithBalances[0]?.balance || 0)}</p>
                </div>
              </div>
            )}
            {todayAttendance?.rate != null && todayAttendance.rate >= 90 && openDiscipline === 0 && studentsWithBalances.length === 0 && (
              <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-green-200">
                <HeartPulse className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">All clear</p>
                  <p className="text-xs text-muted-foreground">Everything looks good. Nothing urgently needs your attention.</p>
                </div>
              </div>
            )}
            <div className="pt-2">
              <Button variant="outline" size="sm" asChild className="text-xs">
                <Link to="/headteacher">
                  <Eye className="h-3 w-3 mr-1" />
                  Go to Head Teacher Portal
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Fee Collection Pulse */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Fee Collection Pulse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-muted-foreground text-sm">Expected</p>
                <p className="font-bold text-xl">{formatCurrency(feeStats?.totalExpected || 0)}</p>
              </div>
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-muted-foreground text-sm">Collected So Far</p>
                <p className="font-bold text-xl text-primary">{formatCurrency(feeStats?.totalCollected || 0)}</p>
              </div>
              <div className="p-4 bg-destructive/10 rounded-lg">
                <p className="text-muted-foreground text-sm flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Still Outstanding
                </p>
                <p className="font-bold text-xl text-destructive">{formatCurrency(feeStats?.totalPending || 0)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Collection progress</span>
              <span className="text-sm font-bold">{(feeStats?.collectionRate || 0).toFixed(1)}%</span>
            </div>
            <Progress value={feeStats?.collectionRate || 0} className="mt-1 h-3" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Class Enrollment Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              How Our Classes Are Filling Up
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!classesWithEnrollment?.length ? (
              <p className="text-center text-muted-foreground py-8">No classes set up yet</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {classesWithEnrollment.map((cls) => (
                  <div key={cls.id} className="border rounded-lg p-4 hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold">{cls.name}</h4>
                      <Badge variant="outline" className="text-xs">{cls.level}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{cls.grade}</p>
                    <div className="mt-2 flex items-center gap-1 text-sm">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span>{cls.enrolled} / {cls.capacity || '∞'} enrolled</span>
                    </div>
                    {cls.capacity && (
                      <Progress value={(cls.enrolled / cls.capacity) * 100} className="mt-2 h-1.5" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Fee Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Latest Payments Coming In
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentPayments?.length ? (
              <p className="text-center text-muted-foreground py-8">No payments recorded yet</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment: any) => (
                  <div key={payment.id} className="border rounded-lg p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{payment.student?.full_name || 'Unknown Student'}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.student?.admission_number} &bull; {new Date(payment.payment_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-sm">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{payment.payment_method}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Students with Outstanding Balances — Needs Follow-Up */}
      <Card className="mb-8 border-red-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Students With Fee Balances &mdash; May Need Follow-Up
          </CardTitle>
        </CardHeader>
        <CardContent>
          {studentsWithBalances.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">All fee accounts are up to date. No follow-ups needed.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {studentsWithBalances.map((item: any) => (
                <div key={item.student_id} className="border rounded-lg p-4 hover:border-destructive/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-sm">{item.students?.full_name}</h4>
                    <Badge variant="outline" className="text-xs">{item.students?.school_classes?.name || '-'}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.students?.admission_number}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Total: {formatCurrency(item.total_amount || 0)}</span>
                    <span className="font-bold text-destructive text-sm">{formatCurrency(item.balance || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSchoolDashboard;
