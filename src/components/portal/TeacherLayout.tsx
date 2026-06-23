import { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, BookOpen, Users, ClipboardList, MessageSquare,
  BarChart3, FolderOpen, Settings, Calendar, FileText, GraduationCap,
  ClipboardCheck, Target, GitBranch,
} from "lucide-react";
import type { PortalMenuItem } from "@/components/portal/PortalSidebar";
import { TranslationProvider } from "@/components/TranslationProvider";

const teacherMenuItems: PortalMenuItem[] = [
  { title: "Dashboard", url: "/teacher", icon: LayoutDashboard },
    {
    title: "Academic", icon: BookOpen,
    items: [
      { title: "My Classes", url: "/teacher/classes" },
      { title: "Scheme of Work", url: "/teacher/scheme-of-work" },
      { title: "Lesson Plans", url: "/teacher/lesson-plans" },
      { title: "Attendance", url: "/teacher/attendance" },
      { title: "Marks Management", url: "/teacher/marks" },
    ],
  },
  {
    title: "Curriculum Tracking", icon: Target,
    items: [
      { title: "Lesson Tracker", url: "/teacher/lesson-tracker" },
      { title: "Syllabus Coverage", url: "/teacher/resources/curriculum" },
    ],
  },
  {
    title: "Students", icon: Users,
    items: [
      { title: "View Students", url: "/teacher/students" },
      { title: "Student Profiles", url: "/teacher/student-profiles" },
      { title: "Progress Tracking", url: "/teacher/progress" },
    ],
  },
  {
    title: "Assignments", icon: ClipboardList,
    items: [
      { title: "Create Assignment", url: "/teacher/assignments/create" },
      { title: "Submissions", url: "/teacher/assignments/submissions" },
      { title: "Online Marking", url: "/teacher/assignments/marking" },
    ],
  },
  {
    title: "Communication", icon: MessageSquare,
    items: [
      { title: "Message Parents", url: "/teacher/communication/parents" },
      { title: "Message Students", url: "/teacher/communication/students" },
      { title: "Class Announcements", url: "/teacher/communication/announcements" },
    ],
  },
  {
    title: "Reports", icon: BarChart3,
    items: [
      { title: "Performance Analysis", url: "/teacher/reports/performance" },
      { title: "Subject Averages", url: "/teacher/reports/averages" },
      { title: "Class Ranking", url: "/teacher/reports/ranking" },
      { title: "Attendance Reports", url: "/teacher/reports/attendance" },
    ],
  },
  {
    title: "Resources", icon: FolderOpen,
    items: [
      { title: "Teaching Materials", url: "/teacher/resources/materials" },
      { title: "Past Papers", url: "/teacher/resources/past-papers" },
      { title: "Curriculum", url: "/teacher/resources/curriculum" },
      { title: "School Calendar", url: "/teacher/resources/calendar" },
    ],
  },
  {
    title: "Settings", icon: Settings,
    items: [
      { title: "Profile", url: "/teacher/settings/profile" },
      { title: "Password", url: "/teacher/settings/password" },
      { title: "Notifications", url: "/teacher/settings/notifications" },
      { title: "Personal Finance", url: "/teacher/finance" },
    ],
  },
];

export function TeacherLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isOnboarding = location.pathname === "/teacher/onboarding";
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
        {!isOnboarding && <PortalSidebar title="Teacher Portal" menuItems={teacherMenuItems} tenantName={tenantName} />}
        <div className="flex-1 flex flex-col">
          {!isOnboarding && (
            <header className="h-14 border-b border-border flex items-center px-4 bg-card sticky top-0 z-30">
              <SidebarTrigger />
            </header>
          )}
          <main className={`flex-1 overflow-auto ${isOnboarding ? "p-0" : "p-6"}`}>
            <TranslationProvider>
              <Outlet />
            </TranslationProvider>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
