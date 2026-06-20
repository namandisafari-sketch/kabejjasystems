import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, BookOpen, FileSpreadsheet, Users, BarChart3,
  MessageSquare, FolderOpen, ClipboardCheck, GraduationCap, Calendar,
  Target, GitBranch,
} from "lucide-react";
import type { PortalMenuItem } from "@/components/portal/PortalSidebar";
import { TranslationProvider } from "@/components/TranslationProvider";

const dosMenuItems: PortalMenuItem[] = [
  { title: "Dashboard", url: "/dos", icon: LayoutDashboard },
  {
    title: "Academic Management", icon: BookOpen,
    items: [
      { title: "Subject Allocation", url: "/dos/academics/subject-allocation" },
      { title: "Teacher Allocation", url: "/dos/academics/teacher-allocation" },
      { title: "Class Allocation", url: "/dos/academics/class-allocation" },
      { title: "Timetable Management", url: "/dos/academics/timetable" },
      { title: "Curriculum Tracking", url: "/dos/academics/curriculum" },
      { title: "Lesson Observation", url: "/dos/academics/lesson-observation" },
      { title: "Academic Calendar", url: "/dos/academics/calendar" },
    ],
  },
  {
    title: "Examinations", icon: FileSpreadsheet,
    items: [
      { title: "Create Exams", url: "/dos/exams/create" },
      { title: "Exam Timetable", url: "/dos/exams/timetable" },
      { title: "Paper Approval", url: "/dos/exams/paper-approval" },
      { title: "Result Approval", url: "/dos/exams/result-approval" },
      { title: "Mark Entry Approval", url: "/dos/exams/mark-approval" },
      { title: "Report Cards", url: "/dos/exams/report-cards" },
      { title: "Ranking", url: "/dos/exams/ranking" },
      { title: "Grading System", url: "/dos/exams/grading" },
      { title: "Promotion Lists", url: "/dos/exams/promotion" },
    ],
  },
  {
    title: "Teacher Monitoring", icon: ClipboardCheck,
    items: [
      { title: "Lesson Plan Approval", url: "/dos/teachers/lesson-plans" },
      { title: "Teacher Attendance", url: "/dos/teachers/attendance" },
      { title: "Teaching Load", url: "/dos/teachers/load" },
      { title: "Class Observations", url: "/dos/teachers/observations" },
      { title: "Performance Reviews", url: "/dos/teachers/reviews" },
      { title: "Professional Development", url: "/dos/teachers/dev" },
    ],
  },
  {
    title: "Student Tracking", icon: Users,
    items: [
      { title: "Performance Trends", url: "/dos/students/trends" },
      { title: "Top Students", url: "/dos/students/top" },
      { title: "Slow Learners", url: "/dos/students/slow-learners" },
      { title: "Intervention Tracking", url: "/dos/students/interventions" },
      { title: "Remedial Programs", url: "/dos/students/remedial" },
      { title: "Continuous Assessment", url: "/dos/students/assessment" },
    ],
  },
  {
    title: "Reports", icon: BarChart3,
    items: [
      { title: "Department Reports", url: "/dos/reports/departments" },
      { title: "Subject Reports", url: "/dos/reports/subjects" },
      { title: "Class Reports", url: "/dos/reports/classes" },
      { title: "Teacher Reports", url: "/dos/reports/teachers" },
      { title: "Exam Analysis", url: "/dos/reports/exam-analysis" },
      { title: "Mean Scores", url: "/dos/reports/mean-scores" },
      { title: "Export PDF", url: "/dos/reports/export" },
    ],
  },
  {
    title: "Communication", icon: MessageSquare,
    items: [
      { title: "Staff Notices", url: "/dos/communication/notices" },
      { title: "Academic Meetings", url: "/dos/communication/meetings" },
      { title: "Teacher Messaging", url: "/dos/communication/messages" },
      { title: "Parent Notices", url: "/dos/communication/parent-notices" },
    ],
  },
  {
    title: "Documents", icon: FolderOpen,
    items: [
      { title: "Curriculum", url: "/dos/documents/curriculum" },
      { title: "Circulars", url: "/dos/documents/circulars" },
      { title: "Exam Papers", url: "/dos/documents/exam-papers" },
      { title: "Academic Policies", url: "/dos/documents/policies" },
    ],
  },
];

export function DOSLayout() {
  const navigate = useNavigate();
  const [tenantName, setTenantName] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tenant_id, role")
      .eq("id", session.user.id)
      .single();

    if (!profile?.tenant_id) { navigate("/login"); return; }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("name")
      .eq("id", profile.tenant_id)
      .single();
    setTenantName(tenant?.name || "");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PortalSidebar title="DOS Portal" menuItems={dosMenuItems} tenantName={tenantName} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center px-4 bg-card sticky top-0 z-30">
            <SidebarTrigger />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <TranslationProvider>
              <Outlet />
            </TranslationProvider>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
