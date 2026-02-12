import { 
  LayoutDashboard, ShoppingCart, Users, UserCircle, BarChart3, MapPin, Settings, LogOut, 
  QrCode, Wallet, Bed, CalendarDays, Package, UtensilsCrossed, Receipt, ChefHat,
  Scissors, Calendar, Pill, HeartPulse, Wrench, Cog, PackageMinus, Truck, Tags, AlertTriangle, 
  ClipboardList, CreditCard, Wallet2, Sparkles, GraduationCap, ClipboardCheck, Award, BookOpen, FileText, ScanLine,
  ShieldAlert, Building2, DoorOpen, Calculator, Home, Upload, Shield, Link, UserPlus
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
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import kabejjaLogo from "@/assets/kabejja-logo.png";
import { useTenantModules, moduleRoutes, ecdRouteOverrides, ecdNameOverrides } from "@/hooks/use-tenant-modules";
import { useTenant } from "@/hooks/use-tenant";
import { useStaffPermissions } from "@/hooks/use-staff-permissions";
import { Skeleton } from "@/components/ui/skeleton";

// Icon mapping - keep in sync with MobileBottomNav
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
};

export function BusinessSidebar({ businessName, businessType, devMode }: { businessName?: string; businessType?: string; devMode?: boolean }) {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";
  const { data: tenantData } = useTenant();
  // In dev mode, pass business type to get modules from config instead of DB
  // Also pass the tenant's business type to filter modules by applicability
  const { enabledModules, isLoading } = useTenantModules(
    tenantData?.tenantId, 
    devMode ? businessType : null,
    tenantData?.businessType
  );
  const { isModuleAllowed, hasFullAccess, isLoading: isLoadingPermissions } = useStaffPermissions();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // Check if this is an ECD/Kindergarten business
  const isEcdBusiness = tenantData?.businessType === 'kindergarten' || businessType === 'kindergarten';

  // Build menu items from enabled modules, filtered by staff permissions (skip permission check in dev mode)
  const menuItems = enabledModules
    .filter(module => moduleRoutes[module.code])
    .filter(module => devMode || hasFullAccess || isModuleAllowed(module.code))
    .map(module => {
      // Apply ECD overrides if this is a kindergarten business
      const url = isEcdBusiness && ecdRouteOverrides[module.code] 
        ? ecdRouteOverrides[module.code] 
        : moduleRoutes[module.code].url;
      const name = isEcdBusiness && ecdNameOverrides[module.code]
        ? ecdNameOverrides[module.code]
        : module.name;
      
      // Use icon from moduleRoutes config for consistency with MobileBottomNav
      const iconName = moduleRoutes[module.code]?.icon || module.icon || 'Package';
      
      return {
        title: name,
        url,
        icon: iconMap[iconName] || Package,
        code: module.code,
      };
    })
    .sort((a, b) => {
      // Settings always last
      if (a.code === 'settings') return 1;
      if (b.code === 'settings') return -1;
      // Dashboard always first (handle both regular and rental dashboard)
      const isDashboardA = a.code === 'dashboard' || a.code === 'rental_dashboard';
      const isDashboardB = b.code === 'dashboard' || b.code === 'rental_dashboard';
      if (isDashboardA) return -1;
      if (isDashboardB) return 1;
      return 0;
    });

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-60"}>
      <SidebarHeader className="border-b border-border p-4">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <img src={kabejjaLogo} alt="Kabejja" className="h-8 w-auto" />
            <div>
              <h2 className="text-sm font-bold text-foreground truncate">{businessName || "Business"}</h2>
              <p className="text-xs text-muted-foreground">Management Portal</p>
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
              {(isLoading || (!devMode && isLoadingPermissions)) ? (
                // Loading skeleton
                Array.from({ length: 6 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <div className="flex items-center gap-2 px-2 py-2">
                      <Skeleton className="h-4 w-4" />
                      {!isCollapsed && <Skeleton className="h-4 w-24" />}
                    </div>
                  </SidebarMenuItem>
                ))
              ) : (
                menuItems.map((item) => (
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
                ))
              )}
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