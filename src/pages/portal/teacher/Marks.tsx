import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Marks = () => {
  const navigate = useNavigate();
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }

    const { data: p } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", session.user.id)
      .single();
    if (!p?.tenant_id) return;
    setTenantId(p.tenant_id);

    const { data } = await supabase
      .from("student_grades")
      .select("*")
      .eq("tenant_id", p.tenant_id)
      .order("created_at", { ascending: false })
      .limit(100);

    setGrades(data || []);
    setLoading(false);
  };

  const gradeColor = (g: string | null) => {
    if (!g) return "";
    const map: Record<string, string> = {
      A: "bg-green-100 text-green-700", B: "bg-blue-100 text-blue-700",
      C: "bg-amber-100 text-amber-700", D: "bg-orange-100 text-orange-700",
      E: "bg-red-100 text-red-700", F: "bg-red-200 text-red-800",
    };
    return map[g] || "";
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Marks Management</h1>
          <p className="text-sm text-muted-foreground">Student assessment scores and grades</p>
        </div>
        <Button>Enter New Marks</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {grades.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No marks recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Student</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Subject</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Score</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Max</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Grade</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {grades.map((g) => (
                    <tr key={g.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm">{g.student_id}</td>
                      <td className="px-4 py-3 text-sm">{g.subject_id}</td>
                      <td className="px-4 py-3 text-sm">{g.assessment_type}</td>
                      <td className="px-4 py-3 text-sm font-medium">{g.score}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{g.max_score}</td>
                      <td className="px-4 py-3">
                        {g.grade && <Badge className={gradeColor(g.grade)}>{g.grade}</Badge>}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{g.remarks || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Marks;
