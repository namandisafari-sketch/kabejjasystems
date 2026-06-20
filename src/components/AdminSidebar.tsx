import { LayoutDashboard, Users, CreditCard, Package, Settings, LogOut, GraduationCap, Building2, Shield, Activity, Flag, PlusCircle, HardDrive, Sparkles, ChevronRight, Lightbulb, Star, Bell, UserPlus, Archive } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TennaHubLogo } from "@/components/TennaHubLogo";

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavCategory {
  label: string;
  items: NavItem[];
}

const navCategories: NavCategory[] = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
    ],
  },
  {
    label: "Management",
    items: [
      { title: "Create Business", url: "/admin/create-business", icon: PlusCircle },
      { title: "Tenants", url: "/admin/tenants", icon: Users },
      { title: "Sponsors", url: "/admin/sponsors", icon: Sparkles },
    ],
  },
  {
    label: "Students",
    items: [
      { title: "Student Accounts", url: "/admin/student-accounts", icon: UserPlus },
      { title: "Withdrawal", url: "/admin/withdrawal", icon: Archive },
    ],
  },
  {
    label: "Billing",
    items: [
      { title: "Subscriptions", url: "/admin/subscriptions", icon: CreditCard },
      { title: "Payments", url: "/admin/payments", icon: CreditCard },
      { title: "Packages", url: "/admin/packages", icon: Package },
      { title: "School Packages", url: "/admin/school-packages", icon: GraduationCap },
      { title: "Rental Packages", url: "/admin/rental-packages", icon: Building2 },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "System Health", url: "/admin/system-health", icon: Activity },
      { title: "Backups", url: "/admin/backups", icon: HardDrive },
      { title: "Feature Flags", url: "/admin/feature-flags", icon: Flag },
    ],
  },
  {
    label: "Community",
    items: [
      { title: "Suggestions", url: "/admin/suggestions", icon: Lightbulb },
      { title: "Staff Reviews", url: "/admin/staff-reviews", icon: Star },
      { title: "Notifications", url: "/admin/notifications", icon: Bell },
    ],
  },
  {
    label: "Security",
    items: [
      { title: "Audit Logs", url: "/admin/audit-logs", icon: Shield },
    ],
  },
];

const standaloneItems: NavItem[] = [
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
    <Sidebar>
      <SidebarHeader className="border-b border-border p-4">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <TennaHubLogo width={100} height={32} variant="wordmark" />
            <div>
              <h2 className="text-sm font-bold text-foreground">Admin Portal</h2>
              <p className="text-xs text-muted-foreground">TennaHub Technologies</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center">
            <TennaHubLogo width={28} height={28} variant="icon" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {navCategories.map((category) => (
          <Collapsible key={category.label} defaultOpen className="group/collapsible">
            <SidebarGroup>
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="flex w-full items-center gap-2 cursor-pointer select-none">
                  <span className={isCollapsed ? "sr-only" : ""}>{category.label}</span>
                  {!isCollapsed && (
                    <ChevronRight className="ml-auto h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  )}
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {category.items.map((item) => {
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
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        ))}

        {/* Standalone items (Settings) */}
        {standaloneItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <SidebarGroup key={item.title}>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
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
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
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
