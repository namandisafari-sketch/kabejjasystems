import { useEffect, useState } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { getStudentSession, clearStudentSession } from "./StudentLogin";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, BarChart3, FileText, Calendar, CreditCard,
  CalendarCheck, BookOpen, Lightbulb, LogOut,
} from "lucide-react";
import type { PortalMenuItem } from "@/components/portal/PortalSidebar";
import { Button } from "@/components/ui/button";

export default function StudentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    const session = getStudentSession();
    if (!session) {
      navigate("/student/login", { replace: true });
      return;
    }
    setStudentName(session.fullName);

    if (location.pathname !== "/student/set-password") {
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.user_metadata?.must_reset_password) {
          navigate("/student/set-password", { replace: true });
        }
      });
    }
  }, [navigate, location.pathname]);

  const menuItems: PortalMenuItem[] = [
    { title: "Dashboard", url: "/student/dashboard", icon: LayoutDashboard },
    { title: "Performance", url: "/student/performance", icon: BarChart3 },
    { title: "Report Cards", url: "/student/report-cards", icon: FileText },
    { title: "Timetable", url: "/student/timetable", icon: Calendar },
    { title: "Fees & Receipts", url: "/student/fees", icon: CreditCard },
    { title: "Events", url: "/student/events", icon: CalendarCheck },
    { title: "Resources", url: "/student/resources", icon: BookOpen },
    { title: "Suggestions", url: "/student/suggestions", icon: Lightbulb },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <PortalSidebar title="Student Portal" menuItems={menuItems} tenantName={studentName} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-card sticky top-0 z-30">
            <SidebarTrigger />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { clearStudentSession(); supabase.auth.signOut(); navigate("/student/login"); }}
            >
              <LogOut className="h-4 w-4 mr-1" /> Logout
            </Button>
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
