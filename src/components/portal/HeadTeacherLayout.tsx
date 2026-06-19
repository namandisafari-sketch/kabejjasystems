import { useEffect, useState } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PortalSidebar } from "@/components/portal/PortalSidebar";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Shield, Users, GraduationCap, BarChart3,
  DollarSign, Building2, MessageSquare, FileText, ShieldAlert, BookOpen,
  Settings, ClipboardList, Truck, Home, Book, HeartPulse, Briefcase,
} from "lucide-react";
import type { PortalMenuItem } from "@/components/portal/PortalSidebar";

const headTeacherMenuItems: PortalMenuItem[] = [
  { title: "Dashboard", url: "/headteacher", icon: LayoutDashboard },
  {
    title: "Administration", icon: Settings,
    items: [
      { title: "School Profile", url: "/headteacher/admin/profile" },
      { title: "Staff Management", url: "/headteacher/admin/staff" },
      { title: "Departments", url: "/headteacher/admin/departments" },
      { title: "School Calendar", url: "/headteacher/admin/calendar" },
      { title: "School Policies", url: "/headteacher/admin/policies" },
      { title: "User Management", url: "/headteacher/admin/users" },
      { title: "Roles & Permissions", url: "/headteacher/admin/roles" },
    ],
  },
  {
    title: "Student Management", icon: Users,
    items: [
      { title: "Admissions", url: "/headteacher/students/admissions" },
      { title: "Transfers", url: "/headteacher/students/transfers" },
      { title: "Promotions", url: "/headteacher/students/promotions" },
      { title: "Suspensions", url: "/headteacher/students/suspensions" },
      { title: "Discipline", url: "/headteacher/students/discipline" },
      { title: "Medical Records", url: "/headteacher/students/medical" },
      { title: "ID Generation", url: "/headteacher/students/id-cards" },
      { title: "Student Files", url: "/headteacher/students/files" },
    ],
  },
  {
    title: "Staff Management", icon: Briefcase,
    items: [
      { title: "Recruitment", url: "/headteacher/staff/recruitment" },
      { title: "Leave Management", url: "/headteacher/staff/leave" },
      { title: "Payroll", url: "/headteacher/staff/payroll" },
      { title: "Contracts", url: "/headteacher/staff/contracts" },
      { title: "Performance Appraisal", url: "/headteacher/staff/appraisal" },
      { title: "Attendance", url: "/headteacher/staff/attendance" },
      { title: "Disciplinary Records", url: "/headteacher/staff/discipline" },
    ],
  },
  {
    title: "Academic Oversight", icon: BookOpen,
    items: [
      { title: "Academic Performance", url: "/headteacher/academics/performance" },
      { title: "Teacher Performance", url: "/headteacher/academics/teacher-performance" },
      { title: "Exam Reports", url: "/headteacher/academics/exam-reports" },
      { title: "Curriculum Implementation", url: "/headteacher/academics/curriculum" },
      { title: "Inspection Reports", url: "/headteacher/academics/inspections" },
      { title: "School Ranking", url: "/headteacher/academics/ranking" },
    ],
  },
  {
    title: "Finance", icon: DollarSign,
    items: [
      { title: "Fees Management", url: "/headteacher/finance/fees" },
      { title: "Invoices", url: "/headteacher/finance/invoices" },
      { title: "Payments", url: "/headteacher/finance/payments" },
      { title: "Expenses", url: "/headteacher/finance/expenses" },
      { title: "Budget", url: "/headteacher/finance/budget" },
      { title: "Procurement", url: "/headteacher/finance/procurement" },
      { title: "Assets", url: "/headteacher/finance/assets" },
      { title: "Inventory", url: "/headteacher/finance/inventory" },
      { title: "Salary Reports", url: "/headteacher/finance/salaries" },
      { title: "Financial Reports", url: "/headteacher/finance/reports" },
    ],
  },
  {
    title: "Infrastructure", icon: Building2,
    items: [
      { title: "Buildings", url: "/headteacher/infrastructure/buildings" },
      { title: "Maintenance", url: "/headteacher/infrastructure/maintenance" },
      { title: "Transport", url: "/headteacher/infrastructure/transport" },
      { title: "Hostels", url: "/headteacher/infrastructure/hostels" },
      { title: "Library", url: "/headteacher/infrastructure/library" },
      { title: "Laboratories", url: "/headteacher/infrastructure/labs" },
      { title: "ICT Equipment", url: "/headteacher/infrastructure/ict" },
    ],
  },
  {
    title: "Communication", icon: MessageSquare,
    items: [
      { title: "SMS", url: "/headteacher/communication/sms" },
      { title: "Email", url: "/headteacher/communication/email" },
      { title: "Announcements", url: "/headteacher/communication/announcements" },
      { title: "Parent Portal", url: "/headteacher/communication/parent-portal" },
      { title: "Staff Portal", url: "/headteacher/communication/staff-portal" },
    ],
  },
  {
    title: "Reports", icon: BarChart3,
    items: [
      { title: "Financial Reports", url: "/headteacher/reports/financial" },
      { title: "Academic Reports", url: "/headteacher/reports/academic" },
      { title: "Attendance Reports", url: "/headteacher/reports/attendance" },
      { title: "Discipline Reports", url: "/headteacher/reports/discipline" },
      { title: "Board Reports", url: "/headteacher/reports/board" },
      { title: "Government Reports", url: "/headteacher/reports/government" },
      { title: "EMIS Reports", url: "/headteacher/reports/emis" },
    ],
  },
  {
    title: "Security", icon: ShieldAlert,
    items: [
      { title: "Audit Logs", url: "/headteacher/security/audit-logs" },
      { title: "User Activity", url: "/headteacher/security/activity" },
      { title: "Permission Management", url: "/headteacher/security/permissions" },
      { title: "Backups", url: "/headteacher/security/backups" },
      { title: "Data Recovery", url: "/headteacher/security/data-recovery" },
    ],
  },
];

export function HeadTeacherLayout() {
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
        <PortalSidebar title="Head Teacher Portal" menuItems={headTeacherMenuItems} tenantName={tenantName} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center px-4 bg-card sticky top-0 z-30">
            <SidebarTrigger />
          </header>
          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
