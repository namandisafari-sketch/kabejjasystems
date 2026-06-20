import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingBag, FileText, LogOut, Settings, X,
  Menu, ShoppingCart, Users, Eye, BarChart3, History, Pill,
  BookOpen, AlertTriangle, Layers, Truck, PackagePlus,
  Wifi, WifiOff, Maximize, Minimize, MessageCircle, Lock,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ThemeToggle";
import SyncStatusBadge from "@/components/pharmacy/SyncStatusBadge";
import NotificationBell from "@/components/pharmacy/NotificationBell";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/business", shortcut: "1" },
  { label: "POS / Sales", icon: ShoppingCart, path: "/business/pos", shortcut: "2" },
  { label: "Inventory", icon: Package, path: "/business/inventory", shortcut: "3" },
  { label: "Stock Purchase", icon: PackagePlus, path: "/business/purchase-orders", shortcut: "4" },
  { label: "Batch Tracking", icon: Layers, path: "/business/inventory?tab=batches", shortcut: "5" },
  { label: "Product Preview", icon: Eye, path: "/business/products", shortcut: "" },
  { label: "Orders", icon: ShoppingBag, path: "/business/sales", shortcut: "6" },
  { label: "Sales History", icon: History, path: "/business/sales", shortcut: "" },
  { label: "Sales Report", icon: FileText, path: "/business/reports", shortcut: "7" },
  { label: "Profit & Loss", icon: BarChart3, path: "/business/accounting", shortcut: "" },
  { label: "Day Book", icon: BookOpen, path: "/business/accounting", shortcut: "" },
  { label: "Accounting", icon: BookOpen, path: "/business/accounting", shortcut: "8" },
  { label: "Expenses", icon: AlertTriangle, path: "/business/expenses", shortcut: "9" },
  { label: "Prescriptions", icon: Pill, path: "/business/prescriptions", shortcut: "" },
  { label: "Patients", icon: Users, path: "/business/patients", shortcut: "0" },
  { label: "Suppliers", icon: Truck, path: "/business/suppliers", shortcut: "" },
  { label: "Stock Alerts", icon: AlertTriangle, path: "/business/stock-alerts", shortcut: "" },
  { label: "Customers", icon: Users, path: "/business/customers", shortcut: "" },
  { label: "WhatsApp Templates", icon: MessageCircle, path: "/business/settings", shortcut: "" },
  { label: "Settings", icon: Settings, path: "/business/settings", shortcut: "" },
];

interface PharmacyAdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

const PharmacyAdminLayout = ({ children, title, subtitle, actions }: PharmacyAdminLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, []);

  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "n") {
        e.preventDefault();
        navigate("/business/inventory?action=new");
      }
      if (e.altKey && e.key >= "0" && e.key <= "9") {
        const item = navItems.find(i => i.shortcut === e.key);
        if (item) { e.preventDefault(); navigate(item.path); }
      }
    };
    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, [navigate]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  };

  const currentPath = location.pathname;

  return (
    <div className="h-screen flex bg-muted/30 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-64 gradient-primary flex flex-col h-full z-10">
            <div className="p-4 border-b border-primary-foreground/10 flex items-center justify-between shrink-0">
              <span className="text-primary-foreground font-bold text-lg">Pharmacy</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-primary-foreground/60 hover:text-primary-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <ScrollArea className="flex-1">
              <nav className="p-3 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      currentPath === item.path
                        ? "bg-primary-foreground/15 text-primary-foreground"
                        : "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </ScrollArea>
            <div className="p-3 border-t border-primary-foreground/10 shrink-0">
              <button
                onClick={() => { localStorage.removeItem("tennahub_business_token"); navigate("/login"); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors w-full"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`${sidebarOpen ? "w-60" : "w-16"} gradient-primary flex-col transition-all duration-200 hidden md:flex h-screen shrink-0`}>
        <div className="p-4 border-b border-primary-foreground/10 flex items-center justify-between shrink-0">
          <span className={`text-primary-foreground font-bold ${sidebarOpen ? "text-lg" : "text-xs"} truncate`}>
            {sidebarOpen ? "Pharmacy" : "Rx"}
          </span>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-primary-foreground/60 hover:text-primary-foreground">
            <Menu className="h-4 w-4" />
          </button>
        </div>
        <ScrollArea className="flex-1">
          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  currentPath === item.path
                    ? "bg-primary-foreground/15 text-primary-foreground"
                    : "text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {sidebarOpen && <span className="flex-1">{item.label}</span>}
                {sidebarOpen && item.shortcut && (
                  <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-primary-foreground/10 text-primary-foreground/50">Alt+{item.shortcut}</kbd>
                )}
              </Link>
            ))}
          </nav>
        </ScrollArea>
        <div className="p-3 border-t border-primary-foreground/10 shrink-0">
          <button
            onClick={() => navigate("/login")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors w-full"
          >
            <LogOut className="h-4 w-4" />
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-background border-b border-border px-4 md:px-6 py-3 md:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-1.5 rounded-lg hover:bg-accent transition-colors">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold">{title}</h1>
              {subtitle && <p className="text-xs md:text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <SyncStatusBadge />
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isOnline ? "bg-green-500/10 text-green-600" : "bg-destructive/10 text-destructive"}`}>
              {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
              {isOnline ? "Online" : "Offline"}
            </div>
            <button onClick={toggleFullscreen} className="hidden sm:flex h-8 w-8 rounded-lg items-center justify-center hover:bg-accent transition-colors" title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
            <NotificationBell />
            <ThemeToggle />
            {actions}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </div>
        <footer className="border-t border-border bg-background px-4 md:px-6 py-2 text-center text-[11px] text-muted-foreground shrink-0">
          System Powered by <span className="font-semibold text-foreground">TennaHub Technologies Limited</span>
          {" \u00B7 "}
          <a href="tel:+256745368426" className="hover:text-primary transition-colors">+256 745 368 426</a>
        </footer>
      </main>
    </div>
  );
};

export default PharmacyAdminLayout;
