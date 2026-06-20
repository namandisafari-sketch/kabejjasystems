import { 
  LayoutDashboard, ShoppingCart, Users, UserCircle, BarChart3, MapPin, Settings, LogOut, 
  QrCode, Wallet, Bed, CalendarDays, Package, UtensilsCrossed, Receipt, ChefHat,
  Scissors, Calendar, Pill, HeartPulse, Wrench, Cog, PackageMinus, Truck, Tags, AlertTriangle, 
  ClipboardList, CreditCard, Wallet2, Sparkles, GraduationCap, ClipboardCheck, Award, BookOpen, FileText, ScanLine,
  ShieldAlert, Building2, DoorOpen, Calculator, Home, Upload, Shield, Link, UserPlus,
  ChevronRight, Lightbulb, Star, Bell, MessageSquare, BadgeCheck
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useNavigate } from "react-router-dom";
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
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TennaHubLogo } from "@/components/TennaHubLogo";
import { useTenantModules, moduleRoutes, ecdRouteOverrides, ecdNameOverrides } from "@/hooks/use-tenant-modules";
import { useTenant } from "@/hooks/use-tenant";
import { useStaffPermissions } from "@/hooks/use-staff-permissions";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/i18n";
import { getStaffDashboardLabel } from "@/lib/staff-routing";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Receipt,
  Users,
  UserCircle,
  Wallet,
  BarChart3,
  Settings,
  UtensilsCrossed,
  MapPin,
  QrCode,
  ChefHat,
  Bed,
  CalendarDays,
  Scissors,
  Calendar,
  Pill,
  HeartPulse,
  Wrench,
  Cog,
  PackageMinus,
  Truck,
  Tags,
  AlertTriangle,
  ClipboardList,
  CreditCard,
  Wallet2,
  Sparkles,
  GraduationCap,
  ClipboardCheck,
  Award,
  BookOpen,
  FileText,
  ScanLine,
  ShieldAlert,
  Building2,
  DoorOpen,
  Calculator,
  Home,
  Upload,
  Shield,
  Link,
  UserPlus,
  Lightbulb,
  Star,
  Bell,
  MessageSquare,
  BadgeCheck,
};

const categoryLabels: Record<string, string> = {
  core: "General",
  students: "Students",
  school: "School",
  academics: "Academics",
  restaurant: "Restaurant",
  hotel: "Hotel",
  repair: "Repair",
  salon: "Salon",
  pharmacy: "Pharmacy",
  property: "Properties",
  rental: "Rental",
  finance: "Finance",
  people: "People",
  operations: "Operations",
  communication: "Communication",
  analytics: "Analytics",
  admin: "Admin",
  legal: "Legal",
};

const categoryOrder = [
  'core', 'students', 'school', 'academics', 'restaurant', 'hotel', 'repair',
  'salon', 'pharmacy', 'property', 'rental', 'finance', 'people',
  'operations', 'communication', 'analytics', 'admin', 'legal',
];

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  code: string;
  category: string;
}

export function BusinessSidebar({ businessName, businessType, devMode }: { businessName?: string; businessType?: string; devMode?: boolean }) {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isCollapsed = state === "collapsed";
  const { data: tenantData } = useTenant();
  const { enabledModules, isLoading } = useTenantModules(
    tenantData?.tenantId, 
    devMode ? businessType : null,
    tenantData?.businessType
  );
  const { isModuleAllowed, hasFullAccess, staffType, isLoading: isLoadingPermissions } = useStaffPermissions();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const isEcdBusiness = tenantData?.businessType === 'kindergarten' || businessType === 'kindergarten';

  const menuItems: MenuItem[] = enabledModules
    .filter(module => moduleRoutes[module.code])
    .filter(module => devMode || hasFullAccess || isModuleAllowed(module.code))
    .map(module => {
      const url = isEcdBusiness && ecdRouteOverrides[module.code] 
        ? ecdRouteOverrides[module.code] 
        : moduleRoutes[module.code].url;
      const name = isEcdBusiness && ecdNameOverrides[module.code]
        ? ecdNameOverrides[module.code]
        : module.name;
      const iconName = moduleRoutes[module.code]?.icon || module.icon || 'Package';
      return {
        title: name,
        url,
        icon: iconMap[iconName] || Package,
        code: module.code,
        category: module.category,
      };
    });

  const isDashboardItem = (item: MenuItem) =>
    item.code === 'dashboard' || item.code === 'rental_dashboard';

  const dashboardItem = menuItems.find(isDashboardItem);
  const settingsItem = menuItems.find(item => item.code === 'settings');
  const otherItems = menuItems.filter(item => !isDashboardItem(item) && item.code !== 'settings');

  const groupedItems = otherItems.reduce<Record<string, MenuItem[]>>((acc, item) => {
    const cat = item.category || 'core';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  // Role-aware category promotion: bring relevant categories to the top
  const roleCategoryPriority: Record<string, string[]> = {
    bursar: ['finance', 'students', 'school'],
    accountant: ['finance', 'students'],
    guidance_counselor: ['people', 'students'],
    school_nurse: ['people', 'students'],
    discipline_master: ['students', 'people'],
    games_master: ['students', 'people'],
    games_mistress: ['students', 'people'],
    librarian: ['operations', 'school'],
    lab_technician: ['operations', 'school'],
    ict_technician: ['operations', 'school'],
    gate_keeper: ['operations'],
    transport_officer: ['operations'],
    kitchen_staff: ['operations'],
    admissions_officer: ['students', 'school'],
    store_keeper: ['operations', 'finance'],
    procurement_officer: ['operations', 'finance'],
  };
  const prioritizedCategories = roleCategoryPriority[staffType] || [];

  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    const pa = prioritizedCategories.indexOf(a);
    const pb = prioritizedCategories.indexOf(b);
    if (pa !== -1 && pb !== -1) return pa - pb;
    if (pa !== -1) return -1;
    if (pb !== -1) return 1;
    return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
  });

  const staffLabel = !hasFullAccess && staffType !== 'general' && staffType !== 'owner'
    ? getStaffDashboardLabel(staffType)
    : null;

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border p-4">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <TennaHubLogo width={80} height={26} variant="wordmark" />
            <div>
              <h2 className="text-sm font-bold text-foreground truncate">{businessName || "Business"}</h2>
              <p className="text-xs text-muted-foreground">{t.nav.managementPortal}</p>
              {staffLabel && (
                <Badge variant="secondary" className="mt-1 text-xs px-1.5 py-0 h-5">
                  <BadgeCheck className="h-3 w-3 mr-1" />
                  {staffLabel}
                </Badge>
              )}
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center">
            <TennaHubLogo width={24} height={24} variant="icon" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        {(isLoading || (!devMode && isLoadingPermissions)) ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from({ length: 6 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <div className="flex items-center gap-2 px-2 py-2">
                      <Skeleton className="h-4 w-4" />
                      {!isCollapsed && <Skeleton className="h-4 w-24" />}
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            {/* Dashboard (always top) */}
            {dashboardItem && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem key={dashboardItem.code}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={dashboardItem.url}
                          end
                          className="hover:bg-muted/50 flex items-center gap-2"
                          activeClassName="bg-muted text-primary font-medium"
                        >
                          <dashboardItem.icon className="h-4 w-4" />
                          {!isCollapsed && <span>{dashboardItem.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Categorized collapsible groups */}
            {sortedCategories.map((category) => (
              <Collapsible key={category} defaultOpen className="group/collapsible">
                <SidebarGroup>
                  <SidebarGroupLabel asChild>
                    <CollapsibleTrigger className="flex w-full items-center gap-2 cursor-pointer select-none">
                      <span className={isCollapsed ? "sr-only" : ""}>
                        {categoryLabels[category] || category}
                      </span>
                      {!isCollapsed && (
                        <ChevronRight className="ml-auto h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                      )}
                    </CollapsibleTrigger>
                  </SidebarGroupLabel>
                  <CollapsibleContent>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {groupedItems[category].map((item) => (
                          <SidebarMenuItem key={item.code}>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                end={item.url === "/business"}
                                className="hover:bg-muted/50 flex items-center gap-2"
                                activeClassName="bg-muted text-primary font-medium"
                              >
                                <item.icon className="h-4 w-4" />
                                {!isCollapsed && <span>{item.title}</span>}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </CollapsibleContent>
                </SidebarGroup>
              </Collapsible>
            ))}

            {/* Settings (always bottom) */}
            {settingsItem && (
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem key={settingsItem.code}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={settingsItem.url}
                          end
                          className="hover:bg-muted/50 flex items-center gap-2"
                          activeClassName="bg-muted text-primary font-medium"
                        >
                          <settingsItem.icon className="h-4 w-4" />
                          {!isCollapsed && <span>{settingsItem.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        )}
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
          {!isCollapsed && <span className="ml-2 rtl:mr-2 rtl:ml-0">{t.auth.logout}</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
