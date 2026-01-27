import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Banknote, 
  Calendar, 
  Bug,
  TrendingUp,
  AlertCircle,
  School,
  UserCheck,
  AlertTriangle
} from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import ECDDashboard from "./ECDDashboard";

const SchoolDashboard = () => {
  const { data: tenant } = useTenant();

  // Check if this is an ECD/Kindergarten
  const isECD = tenant?.businessType === 'kindergarten';

  // If ECD, render the specialized dashboard
  if (isECD) {
    return <ECDDashboard />;
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Current academic term
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

  // Student stats
  const { data: studentStats } = useQuery({
    queryKey: ['student-stats', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return { total: 0, active: 0, inactive: 0 };
      
      const { data, count } = await supabase
        .from('students')
        .select('is_active', { count: 'exact' })
        .eq('tenant_id', tenant.tenantId);
      
      const students = data || [];
      const active = students.filter(s => s.is_active === true).length;
      const inactive = students.length - active;
      
      return { total: count || students.length, active, inactive };
    },
    enabled: !!tenant?.tenantId,
  });

  // Class stats
  const { data: classStats } = useQuery({
    queryKey: ['class-stats', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return { total: 0 };
      
      const { count } = await supabase
        .from('school_classes')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.tenantId)
        .eq('is_active', true);
      
      return { total: count || 0 };
    },
    enabled: !!tenant?.tenantId,
  });

  // Staff stats
  const { data: staffStats } = useQuery({
    queryKey: ['staff-stats', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return { total: 0, teachers: 0 };
      
      const { data } = await supabase
        .from('employees')
        .select('role')
        .eq('tenant_id', tenant.tenantId)
        .eq('is_active', true);
      
      const employees = data || [];
      const teachers = employees.filter(e => 
        e.role?.toLowerCase().includes('teacher') || 
        e.role?.toLowerCase().includes('tutor')
      ).length;
      
      return { total: employees.length, teachers };
    },
    enabled: !!tenant?.tenantId,
  });

  // Parent stats
  const { data: parentStats } = useQuery({
    queryKey: ['parent-stats', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return { total: 0, linked: 0 };
      
      const { data: parents } = await supabase
        .from('parents')
        .select('id')
        .eq('tenant_id', tenant.tenantId);
      
      const { data: links } = await supabase
        .from('parent_students')
        .select('parent_id')
        .eq('tenant_id', tenant.tenantId);
      
      const uniqueLinkedParents = new Set(links?.map(l => l.parent_id) || []);
      
      return { 
        total: parents?.length || 0, 
        linked: uniqueLinkedParents.size 
      };
    },
    enabled: !!tenant?.tenantId,
  });

  // Fee collection stats for current term
  const { data: feeStats } = useQuery({
    queryKey: ['fee-stats', tenant?.tenantId, currentTerm?.id],
    queryFn: async () => {
      if (!tenant?.tenantId) return { 
        totalExpected: 0, 
        totalCollected: 0, 
        totalPending: 0,
        collectionRate: 0 
      };
      
      // Get all student fees for current term
      const { data: studentFees } = await supabase
        .from('student_fees')
        .select('total_amount, amount_paid, balance')
        .eq('tenant_id', tenant.tenantId);
      
      if (!studentFees || studentFees.length === 0) {
        return { 
          totalExpected: 0, 
          totalCollected: 0, 
          totalPending: 0,
          collectionRate: 0 
        };
      }
      
      const totalExpected = studentFees.reduce((sum, f) => sum + Number(f.total_amount || 0), 0);
      const totalCollected = studentFees.reduce((sum, f) => sum + Number(f.amount_paid || 0), 0);
      const totalPending = studentFees.reduce((sum, f) => sum + Number(f.balance || 0), 0);
      const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
      
      return { totalExpected, totalCollected, totalPending, collectionRate };
    },
    enabled: !!tenant?.tenantId,
  });

  // Recent fee payments
  const { data: recentPayments } = useQuery({
    queryKey: ['recent-fee-payments', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      
      const { data } = await supabase
        .from('fee_payments')
        .select('id, amount, payment_date, payment_method, student_id')
        .eq('tenant_id', tenant.tenantId)
        .order('payment_date', { ascending: false })
        .limit(5);
      
      if (!data || data.length === 0) return [];
      
      // Fetch student info separately to avoid type issues
      const studentIds = [...new Set(data.map(p => p.student_id))];
      const { data: students } = await supabase
        .from('students')
        .select('id, full_name, admission_number')
        .in('id', studentIds);
      
      const studentMap = (students || []).reduce((acc, s) => {
        acc[s.id] = s;
        return acc;
      }, {} as Record<string, { id: string; full_name: string; admission_number: string }>);
      
      return data.map(p => ({
        ...p,
        student: studentMap[p.student_id] || null
      }));
    },
    enabled: !!tenant?.tenantId,
  });

  // Classes with enrollment count
  const { data: classesWithEnrollment } = useQuery({
    queryKey: ['classes-enrollment', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      
      const { data: classes } = await supabase
        .from('school_classes')
        .select('id, name, grade, level, capacity')
        .eq('tenant_id', tenant.tenantId)
        .eq('is_active', true)
        .order('level')
        .limit(6);
      
      if (!classes) return [];
      
      // Get enrollment counts for each class
      const classIds = classes.map(c => c.id);
      const { data: studentsData } = await supabase
        .from('students')
        .select('class_id')
        .eq('tenant_id', tenant.tenantId)
        .eq('is_active', true)
        .in('class_id', classIds);
      
      const enrollmentCounts = (studentsData || []).reduce((acc, s) => {
        acc[s.class_id] = (acc[s.class_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      return classes.map(c => ({
        ...c,
        enrolled: enrollmentCounts[c.id] || 0,
      }));
    },
    enabled: !!tenant?.tenantId,
  });

  // Students with high balances (top 10)
  const { data: studentsWithBalances = [] } = useQuery({
    queryKey: ['students-with-balances', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      
      const { data, error } = await supabase
        .from('student_fees')
        .select(`
          student_id,
          balance,
          total_amount,
          students (
            id,
            full_name,
            admission_number,
            school_classes (name)
          )
        `)
        .eq('tenant_id', tenant.tenantId)
        .gt('balance', 0)
        .order('balance', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenant?.tenantId,
  });


  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">School Dashboard</h1>
          <p className="text-muted-foreground">Overview of your school's operations</p>
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

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Students
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {studentStats?.active || 0} active, {studentStats?.inactive || 0} inactive
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Classes
            </CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{classStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active classes this term
            </p>
          </CardContent>
        </Card>

        <Link to="/business/parents">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Parents
              </CardTitle>
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{parentStats?.total || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {parentStats?.linked || 0} linked to students
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Staff Members
            </CardTitle>
            <Users className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staffStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {staffStats?.teachers || 0} teacher(s)
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fee Collection Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {(feeStats?.collectionRate || 0).toFixed(1)}%
            </div>
            <Progress 
              value={feeStats?.collectionRate || 0} 
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* Fee Collection Summary */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Fee Collection Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-muted-foreground text-sm">Expected Fees</p>
              <p className="font-bold text-xl">{formatCurrency(feeStats?.totalExpected || 0)}</p>
            </div>
            <div className="p-4 bg-success/10 rounded-lg">
              <p className="text-muted-foreground text-sm">Collected</p>
              <p className="font-bold text-xl text-success">{formatCurrency(feeStats?.totalCollected || 0)}</p>
            </div>
            <div className="p-4 bg-destructive/10 rounded-lg">
              <p className="text-muted-foreground text-sm flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Outstanding Balance
              </p>
              <p className="font-bold text-xl text-destructive">{formatCurrency(feeStats?.totalPending || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Class Enrollment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Class Enrollment
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!classesWithEnrollment || classesWithEnrollment.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No classes set up yet</p>
            ) : (
              <div className="space-y-4">
                {classesWithEnrollment.map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">{cls.level} - {cls.grade}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{cls.enrolled} / {cls.capacity || '∞'}</p>
                      <p className="text-xs text-muted-foreground">students</p>
                    </div>
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
              Recent Fee Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!recentPayments || recentPayments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No payments recorded yet</p>
            ) : (
              <div className="space-y-4">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{payment.student?.full_name || 'Unknown Student'}</p>
                      <p className="text-xs text-muted-foreground">
                        {payment.student?.admission_number} • {new Date(payment.payment_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{payment.payment_method}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Students with High Balances - Full Width */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Students with Outstanding Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          {studentsWithBalances.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No students with outstanding balances
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Total Fees</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsWithBalances.map((item: any) => (
                  <TableRow key={item.student_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.students?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{item.students?.admission_number}</p>
                      </div>
                    </TableCell>
                    <TableCell>{item.students?.school_classes?.name || '-'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total_amount || 0)}</TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-destructive">{formatCurrency(item.balance || 0)}</span>
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

export default SchoolDashboard;
