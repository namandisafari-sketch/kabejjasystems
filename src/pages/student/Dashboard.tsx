import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getStudentSession } from "@/pages/StudentLogin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, FileText, CreditCard, Calendar, Star, TrendingUp, GraduationCap, Wallet } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/i18n";

export default function StudentDashboard() {
  const session = getStudentSession()!;
  const { t } = useLanguage();

  const { data: grades } = useQuery({
    queryKey: ["student-grades-summary", session.studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("student_grades")
        .select("score, max_score, subject_id, subjects(name)")
        .eq("student_id", session.studentId)
        .limit(5)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: latestReport } = useQuery({
    queryKey: ["student-latest-report", session.studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("student_report_cards")
        .select("average_score, overall_grade, term_id, academic_terms(name)")
        .eq("student_id", session.studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      return data || null;
    },
  });

  const { data: fees } = useQuery({
    queryKey: ["student-fees-summary", session.studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("student_fees")
        .select("total_amount, amount_paid, balance, status")
        .eq("student_id", session.studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data || null;
    },
  });

  const { data: events } = useQuery({
    queryKey: ["student-upcoming-events", session.tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("school_events")
        .select("title, event_date, location")
        .eq("tenant_id", session.tenantId)
        .eq("is_published", true)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(3);
      return data || [];
    },
  });

  const avgScore = grades?.length
    ? (grades.reduce((sum, g) => sum + (g.max_score > 0 ? (g.score / g.max_score) * 100 : 0), 0) / grades.length).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t.dashboard.welcome}, {session.fullName.split(" ")[0]}</h1>
        <p className="text-muted-foreground">{session.className} · {session.schoolName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {avgScore !== null && (
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.exams.average}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{avgScore}%</p>
            </CardContent>
          </Card>
        )}
        {latestReport && (
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t.exams.grade}</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{latestReport.overall_grade || "—"}</p>
              {latestReport.academic_terms?.name && (
                <p className="text-xs text-muted-foreground">{latestReport.academic_terms.name}</p>
              )}
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t.fees.title} {t.fees.balance}</CardTitle>
            <Wallet className={`h-4 w-4 ${(fees?.balance || 0) > 0 ? "text-red-500" : "text-green-500"}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${(fees?.balance || 0) > 0 ? "text-red-500" : "text-green-600"}`}>
              {fees ? new Intl.NumberFormat().format(fees.balance || 0) : "—"}
            </p>
            {fees && (
              <p className="text-xs text-muted-foreground">
                {fees.status === "cleared" ? t.fees.paid : `${fees.status} · ${new Intl.NumberFormat().format(fees.total_amount)} ${t.common.total}`}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming Events
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{events?.length || 0}</p>
            {events?.slice(0, 1).map((e, i) => (
              <p key={i} className="text-xs text-muted-foreground truncate">{e.title}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      {grades && grades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> {t.exams.results}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {grades.map((g, i) => {
                const pct = g.max_score > 0 ? Math.round((g.score / g.max_score) * 100) : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{(g as any).subjects?.name || t.exams.subject}</span>
                      <span>{g.score}/{g.max_score} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {(!grades || grades.length === 0) && !latestReport && !fees && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>{t.common.noResults}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
