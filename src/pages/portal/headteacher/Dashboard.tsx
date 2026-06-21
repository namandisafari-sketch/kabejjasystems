import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, GraduationCap, DollarSign, Calendar, BarChart3,
  AlertCircle, CheckCircle2, FileText, Building2, TrendingUp,
  Loader2,
} from "lucide-react";

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalStaff: number;
  teachingStaff: number;
  nonTeachingStaff: number;
  staffOnLeave: number;
  revenueMtd: number;
  outstandingFees: number;
  attendanceRate: number | null;
  disciplineCases: number;
  overallPassRate: number | null;
  meanScore: number | null;
  topClass: string | null;
  bestSubject: { name: string; rate: number } | null;
  worstSubject: { name: string; rate: number } | null;
  upcomingEvents: { title: string; description: string; date: string }[];
  hasSubscriptionAlert: boolean;
  subscriptionAlert: string;
}

const HeadTeacherDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, tenant_id")
        .eq("id", session.user.id)
        .single();

      setProfile(p);
      const tenantId = p?.tenant_id;
      if (!tenantId) { setLoading(false); return; }

      const now = new Date();
      const todayStr = now.toISOString().split("T")[0];
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        { count: studentCount },
        { count: activeStudentCount },
        { count: staffCount },
        { count: teachingCount },
        { count: onLeaveCount },
        { data: feePayments },
        { data: feeBalances },
        { data: attendanceData },
        { count: disciplineCount },
        { data: examData },
        { data: subjectsData },
        { data: eventsData },
        { data: tenantData },
        { data: allStaff },
      ] = await Promise.all([
        supabase.from("students").select("id", { count: "exact" }).eq("tenant_id", tenantId),
        supabase.from("students").select("id", { count: "exact" }).eq("tenant_id", tenantId).eq("is_active", true),
        supabase.from("employees").select("id", { count: "exact" }).eq("tenant_id", tenantId),
        supabase.from("employees").select("id", { count: "exact" }).eq("tenant_id", tenantId).eq("employment_type", "teaching"),
        supabase.from("employees").select("id", { count: "exact" }).eq("tenant_id", tenantId).eq("is_active", false),
        supabase.from("fee_payments").select("amount").gte("created_at", monthStart).eq("tenant_id", tenantId),
        supabase.from("student_fees").select("balance").eq("tenant_id", tenantId),
        supabase.from("student_attendance").select("status").eq("tenant_id", tenantId).eq("date", todayStr),
        supabase.from("discipline_cases").select("id", { count: "exact" }).eq("tenant_id", tenantId).neq("status", "resolved"),
        supabase.from("exam_results").select(`
          score, total_marks,
          subjects!inner(name)
        `).eq("tenant_id", tenantId).limit(1000),
        supabase.from("subjects").select("id, name").eq("tenant_id", tenantId),
        supabase.from("term_calendar_events").select("title, description, start_date").eq("tenant_id", tenantId).gte("start_date", now.toISOString()).order("start_date").limit(4),
        supabase.from("tenants").select("subscription_status, subscription_end_date, is_trial, trial_end_date").eq("id", tenantId).single(),
        supabase.from("employees").select("employment_type, is_active").eq("tenant_id", tenantId),
      ]);

      const revenueMtd = feePayments?.reduce((s, p) => s + Number(p.amount || 0), 0) || 0;
      const outstandingFees = feeBalances?.reduce((s, f) => s + Number(f.balance || 0), 0) || 0;

      const attendanceRecords = attendanceData || [];
      const presentCount = attendanceRecords.filter((a: any) => a.status === "present").length;
      const attendanceRate = attendanceRecords.length > 0
        ? Math.round((presentCount / attendanceRecords.length) * 100)
        : null;

      const nonTeachingStaff = (staffCount || 0) - (teachingCount || 0);

      let overallPassRate: number | null = null;
      let meanScore: number | null = null;
      if (examData && examData.length > 0) {
        const passed = examData.filter((e: any) => Number(e.score) >= Number(e.total_marks) * 0.5);
        overallPassRate = Math.round((passed.length / examData.length) * 100);
        const totalPct = examData.reduce((s: number, e: any) => s + (Number(e.score) / Number(e.total_marks || 1)) * 100, 0);
        meanScore = Math.round((totalPct / examData.length) * 10) / 100;
      }

      let topClass: string | null = null;
      let bestSubject: { name: string; rate: number } | null = null;
      let worstSubject: { name: string; rate: number } | null = null;

      if (examData && examData.length > 0 && subjectsData && subjectsData.length > 0) {
        const subjectScores: Record<string, { pass: number; total: number }> = {};
        examData.forEach((e: any) => {
          const subjName = e.subjects?.name || "Unknown";
          if (!subjectScores[subjName]) subjectScores[subjName] = { pass: 0, total: 0 };
          subjectScores[subjName].total++;
          if (Number(e.score) >= Number(e.total_marks) * 0.5) {
            subjectScores[subjName].pass++;
          }
        });

        let bestRate = 0, worstRate = 100;
        Object.entries(subjectScores).forEach(([name, data]) => {
          const rate = Math.round((data.pass / data.total) * 100);
          if (rate > bestRate) { bestRate = rate; bestSubject = { name, rate }; }
          if (rate < worstRate) { worstRate = rate; worstSubject = { name, rate }; }
        });
      }

      const upcomingEvents = (eventsData || []).map((e: any) => ({
        title: e.title,
        description: e.description || "",
        date: new Date(e.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      }));

      let hasSubscriptionAlert = false;
      let subscriptionAlert = "";
      if (tenantData) {
        if (tenantData.is_trial && tenantData.trial_end_date) {
          const trialEnd = new Date(tenantData.trial_end_date);
          const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 14) {
            hasSubscriptionAlert = true;
            subscriptionAlert = `Trial ends in ${daysLeft} days. Renew by ${trialEnd.toLocaleDateString()} to avoid disruption.`;
          }
        }
        if (tenantData.subscription_end_date) {
          const subEnd = new Date(tenantData.subscription_end_date);
          const daysLeft = Math.ceil((subEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysLeft <= 30) {
            hasSubscriptionAlert = true;
            subscriptionAlert = `Subscription renews in ${daysLeft} days. Renew by ${subEnd.toLocaleDateString()} to avoid disruption.`;
          }
        }
      }

      setStats({
        totalStudents: studentCount || 0,
        activeStudents: activeStudentCount || 0,
        totalStaff: staffCount || 0,
        teachingStaff: teachingCount || 0,
        nonTeachingStaff,
        staffOnLeave: onLeaveCount || 0,
        revenueMtd,
        outstandingFees,
        attendanceRate,
        disciplineCases: disciplineCount || 0,
        overallPassRate,
        meanScore,
        topClass,
        bestSubject,
        worstSubject,
        upcomingEvents,
        hasSubscriptionAlert,
        subscriptionAlert,
      });
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) return `UGX ${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `UGX ${(amount / 1_000).toFixed(1)}K`;
    return `UGX ${amount.toLocaleString()}`;
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const statCards = [
    { label: "Total Students", value: stats?.totalStudents?.toLocaleString() || "0", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Total Staff", value: stats?.totalStaff?.toLocaleString() || "0", icon: GraduationCap, color: "text-green-600", bg: "bg-green-100" },
    { label: "Revenue (MTD)", value: formatCurrency(stats?.revenueMtd || 0), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "Outstanding Fees", value: formatCurrency(stats?.outstandingFees || 0), icon: AlertCircle, color: "text-red-600", bg: "bg-red-100" },
    { label: "Attendance (Today)", value: stats?.attendanceRate !== null ? `${stats.attendanceRate}%` : "N/A", icon: CheckCircle2, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Discipline Cases", value: stats?.disciplineCases?.toLocaleString() || "0", icon: FileText, color: "text-amber-600", bg: "bg-amber-100" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Head Teacher Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          School overview for {profile?.full_name?.split(" ")[0] || "Head Teacher"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value || "0"}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              School Performance Overview
            </CardTitle>
            <CardDescription>Current term academic summary</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.overallPassRate !== null ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Overall Pass Rate</span>
                  <span className="font-bold text-green-600">{stats.overallPassRate}%</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Mean Score</span>
                  <span className="font-bold text-blue-600">{stats.meanScore?.toFixed(1) || "N/A"}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <span className="text-sm">Top Performing Class</span>
                  <span className="font-bold">{stats.topClass || "N/A"}</span>
                </div>
                {stats.bestSubject && (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">Subject with Highest Pass</span>
                    <span className="font-bold text-green-600">{stats.bestSubject.name} ({stats.bestSubject.rate}%)</span>
                  </div>
                )}
                {stats.worstSubject && (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm">Subject with Lowest Pass</span>
                    <span className="font-bold text-red-600">{stats.worstSubject.name} ({stats.worstSubject.rate}%)</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No exam data available yet. Start by adding students, subjects, and recording exams.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.hasSubscriptionAlert ? (
              <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                <p className="text-sm font-medium">Subscription Alert</p>
                <p className="text-xs text-muted-foreground">{stats.subscriptionAlert}</p>
              </div>
            ) : (
              <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
                <p className="text-sm font-medium">Subscription Active</p>
                <p className="text-xs text-muted-foreground">Your subscription is active and in good standing.</p>
              </div>
            )}
            {stats && stats.totalStudents === 0 && (
              <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <p className="text-sm font-medium">Getting Started</p>
                <p className="text-xs text-muted-foreground">Add students and staff to begin tracking your school data.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/headteacher/admin/staff")}>
              <Users className="h-4 w-4 mr-2" /> Manage Staff
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/headteacher/finance/fees")}>
              <DollarSign className="h-4 w-4 mr-2" /> Fee Management
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/headteacher/academics/performance")}>
              <BarChart3 className="h-4 w-4 mr-2" /> Academic Performance
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/headteacher/students/admissions")}>
              <Users className="h-4 w-4 mr-2" /> Admissions
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/headteacher/security/backups")}>
              <FileText className="h-4 w-4 mr-2" /> Backup Data
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats?.upcomingEvents && stats.upcomingEvents.length > 0 ? (
              stats.upcomingEvents.map((event, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{event.title}</p>
                    {event.description && <p className="text-xs text-muted-foreground">{event.description}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground">{event.date}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming events scheduled.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Staff Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Teaching Staff</span>
              <span className="font-bold">{stats?.teachingStaff || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Non-Teaching</span>
              <span className="font-bold">{stats?.nonTeachingStaff || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">On Leave / Inactive</span>
              <span className="font-bold text-amber-600">{stats?.staffOnLeave || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HeadTeacherDashboard;
