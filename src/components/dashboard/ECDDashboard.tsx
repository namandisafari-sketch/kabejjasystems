import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/hooks/use-database";
import { useQuery } from "@tanstack/react-query";
import { 
  Baby, 
  Users, 
  Palette, 
  Heart, 
  Calendar, 
  Bug,
  Sparkles,
  Star,
  Sun,
  Cloud,
  Flower2,
  Apple,
  Home
} from "lucide-react";
import { useTenant } from "@/hooks/use-tenant";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const ECDDashboard = () => {
  const { data: tenant } = useTenant();

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

  // Pupil stats
  const { data: pupilStats } = useQuery({
    queryKey: ['pupil-stats', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return { total: 0, active: 0, inactive: 0, boys: 0, girls: 0 };
      
      const { data } = await supabase
        .from('students')
        .select('is_active, gender')
        .eq('tenant_id', tenant.tenantId);
      
      const students = data || [];
      const active = students.filter(s => s.is_active === true).length;
      const inactive = students.length - active;
      const boys = students.filter(s => s.gender?.toLowerCase() === 'male').length;
      const girls = students.filter(s => s.gender?.toLowerCase() === 'female').length;
      
      return { total: students.length, active, inactive, boys, girls };
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
      if (!tenant?.tenantId) return { total: 0, caregivers: 0 };
      
      const { data } = await supabase
        .from('employees')
        .select('role')
        .eq('tenant_id', tenant.tenantId)
        .eq('is_active', true);
      
      const employees = data || [];
      const caregivers = employees.filter(e => 
        e.role?.toLowerCase().includes('teacher') || 
        e.role?.toLowerCase().includes('caregiver') ||
        e.role?.toLowerCase().includes('nanny')
      ).length;
      
      return { total: employees.length, caregivers };
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

  // Fee collection stats
  const { data: feeStats } = useQuery({
    queryKey: ['fee-stats', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return { 
        totalExpected: 0, 
        totalCollected: 0, 
        totalPending: 0,
        collectionRate: 0 
      };
      
      const { data: studentFees } = await supabase
        .from('student_fees')
        .select('total_amount, amount_paid, balance')
        .eq('tenant_id', tenant.tenantId);
      
      if (!studentFees || studentFees.length === 0) {
        return { totalExpected: 0, totalCollected: 0, totalPending: 0, collectionRate: 0 };
      }
      
      const totalExpected = studentFees.reduce((sum, f) => sum + Number(f.total_amount || 0), 0);
      const totalCollected = studentFees.reduce((sum, f) => sum + Number(f.amount_paid || 0), 0);
      const totalPending = studentFees.reduce((sum, f) => sum + Number(f.balance || 0), 0);
      const collectionRate = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
      
      return { totalExpected, totalCollected, totalPending, collectionRate };
    },
    enabled: !!tenant?.tenantId,
  });

  // Today's send home count
  const { data: sendHomeCount = 0 } = useQuery({
    queryKey: ['send-home-count', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return 0;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { count } = await supabase
        .from('send_home_records')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.tenantId)
        .eq('is_active', true)
        .gte('send_home_date', today.toISOString().split('T')[0]);

      return count || 0;
    },
    enabled: !!tenant?.tenantId,
  });

  // Classes with enrollment
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

  // Pupils with balances
  const { data: pupilsWithBalances = [] } = useQuery({
    queryKey: ['pupils-with-balances', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      
      const { data } = await supabase
        .from('student_fees')
        .select(`
          student_id,
          balance,
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
        .limit(8);

      return data || [];
    },
    enabled: !!tenant?.tenantId,
  });

  const classColors = [
    'from-pink-400 to-rose-500',
    'from-purple-400 to-violet-500',
    'from-blue-400 to-cyan-500',
    'from-green-400 to-emerald-500',
    'from-yellow-400 to-orange-500',
    'from-teal-400 to-cyan-500',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-pink-50 to-sky-50 dark:from-slate-900 dark:via-purple-950 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Playful Header */}
        <div className="mb-8 relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-lg shadow-pink-200 dark:shadow-pink-900/30">
                  <Baby className="h-8 w-8 text-white" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-yellow-500 animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Welcome Back! 🌈
                </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Sun className="h-4 w-4 text-yellow-500" />
                Your ECD Center
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {tenant?.isDevMode && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500">
                  <Bug className="h-3 w-3 mr-1" />
                  Dev Mode
                </Badge>
              )}
              {currentTerm && (
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-md">
                  <Calendar className="h-3 w-3 mr-1" />
                  {currentTerm.name} ({currentTerm.year})
                </Badge>
              )}
              {sendHomeCount > 0 && (
                <Link to="/business/send-home">
                  <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white border-0 shadow-md animate-pulse">
                    <Home className="h-3 w-3 mr-1" />
                    {sendHomeCount} to send home
                  </Badge>
                </Link>
              )}
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 opacity-20 pointer-events-none hidden lg:block">
            <Cloud className="h-20 w-20 text-sky-400" />
          </div>
        </div>

        {/* Main Stats - Colorful Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-pink-500 to-rose-600 text-white border-0 shadow-lg shadow-pink-200 dark:shadow-pink-900/30 overflow-hidden relative">
            <div className="absolute top-0 right-0 opacity-20">
              <Star className="h-24 w-24 -mt-6 -mr-6" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Baby className="h-4 w-4" />
                Little Stars
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{pupilStats?.total || 0}</div>
              <p className="text-xs opacity-80 mt-1">
                👦 {pupilStats?.boys || 0} boys • 👧 {pupilStats?.girls || 0} girls
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-violet-600 text-white border-0 shadow-lg shadow-purple-200 dark:shadow-purple-900/30 overflow-hidden relative">
            <div className="absolute top-0 right-0 opacity-20">
              <Palette className="h-24 w-24 -mt-6 -mr-6" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Classrooms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{classStats?.total || 0}</div>
              <p className="text-xs opacity-80 mt-1">Active learning spaces</p>
            </CardContent>
          </Card>

          <Link to="/business/parents" className="block">
            <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/30 overflow-hidden relative hover:scale-105 transition-transform cursor-pointer h-full">
              <div className="absolute top-0 right-0 opacity-20">
                <Heart className="h-24 w-24 -mt-6 -mr-6" />
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Parents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{parentStats?.total || 0}</div>
                <p className="text-xs opacity-80 mt-1">{parentStats?.linked || 0} connected</p>
              </CardContent>
            </Card>
          </Link>

          <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-lg shadow-amber-200 dark:shadow-amber-900/30 overflow-hidden relative">
            <div className="absolute top-0 right-0 opacity-20">
              <Users className="h-24 w-24 -mt-6 -mr-6" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium opacity-90 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Caregivers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{staffStats?.total || 0}</div>
              <p className="text-xs opacity-80 mt-1">{staffStats?.caregivers || 0} in classrooms</p>
            </CardContent>
          </Card>
        </div>

        {/* Fee Collection - Friendly Design */}
        <Card className="mb-8 border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500" />
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Apple className="h-5 w-5 text-red-500" />
              Fee Collection
              <Badge variant="outline" className={cn(
                "ml-2",
                (feeStats?.collectionRate || 0) >= 70 
                  ? "bg-green-100 text-green-700 border-green-300" 
                  : "bg-orange-100 text-orange-700 border-orange-300"
              )}>
                {(feeStats?.collectionRate || 0).toFixed(0)}% collected
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-sky-100 dark:from-blue-950 dark:to-sky-900">
                <p className="text-muted-foreground text-sm flex items-center gap-1">
                  <Star className="h-3 w-3" /> Expected
                </p>
                <p className="font-bold text-xl text-blue-700 dark:text-blue-300">{formatCurrency(feeStats?.totalExpected || 0)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900">
                <p className="text-muted-foreground text-sm flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Collected
                </p>
                <p className="font-bold text-xl text-green-700 dark:text-green-300">{formatCurrency(feeStats?.totalCollected || 0)}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950 dark:to-amber-900">
                <p className="text-muted-foreground text-sm flex items-center gap-1">
                  <Cloud className="h-3 w-3" /> Outstanding
                </p>
                <p className="font-bold text-xl text-orange-700 dark:text-orange-300">{formatCurrency(feeStats?.totalPending || 0)}</p>
              </div>
            </div>
            <Progress 
              value={feeStats?.collectionRate || 0} 
              className="mt-4 h-3 bg-pink-100 dark:bg-pink-950"
            />
          </CardContent>
        </Card>

        {/* Classes Grid - Colorful Tiles */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flower2 className="h-5 w-5 text-pink-500" />
                Our Classrooms
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!classesWithEnrollment || classesWithEnrollment.length === 0 ? (
                <div className="text-center py-8">
                  <Palette className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-muted-foreground">No classrooms set up yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {classesWithEnrollment.map((cls, idx) => (
                    <div 
                      key={cls.id} 
                      className={cn(
                        "p-4 rounded-xl bg-gradient-to-br text-white shadow-md",
                        classColors[idx % classColors.length]
                      )}
                    >
                      <p className="font-bold text-lg">{cls.name}</p>
                      <p className="text-sm opacity-90">{cls.enrolled} / {cls.capacity || '∞'} pupils</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pupils with Balances */}
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-yellow-500" />
                Outstanding Balances
              </CardTitle>
              <Link to="/business/send-home">
                <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 hover:bg-orange-100 cursor-pointer">
                  <Home className="h-3 w-3 mr-1" />
                  Send Home
                </Badge>
              </Link>
            </CardHeader>
            <CardContent>
              {pupilsWithBalances.length === 0 ? (
                <div className="text-center py-8">
                  <Sparkles className="h-12 w-12 mx-auto text-green-300 mb-2" />
                  <p className="text-muted-foreground">All fees cleared! 🎉</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pupilsWithBalances.slice(0, 5).map((item: any, idx) => (
                    <div 
                      key={item.student_id} 
                      className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold",
                          classColors[idx % classColors.length].replace('from-', 'bg-').split(' ')[0]
                        )}>
                          {item.students?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{item.students?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{item.students?.school_classes?.name}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 font-bold">
                        {formatCurrency(item.balance)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ECDDashboard;
