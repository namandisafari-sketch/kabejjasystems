import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, UserCheck, UserX } from "lucide-react";

const PromotionLists = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", session.user.id).single();
    if (!p?.tenant_id) return;
    setTenantId(p.tenant_id);

    const [st, pr, cl] = await Promise.all([
      supabase.from("students").select("*").eq("tenant_id", p.tenant_id).order("full_name"),
      supabase.from("promotion_decisions").select("*").eq("tenant_id", p.tenant_id).order("created_at", { ascending: false }),
      supabase.from("school_classes").select("id, name, level").eq("tenant_id", p.tenant_id).eq("is_active", true),
    ]);
    setStudents(st.data || []);
    setPromotions(pr.data || []);
    setClasses(cl.data || []);
    setLoading(false);
  };

  const promoteStudent = async (studentId: string, toClassId: string) => {
    await supabase.from("promotion_decisions").insert({
      tenant_id: tenantId, student_id: studentId, to_class_id: toClassId,
      decision: "promote", academic_year: new Date().getFullYear().toString(),
    });
    loadData();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Promotion Lists</h1><p className="text-sm text-muted-foreground">Manage student promotions to next class</p></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Active Promotions</CardTitle></CardHeader>
          <CardContent className="p-0">
            {promotions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No promotions recorded.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Student</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">To Class</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Decision</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Year</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {promotions.map((pr: any) => (
                      <tr key={pr.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm">{pr.student_id}</td>
                        <td className="px-4 py-3 text-sm">{pr.to_class_id}</td>
                        <td className="px-4 py-3">
                          <Badge className={pr.decision === "promote" ? "bg-green-100 text-green-700" : pr.decision === "repeat" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                            {pr.decision || "Pending"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{pr.academic_year}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Promote Students</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {students.filter(s => s.status === "active").slice(0, 10).map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">{s.full_name}</p>
                  <p className="text-xs text-muted-foreground">{s.admission_number} | Class: {s.class_id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select className="h-8 text-xs rounded border px-2" onChange={e => promoteStudent(s.id, e.target.value)} defaultValue="">
                    <option value="" disabled>Promote to...</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            ))}
            {students.filter(s => s.status === "active").length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No active students to promote.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PromotionLists;