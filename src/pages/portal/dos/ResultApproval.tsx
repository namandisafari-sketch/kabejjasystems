import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

const ResultApproval = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", session.user.id).single();
    if (!p?.tenant_id) return;

    const { data } = await supabase
      .from("exam_results")
      .select("*")
      .eq("tenant_id", p.tenant_id)
      .order("submitted_at", { ascending: false });
    setResults(data || []);
    setLoading(false);
  };

  const handleApproval = async (id: string, approved: boolean) => {
    await supabase.from("exam_results").update({
      status: approved ? "approved" : "rejected",
    }).eq("id", id);
    loadData();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Result Approval</h1><p className="text-sm text-muted-foreground">Approve or reject submitted exam results</p></div>

      <Card>
        <CardContent className="p-0">
          {results.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No results pending approval.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Student</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Exam</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Score</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Submitted</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {results.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm">{r.student_id}</td>
                      <td className="px-4 py-3 text-sm">{r.exam_id}</td>
                      <td className="px-4 py-3 text-sm font-medium">{r.score_achieved != null ? `${r.score_achieved}%` : "-"}</td>
                      <td className="px-4 py-3">
                        <Badge className={r.status === "approved" ? "bg-green-100 text-green-700" : r.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}>
                          {r.status || "Pending"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "-"}</td>
                      <td className="px-4 py-3 text-right">
                        {r.status !== "approved" && (
                          <Button variant="ghost" size="sm" className="text-green-600" onClick={() => handleApproval(r.id, true)}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        {r.status !== "rejected" && (
                          <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleApproval(r.id, false)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
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

export default ResultApproval;