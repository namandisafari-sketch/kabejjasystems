import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Users, BarChart3, FileSpreadsheet, Calendar, ClipboardCheck,
  AlertCircle, CheckCircle2, ArrowRight, GraduationCap, TrendingUp,
} from "lucide-react";

const DOSDashboard = () => {
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
      .select("full_name")
      .eq("id", session.user.id)
      .single();
    setProfile(p);
  };

  const stats = [
    { label: "Avg Pass Rate", value: "78%", icon: TrendingUp, color: "text-green-600", bg: "bg-green-100" },
    { label: "Subjects Needing Attention", value: "3", icon: AlertCircle, color: "text-red-600", bg: "bg-red-100" },
    { label: "Teacher Attendance", value: "94%", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Pending Lesson Plans", value: "12", icon: BookOpen, color: "text-amber-600", bg: "bg-amber-100" },
    { label: "Ongoing Exams", value: "2", icon: FileSpreadsheet, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Curriculum Coverage", value: "65%", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100" },
  ];

  const subjectsAttention = [
    { name: "Mathematics", passRate: "52%", teacher: "Mr. Okello", trend: "down" },
    { name: "Physics", passRate: "48%", teacher: "Ms. Nambi", trend: "down" },
    { name: "Chemistry", passRate: "55%", teacher: "Mr. Ssali", trend: "stable" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Director of Studies Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {profile?.full_name?.split(" ")[0] || "DOS"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <Card key={s.label} className="hover:shadow-md transition-shadow">
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
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Subjects Needing Attention
            </CardTitle>
            <CardDescription>Subjects with pass rate below 60%</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subjectsAttention.map((s) => (
                <div key={s.name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">Teacher: {s.teacher}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${s.trend === "down" ? "text-red-600" : "text-amber-600"}`}>
                      {s.passRate}
                    </p>
                    <p className="text-xs text-muted-foreground">Pass rate</p>
                  </div>
                </div>
              ))}
              <Button variant="link" className="w-full text-sm" onClick={() => navigate("/dos/reports/subjects")}>
                View full subject report <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Pending Reviews
            </CardTitle>
            <CardDescription>Items requiring your approval</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Lesson Plans</p>
                <p className="text-xs text-muted-foreground">8 plans awaiting approval</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate("/dos/teachers/lesson-plans")}>
                Review
              </Button>
            </div>
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Exam Papers</p>
                <p className="text-xs text-muted-foreground">3 papers for approval</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate("/dos/exams/paper-approval")}>
                Review
              </Button>
            </div>
            <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Mark Entries</p>
                <p className="text-xs text-muted-foreground">2 classes pending approval</p>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate("/dos/exams/mark-approval")}>
                Review
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/dos/academics/timetable")}>
              <Calendar className="h-4 w-4 mr-2" /> Manage Timetable
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/dos/exams/create")}>
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Create Exam
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/dos/academics/subject-allocation")}>
              <BookOpen className="h-4 w-4 mr-2" /> Subject Allocation
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/dos/students/top")}>
              <Users className="h-4 w-4 mr-2" /> Top Students
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/dos/reports/exam-analysis")}>
              <BarChart3 className="h-4 w-4 mr-2" /> Exam Analysis
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Teacher Monitoring
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Teachers</span>
              <span className="font-bold">24</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Present Today</span>
              <span className="font-bold text-green-600">22</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">On Leave</span>
              <span className="font-bold text-amber-600">2</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Absent (No Notice)</span>
              <span className="font-bold text-red-600">0</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Academic Calendar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">End of Term Exams</p>
                <p className="text-xs text-muted-foreground">Term III</p>
              </div>
              <span className="text-xs text-muted-foreground">Dec 1-10</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Report Cards Due</p>
                <p className="text-xs text-muted-foreground">Distribution</p>
              </div>
              <span className="text-xs text-muted-foreground">Dec 12</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Next Term Begins</p>
                <p className="text-xs text-muted-foreground">Term I</p>
              </div>
              <span className="text-xs text-muted-foreground">Jan 30</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DOSDashboard;
