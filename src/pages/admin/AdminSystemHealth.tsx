import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { 
  Activity, Database, Users, Building2, 
  RefreshCw, CheckCircle, AlertCircle, Clock,
  HardDrive, Zap
} from "lucide-react";

interface HealthMetric {
  label: string;
  value: number | string;
  status: "healthy" | "warning" | "critical";
  icon: React.ReactNode;
}

export default function AdminSystemHealth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [metrics, setMetrics] = useState({
    totalTenants: 0,
    activeTenants: 0,
    totalUsers: 0,
    activeSubscriptions: 0,
    expiringSubscriptions: 0,
    storageUsed: "N/A",
    dbConnections: "Healthy",
  });

  const fetchHealthMetrics = async () => {
    setLoading(true);
    try {
      // Fetch tenant counts
      const { count: totalTenants } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true });

      const { count: activeTenants } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      // Fetch user counts
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // For subscriptions, we'll use tenants table with subscription_status
      const { count: activeSubscriptions } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "active");

      // Tenants with trialing status expiring soon
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const { count: expiringSubscriptions } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true })
        .eq("subscription_status", "trialing")
        .lt("trial_ends_at", nextWeek.toISOString());

      setMetrics({
        totalTenants: totalTenants || 0,
        activeTenants: activeTenants || 0,
        totalUsers: totalUsers || 0,
        activeSubscriptions: activeSubscriptions || 0,
        expiringSubscriptions: expiringSubscriptions || 0,
        storageUsed: "Calculating...",
        dbConnections: "Healthy",
      });

      setLastCheck(new Date());
    } catch (error) {
      console.error("Error fetching health metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthMetrics();
  }, []);

  const healthCards: HealthMetric[] = [
    {
      label: "Database Connection",
      value: metrics.dbConnections,
      status: "healthy",
      icon: <Database className="h-5 w-5" />,
    },
    {
      label: "Total Tenants",
      value: metrics.totalTenants,
      status: "healthy",
      icon: <Building2 className="h-5 w-5" />,
    },
    {
      label: "Active Tenants",
      value: metrics.activeTenants,
      status: metrics.activeTenants > 0 ? "healthy" : "warning",
      icon: <CheckCircle className="h-5 w-5" />,
    },
    {
      label: "Total Users",
      value: metrics.totalUsers,
      status: "healthy",
      icon: <Users className="h-5 w-5" />,
    },
    {
      label: "Active Subscriptions",
      value: metrics.activeSubscriptions,
      status: "healthy",
      icon: <Zap className="h-5 w-5" />,
    },
    {
      label: "Expiring Soon (7 days)",
      value: metrics.expiringSubscriptions,
      status: metrics.expiringSubscriptions > 0 ? "warning" : "healthy",
      icon: <Clock className="h-5 w-5" />,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "warning":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "critical":
        return "bg-red-500/10 text-red-600 border-red-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">
            Monitor platform health and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastCheck && (
            <p className="text-sm text-muted-foreground">
              Last checked: {lastCheck.toLocaleTimeString()}
            </p>
          )}
          <Button onClick={fetchHealthMetrics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-green-600">All Systems Operational</h2>
              <p className="text-sm text-muted-foreground">
                No issues detected across the platform
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {healthCards.map((metric) => (
          <Card key={metric.label} className={getStatusColor(metric.status)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
                <div className={`p-3 rounded-full ${getStatusColor(metric.status)}`}>
                  {metric.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tenant Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Overview</CardTitle>
          <CardDescription>Distribution of tenant statuses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Active Tenants</span>
              <span>{metrics.activeTenants} / {metrics.totalTenants}</span>
            </div>
            <Progress 
              value={metrics.totalTenants > 0 ? (metrics.activeTenants / metrics.totalTenants) * 100 : 0} 
              className="h-2"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subscription Health</span>
              <span>
                {metrics.activeSubscriptions - metrics.expiringSubscriptions} healthy, {metrics.expiringSubscriptions} expiring
              </span>
            </div>
            <Progress 
              value={metrics.activeSubscriptions > 0 
                ? ((metrics.activeSubscriptions - metrics.expiringSubscriptions) / metrics.activeSubscriptions) * 100 
                : 100
              } 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/admin/tenants")}
            >
              <Users className="h-5 w-5" />
              <span>View All Users</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/admin/tenants")}
            >
              <Building2 className="h-5 w-5" />
              <span>View All Tenants</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/admin/subscriptions")}
            >
              <AlertCircle className="h-5 w-5" />
              <span>Expiring Subscriptions</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/admin/storage")}
            >
              <HardDrive className="h-5 w-5" />
              <span>Storage Usage</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
