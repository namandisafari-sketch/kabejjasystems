import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/hooks/use-tenant";
import { useStaffPermissions } from "@/hooks/use-staff-permissions";
import { Link } from "react-router-dom";
import {
  BookOpen, Wrench, Monitor, Bus, UtensilsCrossed,
  Shield, Settings, Package, ClipboardList,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const SupportDashboard = () => {
  const { data: tenant } = useTenant();
  const { staffType } = useStaffPermissions();

  const isLibrarian = staffType === 'librarian';
  const isLabTech = staffType === 'lab_technician';
  const isICT = staffType === 'ict_technician';
  const isGate = staffType === 'gate_keeper';
  const isTransport = staffType === 'transport_officer';
  const isKitchen = staffType === 'kitchen_staff';
  const isSection = staffType === 'head_of_section';

  const { data: gateLogsToday = 0 } = useQuery({
    queryKey: ['gate-logs-today', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return 0;
      const today = new Date().toISOString().split('T')[0];
      const { count } = await supabase
        .from('gate_checkins')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.tenantId)
        .gte('check_in_time', today);
      return count || 0;
    },
    enabled: !!tenant?.tenantId && isGate,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Support Dashboard</h1>
        <p className="text-muted-foreground">School operations & support services</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {isLibrarian && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Library</CardTitle>
              <BookOpen className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Book inventory & borrowing</p>
            </CardContent>
          </Card>
        )}
        {isLabTech && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Laboratory</CardTitle>
              <Wrench className="h-4 w-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Lab equipment & materials</p>
            </CardContent>
          </Card>
        )}
        {isICT && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">ICT</CardTitle>
              <Monitor className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Computer lab & IT equipment</p>
            </CardContent>
          </Card>
        )}
        {isGate && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Today's Check-ins</CardTitle>
              <Shield className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{gateLogsToday}</div>
              <p className="text-xs text-muted-foreground">Gate entries today</p>
            </CardContent>
          </Card>
        )}
        {isTransport && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Transport</CardTitle>
              <Bus className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Fleet & route management</p>
            </CardContent>
          </Card>
        )}
        {isKitchen && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Kitchen</CardTitle>
              <UtensilsCrossed className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Meal planning & inventory</p>
            </CardContent>
          </Card>
        )}
        {isSection && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Section</CardTitle>
              <ClipboardList className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Section oversight</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {isLibrarian && (
              <>
                <Link to="/business/inventory">
                  <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                    <BookOpen className="h-5 w-5" />
                    <span className="text-xs">Inventory</span>
                  </Button>
                </Link>
              </>
            )}
            {isGate && (
              <Link to="/business/gate-checkin">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Shield className="h-5 w-5" />
                  <span className="text-xs">Gate Check-in</span>
                </Button>
              </Link>
            )}
            {isGate && (
              <Link to="/business/visitor-register">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <ClipboardList className="h-5 w-5" />
                  <span className="text-xs">Visitor Register</span>
                </Button>
              </Link>
            )}
            {(isLibrarian || isLabTech || isICT) && (
              <Link to="/business/assets">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Package className="h-5 w-5" />
                  <span className="text-xs">Assets</span>
                </Button>
              </Link>
            )}
            {(isKitchen || isTransport) && (
              <Link to="/business/expenses">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Settings className="h-5 w-5" />
                  <span className="text-xs">Expenses</span>
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupportDashboard;
