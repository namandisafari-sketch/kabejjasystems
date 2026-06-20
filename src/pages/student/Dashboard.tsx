import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStudentSession } from "@/pages/StudentLogin";
import { BarChart3, FileText, CreditCard, Calendar, Star, TrendingUp, GraduationCap } from "lucide-react";
import { format } from "date-fns";

export default function StudentDashboard() {
  const session = getStudentSession()!;

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
        .eq("status", "active")
        .maybeSingle();
      return data || null;
    },
  });

  const { data: upcomingEvents } = useQuery({
    queryKey: ["student-upcoming-events", session.tenantId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("school_events")
        .select("id, title, start_date, event_time, location, event_type")
        .eq("tenant_id", session.tenantId)
        .eq("is_published", true)
        .gte("start_date", today)
        .order("start_date", { ascending: true })
        .limit(5);
      return data || [];
    },
  });

  const avgScore = grades?.length
    ? (grades.reduce((s, g) => s + (g.score / g.max_score) * 100, 0) / grades.length).toFixed(1)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {session.fullName}</h1>
        <p className="text-muted-foreground">
          {session.className} &middot; {session.admissionNumber} &middot; {session.schoolName}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{avgScore || "—"}%</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Latest Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{latestReport?.overall_grade || "—"}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fee Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold">
                {fees ? new Intl.NumberFormat().format(fees.balance || 0) : "—"}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-500" />
              <span className="text-2xl font-bold">{upcomingEvents?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" /> Recent Grades
            </CardTitle>
          </CardHeader>
          <CardContent>
            {grades?.length ? (
              <div className="space-y-3">
                {grades.map((g, i) => {
                  const pct = ((g.score / g.max_score) * 100).toFixed(0);
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{(g as any).subjects?.name || "Unknown"}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${+pct >= 80 ? "bg-green-500" : +pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm font-mono">{g.score}/{g.max_score}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No grades recorded yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" /> Upcoming Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents?.length ? (
              <div className="space-y-3">
                {upcomingEvents.map((e) => (
                  <div key={e.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(e.start_date), "MMM d")}{e.event_time ? ` at ${e.event_time.slice(0, 5)}` : ""}
                        {e.location ? ` · ${e.location}` : ""}
                      </p>
                    </div>
                    <span className="text-xs capitalize px-2 py-1 bg-muted rounded">{e.event_type}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No upcoming events</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
