import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, Clock, UserCheck, UserX } from "lucide-react";

const LeaveManagement = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", session.user.id).single();
    if (!p?.tenant_id) return;

    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("tenant_id", p.tenant_id)
      .order("full_name");
    setEmployees(data || []);
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const activeStaff = employees.filter(e => e.is_active !== false);
  const onLeave = employees.filter(e => e.is_active === false);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Leave Management</h1><p className="text-sm text-muted-foreground">Track staff leave and absences</p></div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center"><UserCheck className="h-5 w-5 text-blue-700" /></div><div><p className="text-xs text-muted-foreground">Active Staff</p><p className="text-2xl font-bold">{activeStaff.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center"><UserX className="h-5 w-5 text-red-700" /></div><div><p className="text-xs text-muted-foreground">On Leave</p><p className="text-2xl font-bold">{onLeave.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center"><Calendar className="h-5 w-5 text-amber-700" /></div><div><p className="text-xs text-muted-foreground">Total Staff</p><p className="text-2xl font-bold">{employees.length}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center"><Clock className="h-5 w-5 text-green-700" /></div><div><p className="text-xs text-muted-foreground">Attendance Rate</p><p className="text-2xl font-bold">{employees.length > 0 ? Math.round((activeStaff.length / employees.length) * 100) : 0}%</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Staff Roster</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Role</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Department</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Email</th>
                  <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {employees.map((e: any) => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-medium">{e.full_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{e.role}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{e.department || "-"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{e.email}</td>
                    <td className="px-4 py-3">
                      <Badge className={e.is_active !== false ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {e.is_active !== false ? "Active" : "On Leave"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveManagement;