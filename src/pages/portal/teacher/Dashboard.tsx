import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Users, Calendar, ClipboardList, Bell, Clock,
  CheckCircle2, AlertCircle, GraduationCap,
  BarChart3, MessageSquare, FileText, Loader2,
} from "lucide-react";

interface DashboardData {
  classCount: number;
  studentCount: number;
  lessonsToday: number;
  pendingLessonPlans: number;
  className: string | null;
  teacherClasses: { id: string; name: string }[];
  todayTimetable: {
    id: string;
    start_time: string;
    end_time: string;
    subject_name: string;
    class_name: string;
    room: string | null;
    period_name: string;
  }[];
}

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string; id: string; tenant_id: string } | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, id, tenant_id")
        .eq("id", session.user.id)
        .single();
      if (!p?.id || !p?.tenant_id) { navigate("/login"); return; }
      setProfile(p);

      const { data: assignments } = await supabase
        .from("teacher_subject_assignments")
        .select("id")
        .eq("teacher_id", p.id)
        .eq("tenant_id", p.tenant_id)
        .limit(1);
      if (!assignments || assignments.length === 0) {
        navigate("/teacher/onboarding");
        return;
      }

      const { data: classAssigns } = await supabase
        .from("teacher_class_assignments")
        .select("class_id")
        .eq("teacher_id", p.id)
        .eq("tenant_id", p.tenant_id);
      const classIds = (classAssigns || []).map((c: any) => c.class_id);

      const { data: classes } = await supabase
        .from("school_classes")
        .select("id, name")
        .eq("tenant_id", p.tenant_id)
        .in("id", classIds.length > 0 ? classIds : ["none"])
        .order("name");

      const classNames = (classes || []).map((c: any) => c.name);
      const classCount = (classes || []).length;
      const className = classCount > 0 ? classNames.join(", ") : null;

      let studentCount = 0;
      if (classIds.length > 0) {
        const { count: sc } = await supabase
          .from("students")
          .select("id", { count: "exact", head: true })
          .in("class_id", classIds)
          .eq("is_active", true);
        studentCount = sc || 0;
      }

      const dayIndex = new Date().getDay();
      let lessonsToday = 0;
      let todayTimetable: DashboardData["todayTimetable"] = [];

      if (classIds.length > 0 && dayIndex >= 1 && dayIndex <= 6) {
        const { data: entries } = await supabase
          .from("timetable_entries")
          .select("id, room, period_id, subject_id, class_id")
          .eq("day_of_week", dayIndex === 0 ? 7 : dayIndex)
          .in("class_id", classIds)
          .eq("is_active", true);

        if (entries && entries.length > 0) {
          const periodIds = [...new Set(entries.map((e: any) => e.period_id))];
          const subjectIds = [...new Set(entries.map((e: any) => e.subject_id).filter(Boolean))];
          const entryClassIds = [...new Set(entries.map((e: any) => e.class_id))];

          const [{ data: periods }, { data: subjects }, { data: clsMap }] = await Promise.all([
            supabase.from("timetable_periods").select("id, name, start_time, end_time").in("id", periodIds).order("display_order"),
            subjectIds.length > 0 ? supabase.from("subjects").select("id, name").in("id", subjectIds) : Promise.resolve({ data: [] }),
            supabase.from("school_classes").select("id, name").in("id", entryClassIds),
          ]);

          const periodMap = new Map((periods || []).map((p: any) => [p.id, p]));
          const subjectMap = new Map((subjects || []).map((s: any) => [s.id, s.name]));
          const classMap = new Map((clsMap || []).map((c: any) => [c.id, c.name]));

          todayTimetable = entries.map((e: any) => {
            const period = periodMap.get(e.period_id);
            return {
              id: e.id,
              start_time: period?.start_time?.slice(0, 5) || "",
              end_time: period?.end_time?.slice(0, 5) || "",
              subject_name: subjectMap.get(e.subject_id) || "Unknown",
              class_name: classMap.get(e.class_id) || "",
              room: e.room || null,
              period_name: period?.name || "",
            };
          }).sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

          lessonsToday = todayTimetable.length;
        }
      }

      const { count: pendingPlans } = await supabase
        .from("lesson_plans")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", p.tenant_id)
        .eq("status", "draft");

      setData({
        classCount,
        studentCount,
        lessonsToday,
        pendingLessonPlans: pendingPlans || 0,
        className,
        teacherClasses: classes || [],
        todayTimetable,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-[60vh] text-red-500">Failed to load dashboard: {error}</div>;
  }

  const stats = [
    { label: "My Classes", value: String(data?.classCount || 0), icon: BookOpen, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Students", value: String(data?.studentCount || 0), icon: Users, color: "text-green-600", bg: "bg-green-100" },
    { label: "Lessons Today", value: String(data?.lessonsToday || 0), icon: Clock, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Pending Plans", value: String(data?.pendingLessonPlans || 0), icon: FileText, color: "text-amber-600", bg: "bg-amber-100" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"},{profile?.full_name?.split(" ")[0] || "Teacher"}
        </h1>
        <p className="text-muted-foreground mt-1">{today}</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground truncate">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Today's Timetable</CardTitle>
              <CardDescription>{data?.todayTimetable.length ? "Your lesson schedule for today" : "No lessons scheduled today"}</CardDescription>
            </div>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {data?.todayTimetable.length ? (
              <div className="space-y-1">
                {data.todayTimetable.map((t, i) => {
                  const isBreak = t.subject_name.toLowerCase().includes("break");
                  return (
                    <div key={t.id || i} className={`flex items-center p-2.5 rounded-lg ${isBreak ? "bg-muted/50" : "hover:bg-muted/30"}`}>
                      <span className="text-xs font-mono text-muted-foreground w-28 shrink-0">{t.start_time} - {t.end_time}</span>
                      <div className="flex-1 min-w-0 ml-2">
                        <p className="text-sm font-medium truncate">{t.subject_name}</p>
                        {t.class_name && <p className="text-xs text-muted-foreground truncate">{t.class_name}{t.room ? ` · ${t.room}` : ""}</p>}
                      </div>
                      {!isBreak && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs shrink-0 ml-2">
                          Start
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">No timetable entries for today.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Frequent tasks</CardDescription>
            </div>
            <GraduationCap className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate("/teacher/attendance")}>
                <ClipboardList className="h-4 w-4 mr-2 shrink-0" /> Attendance
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate("/teacher/marks")}>
                <BarChart3 className="h-4 w-4 mr-2 shrink-0" /> Marks
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate("/teacher/lesson-plans")}>
                <BookOpen className="h-4 w-4 mr-2 shrink-0" /> Lesson Plans
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate("/teacher/lesson-tracker")}>
                <ClipboardList className="h-4 w-4 mr-2 shrink-0" /> Tracker
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate("/teacher/resources/materials")}>
                <FileText className="h-4 w-4 mr-2 shrink-0" /> Resources
              </Button>
              <Button variant="outline" className="justify-start h-auto py-3" onClick={() => navigate("/teacher/communication/announcements")}>
                <MessageSquare className="h-4 w-4 mr-2 shrink-0" /> Announce
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data && data.pendingLessonPlans > 0 && (
              <div className="flex items-center justify-between p-2.5 bg-amber-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Lesson Plans</p>
                  <p className="text-xs text-muted-foreground">{data.pendingLessonPlans} plan(s) not yet submitted</p>
                </div>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/teacher/lesson-plans")}>
                  Review
                </Button>
              </div>
            )}
            {data && data.lessonsToday === 0 && data.classCount > 0 && (
              <div className="flex items-center justify-between p-2.5 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Attendance</p>
                  <p className="text-xs text-muted-foreground">No lessons scheduled today</p>
                </div>
              </div>
            )}
            {(!data || (data.pendingLessonPlans === 0 && data.lessonsToday === 0)) && (
              <p className="text-sm text-muted-foreground py-4 text-center">No pending actions.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              My Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.teacherClasses && data.teacherClasses.length > 0 ? (
              <div className="space-y-2">
                {data.teacherClasses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2.5 border rounded-lg">
                    <span className="text-sm font-medium">{c.name}</span>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/teacher/classes")}>
                      View
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">No classes assigned.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Teaching Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/teacher/resources/materials")}>
              <FileText className="h-4 w-4 mr-2" /> Upload Materials
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/teacher/resources/past-papers")}>
              <FileText className="h-4 w-4 mr-2" /> Past Papers
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/teacher/scheme-of-work")}>
              <BookOpen className="h-4 w-4 mr-2" /> Scheme of Work
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;
