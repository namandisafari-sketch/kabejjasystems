import { NavLink } from "@/components/NavLink";
import { 
  LayoutDashboard, ShoppingCart, Users, UserCircle, BarChart3, MapPin, Settings, 
  QrCode, Wallet, Bed, CalendarDays, Package, UtensilsCrossed, Receipt, ChefHat,
  Scissors, Calendar, Pill, HeartPulse, Wrench, Cog, PackageMinus, Truck, Tags, AlertTriangle, 
  ClipboardList, CreditCard, Wallet2, Sparkles, GraduationCap, ClipboardCheck, Award, BookOpen, FileText, ScanLine,
  ShieldAlert, Building2, DoorOpen, Calculator, MoreHorizontal
} from "lucide-react";
import { useTenantModules, moduleRoutes, ecdRouteOverrides } from "@/hooks/use-tenant-modules";
import { useTenant } from "@/hooks/use-tenant";
import { useStaffPermissions } from "@/hooks/use-staff-permissions";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";

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
};

// Priority modules to show in bottom nav (max 4 + more)
const priorityModules = ['dashboard', 'rental_dashboard', 'pos', 'products', 'customers', 'reports'];

interface MobileBottomNavProps {
  businessType?: string;
  devMode?: boolean;
}

export function MobileBottomNav({ businessType, devMode }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
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
      
      return {
        title: module.name,
        url,
        icon: iconMap[module.icon || 'Package'] || Package,
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

  // Get priority items for bottom nav (max 4)
  const bottomNavItems = allMenuItems
    .filter(item => priorityModules.includes(item.code))
    .slice(0, 4);

  // Get remaining items for the "More" sheet
  const moreItems = allMenuItems.filter(
    item => !bottomNavItems.find(nav => nav.code === item.code)
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (isLoading || bottomNavItems.length === 0) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.code}
            to={item.url}
            end={item.url === "/business"}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors min-w-[60px]"
            activeClassName="text-primary bg-primary/10"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium truncate max-w-[60px]">{item.title}</span>
          </NavLink>
        ))}

        {/* More button with sheet */}
        {moreItems.length > 0 && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors min-w-[60px]">
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
              <SheetHeader className="pb-4">
                <SheetTitle>More Options</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-4 gap-3 pb-4">
                {moreItems.map((item) => (
                  <NavLink
                    key={item.code}
                    to={item.url}
                    onClick={() => setSheetOpen(false)}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    activeClassName="text-primary bg-primary/10"
                  >
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-medium text-center truncate w-full">{item.title}</span>
                  </NavLink>
                ))}
              </div>
              
              {/* Footer actions */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center justify-between px-2">
                  <span className="text-sm text-muted-foreground">Theme</span>
                  <ThemeToggle />
                </div>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}
