import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/hooks/use-tenant";
import { Link } from "react-router-dom";
import {
  UserPlus, Users, FileText, Calendar,
  CheckCircle2, Clock, XCircle, BarChart3,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const AdmissionsDashboard = () => {
  const { data: tenant } = useTenant();

  const { data: currentTerm } = useQuery({
    queryKey: ['current-term', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return null;
      const { data } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('tenant_id', tenant.tenantId)
        .eq('is_current', true)
        .maybeSingle();
      return data;
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: totalStudents = 0 } = useQuery({
    queryKey: ['admissions-total-students', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return 0;
      const { count } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.tenantId);
      return count || 0;
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: admissionLinks = 0 } = useQuery({
    queryKey: ['admissions-links-count', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return 0;
      const { count } = await supabase
        .from('admission_links')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.tenantId);
      return count || 0;
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: pendingConfirmations = 0 } = useQuery({
    queryKey: ['admissions-pending', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return 0;
      const { count } = await supabase
        .from('admission_confirmations')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.tenantId)
        .eq('status', 'pending');
      return count || 0;
    },
    enabled: !!tenant?.tenantId,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admissions Dashboard</h1>
          <p className="text-muted-foreground">Student enrollment & admission management</p>
        </div>
        {currentTerm && (
          <Badge variant="secondary" className="text-sm">
            <Calendar className="h-3 w-3 mr-1" />
            {currentTerm.name} ({currentTerm.year})
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">Enrolled</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admission Links</CardTitle>
            <FileText className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{admissionLinks}</div>
            <p className="text-xs text-muted-foreground">Created</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Confirmations</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{pendingConfirmations}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/business/students">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Users className="h-5 w-5" />
                <span className="text-xs">Students</span>
              </Button>
            </Link>
            <Link to="/business/admission-links">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <FileText className="h-5 w-5" />
                <span className="text-xs">Admission Links</span>
              </Button>
            </Link>
            <Link to="/business/admission-confirmations">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-xs">Confirmations</span>
              </Button>
            </Link>
            <Link to="/business/student-lifecycle">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <BarChart3 className="h-5 w-5" />
                <span className="text-xs">Lifecycle</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdmissionsDashboard;
