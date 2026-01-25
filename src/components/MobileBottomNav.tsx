import { NavLink } from "@/components/NavLink";
import { 
  LayoutDashboard, ShoppingCart, Users, UserCircle, BarChart3, MapPin, Settings, 
  QrCode, Wallet, Bed, CalendarDays, Package, UtensilsCrossed, Receipt, ChefHat,
  Scissors, Calendar, Pill, HeartPulse, Wrench, Cog, PackageMinus, Truck, Tags, AlertTriangle, 
  ClipboardList, CreditCard, Wallet2, Sparkles, GraduationCap, ClipboardCheck, Award, BookOpen, FileText, ScanLine,
  ShieldAlert, Building2, DoorOpen, Calculator, Home, LogOut
} from "lucide-react";
import { useTenantModules, moduleRoutes, ecdRouteOverrides } from "@/hooks/use-tenant-modules";
import { useTenant } from "@/hooks/use-tenant";
import { useStaffPermissions } from "@/hooks/use-staff-permissions";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

// Icon mapping for bottom nav - matches BusinessSidebar
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
};

interface MobileBottomNavProps {
  businessType?: string;
  devMode?: boolean;
}

export function MobileBottomNav({ businessType, devMode }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const { data: tenantData } = useTenant();
  const { enabledModules, isLoading } = useTenantModules(
    tenantData?.tenantId, 
    devMode ? businessType : null,
    tenantData?.businessType
  );
  const { isModuleAllowed, hasFullAccess } = useStaffPermissions();

  const isEcdBusiness = tenantData?.businessType === 'kindergarten' || businessType === 'kindergarten';

  // Build menu items from enabled modules
  const allMenuItems = enabledModules
    .filter(module => moduleRoutes[module.code])
    .filter(module => devMode || hasFullAccess || isModuleAllowed(module.code))
    .map(module => {
      const url = isEcdBusiness && ecdRouteOverrides[module.code] 
        ? ecdRouteOverrides[module.code] 
        : moduleRoutes[module.code].url;
      
      // Use icon from moduleRoutes config (consistent with BusinessSidebar)
      const iconName = moduleRoutes[module.code]?.icon || module.icon || 'Package';
      
      return {
        title: module.name,
        url,
        icon: iconMap[iconName] || Package,
        code: module.code,
      };
    })
    .sort((a, b) => {
      if (a.code === 'settings') return 1;
      if (b.code === 'settings') return -1;
      const isDashboardA = a.code === 'dashboard' || a.code === 'rental_dashboard';
      const isDashboardB = b.code === 'dashboard' || b.code === 'rental_dashboard';
      if (isDashboardA) return -1;
      if (isDashboardB) return 1;
      return 0;
    });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (isLoading || allMenuItems.length === 0) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom md:hidden">
      <div className="flex items-center overflow-x-auto scrollbar-hide h-16 px-1 gap-1">
        {allMenuItems.map((item) => (
          <NavLink
            key={item.code}
            to={item.url}
            end={item.url === "/business"}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors min-w-[64px] flex-shrink-0"
            activeClassName="text-primary bg-primary/10"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium truncate max-w-[64px]">{item.title}</span>
          </NavLink>
        ))}

        {/* Logout button at the end */}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors min-w-[64px] flex-shrink-0"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
}
