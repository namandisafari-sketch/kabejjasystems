import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/hooks/use-tenant";
import { useStaffPermissions } from "@/hooks/use-staff-permissions";
import { Link } from "react-router-dom";
import {
  HeartPulse, Users, AlertTriangle, Activity,
  Stethoscope, Shield, MessageSquare, Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const WelfareDashboard = () => {
  const { data: tenant } = useTenant();
  const { staffType } = useStaffPermissions();

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

  const { data: disciplineCases = [] } = useQuery({
    queryKey: ['welfare-discipline', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data } = await supabase
        .from('discipline_cases')
        .select('id, status, severity, created_at')
        .eq('tenant_id', tenant.tenantId)
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!tenant?.tenantId,
  });

  const { data: counselingSessions = [] } = useQuery({
    queryKey: ['welfare-counseling', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data } = await supabase
        .from('counseling_sessions')
        .select('id, status, session_date')
        .eq('tenant_id', tenant.tenantId)
        .order('session_date', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!tenant?.tenantId,
  });

  const openCases = disciplineCases.filter(c => c.status === 'open' || c.status === 'pending').length;
  const pendingSessions = counselingSessions.filter(s => s.status === 'scheduled' || s.status === 'pending').length;

  const isNurse = staffType === 'school_nurse';
  const isCounselor = staffType === 'guidance_counselor';
  const isGames = staffType === 'games_master' || staffType === 'games_mistress';
  const isBoarding = staffType === 'boarding_master' || staffType === 'boarding_mistress' || staffType === 'matron' || staffType === 'hostel_warden';
  const isDiscipline = staffType === 'discipline_master';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welfare Dashboard</h1>
          <p className="text-muted-foreground">Student welfare & well-being overview</p>
        </div>
        {currentTerm && (
          <Badge variant="secondary" className="text-sm">
            <Calendar className="h-3 w-3 mr-1" />
            {currentTerm.name} ({currentTerm.year})
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {isDiscipline && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Open Cases</CardTitle>
              <Shield className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{openCases}</div>
              <p className="text-xs text-muted-foreground">Discipline cases</p>
            </CardContent>
          </Card>
        )}
        {isCounselor && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Sessions</CardTitle>
              <MessageSquare className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{pendingSessions}</div>
              <p className="text-xs text-muted-foreground">Counseling sessions</p>
            </CardContent>
          </Card>
        )}
        {isNurse && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Health Center</CardTitle>
              <HeartPulse className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Medical records & sick bay</p>
            </CardContent>
          </Card>
        )}
        {isGames && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sports</CardTitle>
              <Activity className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Games & sports management</p>
            </CardContent>
          </Card>
        )}
        {isBoarding && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Hostels</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Boarding & hostel management</p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {isDiscipline && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Recent Discipline Cases
              </CardTitle>
              <Link to="/business/discipline-cases">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {disciplineCases.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No discipline cases</p>
              ) : (
                <div className="space-y-3">
                  {disciplineCases.map((c: any) => (
                    <div key={c.id} className="border rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <Badge variant={c.severity === 'high' ? 'destructive' : c.severity === 'medium' ? 'default' : 'secondary'}>
                          {c.severity}
                        </Badge>
                      </div>
                      <Badge variant="outline">{c.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {isCounselor && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Recent Counseling Sessions
              </CardTitle>
              <Link to="/business/counseling">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {counselingSessions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No sessions recorded</p>
              ) : (
                <div className="space-y-3">
                  {counselingSessions.map((s: any) => (
                    <div key={s.id} className="border rounded-lg p-3 flex items-center justify-between">
                      <span className="text-sm">{new Date(s.session_date).toLocaleDateString()}</span>
                      <Badge variant="outline">{s.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
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
            {(isDiscipline || isCounselor) && (
              <Link to="/business/students">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Users className="h-5 w-5" />
                  <span className="text-xs">Students</span>
                </Button>
              </Link>
            )}
            {isCounselor && (
              <Link to="/business/counseling">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <MessageSquare className="h-5 w-5" />
                  <span className="text-xs">Counseling</span>
                </Button>
              </Link>
            )}
            {isDiscipline && (
              <Link to="/business/discipline-cases">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Shield className="h-5 w-5" />
                  <span className="text-xs">Discipline</span>
                </Button>
              </Link>
            )}
            {isNurse && (
              <Link to="/business/patients">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <HeartPulse className="h-5 w-5" />
                  <span className="text-xs">Sick Bay</span>
                </Button>
              </Link>
            )}
            {isGames && (
              <Link to="/business/students">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Activity className="h-5 w-5" />
                  <span className="text-xs">Sports</span>
                </Button>
              </Link>
            )}
            {isBoarding && (
              <Link to="/business/students">
                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                  <Users className="h-5 w-5" />
                  <span className="text-xs">Hostels</span>
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WelfareDashboard;
