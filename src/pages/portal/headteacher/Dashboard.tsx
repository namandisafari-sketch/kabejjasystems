import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, GraduationCap, DollarSign, Calendar, BarChart3,
  AlertCircle, CheckCircle2, FileText, Building2, TrendingUp,
} from "lucide-react";

const HeadTeacherDashboard = () => {
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
    { label: "Total Students", value: "1,247", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
    { label: "Total Staff", value: "68", icon: GraduationCap, color: "text-green-600", bg: "bg-green-100" },
    { label: "Revenue (MTD)", value: "UGX 45.2M", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-100" },
    { label: "Outstanding Fees", value: "UGX 8.3M", icon: AlertCircle, color: "text-red-600", bg: "bg-red-100" },
    { label: "Attendance (Today)", value: "94%", icon: CheckCircle2, color: "text-purple-600", bg: "bg-purple-100" },
    { label: "Discipline Cases", value: "12", icon: FileText, color: "text-amber-600", bg: "bg-amber-100" },
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
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm">Overall Pass Rate</span>
                <span className="font-bold text-green-600">78%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm">Mean Score (S.4)</span>
                <span className="font-bold text-blue-600">5.2</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm">Mean Score (S.6)</span>
                <span className="font-bold text-blue-600">4.8</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm">Top Performing Class</span>
                <span className="font-bold">S.4A</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm">Subject with Highest Pass</span>
                <span className="font-bold text-green-600">English (89%)</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <span className="text-sm">Subject with Lowest Pass</span>
                <span className="font-bold text-red-600">Mathematics (52%)</span>
              </div>
            </div>
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
            <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
              <p className="text-sm font-medium">Subscription Expiring</p>
              <p className="text-xs text-muted-foreground">Renew by Dec 15 to avoid disruption</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg border-l-4 border-amber-500">
              <p className="text-sm font-medium">Pending Inspections</p>
              <p className="text-xs text-muted-foreground">Quality Education inspection due next week</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
              <p className="text-sm font-medium">Staff Meeting</p>
              <p className="text-xs text-muted-foreground">End of term meeting today at 4:00 PM</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
              <p className="text-sm font-medium">Fee Collection</p>
              <p className="text-xs text-muted-foreground">85% of fees collected this term</p>
            </div>
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Sports Day</p>
                <p className="text-xs text-muted-foreground">Annual athletics</p>
              </div>
              <span className="text-xs text-muted-foreground">Nov 25</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">End of Term Exams</p>
                <p className="text-xs text-muted-foreground">Term III</p>
              </div>
              <span className="text-xs text-muted-foreground">Dec 1-10</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Speech Day</p>
                <p className="text-xs text-muted-foreground">Prize giving</p>
              </div>
              <span className="text-xs text-muted-foreground">Dec 15</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Staff Retreat</p>
                <p className="text-xs text-muted-foreground">Planning meeting</p>
              </div>
              <span className="text-xs text-muted-foreground">Jan 10</span>
            </div>
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
              <span className="font-bold">42</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Non-Teaching</span>
              <span className="font-bold">26</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">On Leave</span>
              <span className="font-bold text-amber-600">4</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Vacant Positions</span>
              <span className="font-bold text-red-600">3</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">New This Term</span>
              <span className="font-bold text-green-600">2</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HeadTeacherDashboard;
