import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Users, Calendar, ClipboardList, Bell, Clock,
  CheckCircle2, AlertCircle, ArrowRight, GraduationCap,
  BarChart3, MessageSquare,
} from "lucide-react";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data: p } = await supabase
      .from("profiles")
      .select("full_name, id, tenant_id")
      .eq("id", session.user.id)
      .single();
    setProfile(p);

    if (p?.id && p?.tenant_id) {
      const { data: assignments } = await supabase
        .from("teacher_subject_assignments")
        .select("id")
        .eq("teacher_id", p.id)
        .eq("tenant_id", p.tenant_id)
        .limit(1);
      if (!assignments || assignments.length === 0) {
        navigate("/teacher/onboarding");
      }
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const stats = [
    { label: "My Classes", value: "4", icon: BookOpen, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Students", value: "142", icon: Users, color: "text-green-600", bg: "bg-green-100" },
    { label: "Pending Marking", value: "3", icon: ClipboardList, color: "text-amber-600", bg: "bg-amber-100" },
    { label: "Lessons Today", value: "5", icon: Clock, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Attendance Today", value: "92%", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "Unread Messages", value: "7", icon: MessageSquare, color: "text-rose-600", bg: "bg-rose-100" },
  ];

  const timetable = [
    { period: "08:00 - 08:40", subject: "Mathematics", class: "S.3A", room: "Rm 12" },
    { period: "08:40 - 09:20", subject: "Mathematics", class: "S.3B", room: "Rm 14" },
    { period: "09:20 - 10:00", subject: "Break", class: "", room: "" },
    { period: "10:00 - 10:40", subject: "Physics", class: "S.4A", room: "Lab 2" },
    { period: "10:40 - 11:20", subject: "Physics", class: "S.4B", room: "Lab 2" },
    { period: "11:20 - 12:00", subject: "Chemistry", class: "S.3A", room: "Lab 1" },
  ];

  const announcements = [
    { title: "Staff Meeting", date: "Today 4:00 PM", desc: "End of term preparation meeting" },
    { title: "Exam Timetable", date: "Due Friday", desc: "Submit exam papers by Friday" },
    { title: "Sports Day", date: "Next Tuesday", desc: "Annual sports day preparations" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 17 ? "Afternoon" : "Evening"},{profile?.full_name?.split(" ")[0] || "Teacher"}
        </h1>
        <p className="text-muted-foreground mt-1">{today}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {}}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Today's Timetable</CardTitle>
              <CardDescription>Your lesson schedule for today</CardDescription>
            </div>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {timetable.map((t, i) => (
                <div key={i} className={`flex items-center p-2 rounded-lg ${t.subject === "Break" ? "bg-muted/50" : "hover:bg-muted/30"}`}>
                  <span className="text-xs font-mono text-muted-foreground w-24">{t.period}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t.subject}</p>
                    {t.class && <p className="text-xs text-muted-foreground">{t.class}{t.room ? ` - ${t.room}` : ""}</p>}
                  </div>
                  {t.subject !== "Break" && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs">
                      Start
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Announcements</CardTitle>
              <CardDescription>Recent school notices</CardDescription>
            </div>
            <Bell className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {announcements.map((a, i) => (
                <div key={i} className="border-l-2 border-primary pl-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{a.title}</p>
                    <span className="text-xs text-muted-foreground">{a.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/teacher/attendance")}>
              <ClipboardList className="h-4 w-4 mr-2" /> Take Attendance
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/teacher/marks")}>
              <BarChart3 className="h-4 w-4 mr-2" /> Enter Marks
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/teacher/assignments/create")}>
              <ClipboardList className="h-4 w-4 mr-2" /> Create Assignment
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/teacher/lesson-planning")}>
              <BookOpen className="h-4 w-4 mr-2" /> Lesson Plan
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/teacher/communication/announcements")}>
              <MessageSquare className="h-4 w-4 mr-2" /> Class Announcement
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Pending Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Marks Entry</p>
                <p className="text-xs text-muted-foreground">S.3A - End of Term Exam</p>
              </div>
              <span className="text-xs font-semibold text-amber-600">Due Tomorrow</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Lesson Plans</p>
                <p className="text-xs text-muted-foreground">3 plans not yet submitted</p>
              </div>
              <span className="text-xs font-semibold text-blue-600">Pending</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Attendance</p>
                <p className="text-xs text-muted-foreground">S.3B - Yesterday not recorded</p>
              </div>
              <span className="text-xs font-semibold text-red-600">Overdue</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Upcoming Exams
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">End of Term Exams</p>
                <p className="text-xs text-muted-foreground">Papers due: Mathematics, Physics</p>
              </div>
              <span className="text-xs text-muted-foreground">Dec 10</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Mock Exams</p>
                <p className="text-xs text-muted-foreground">S.4 candidates</p>
              </div>
              <span className="text-xs text-muted-foreground">Jan 15</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Continuous Assessment</p>
                <p className="text-xs text-muted-foreground">All classes</p>
              </div>
              <span className="text-xs text-muted-foreground">Weekly</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;
