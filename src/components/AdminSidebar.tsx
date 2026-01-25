import { LayoutDashboard, Users, CreditCard, Package, Settings, LogOut, MessageSquare, GraduationCap, Wrench, UserCheck, Calendar, Shield, Megaphone, TicketCheck, Download, Building2, ClipboardList } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import kabejjaLogo from "@/assets/kabejja-logo.png";

const menuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Tenants", url: "/admin/tenants", icon: Users },
  { title: "Installations", url: "/admin/installations", icon: Wrench },
  { title: "Subscription Requests", url: "/admin/subscription-requests", icon: ClipboardList },
  { title: "Subscriptions", url: "/admin/subscriptions", icon: Calendar },
  { title: "Marketers", url: "/admin/marketers", icon: UserCheck },
  { title: "Payments", url: "/admin/payments", icon: CreditCard },
  { title: "Packages", url: "/admin/packages", icon: Package },
  { title: "School Packages", url: "/admin/school-packages", icon: GraduationCap },
  { title: "Rental Packages", url: "/admin/rental-packages", icon: Building2 },
  { title: "Support Tickets", url: "/admin/support-tickets", icon: TicketCheck },
  { title: "Announcements", url: "/admin/announcements", icon: Megaphone },
  { title: "Bulk Actions", url: "/admin/bulk-actions", icon: Download },
  { title: "Audit Logs", url: "/admin/audit-logs", icon: Shield },
  { title: "Testimonials", url: "/admin/testimonials", icon: MessageSquare },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-60"}>
      <SidebarHeader className="border-b border-border p-4">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <img src={kabejjaLogo} alt="Kabejja" className="h-8 w-auto" />
            <div>
              <h2 className="text-sm font-bold text-foreground">Admin Portal</h2>
              <p className="text-xs text-muted-foreground">Kabejja Systems</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center">
            <img src={kabejjaLogo} alt="K" className="h-8 w-auto" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : ""}>
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-muted/50 flex items-center gap-2"
                        activeClassName="bg-muted text-primary font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border p-2 space-y-1">
        <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-start px-2'}`}>
          <ThemeToggle />
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start"
        >
          <LogOut className="h-4 w-4" />
          {!isCollapsed && <span className="ml-2">Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
