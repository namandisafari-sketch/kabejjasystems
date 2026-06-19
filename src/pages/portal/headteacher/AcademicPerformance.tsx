import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, TrendingDown, BarChart3, Users, Award, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const AcademicPerformance = () => {
  const navigate = useNavigate();
  const [results, setResults] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", session.user.id).single();
    if (!p?.tenant_id) return;

    const [res, subs] = await Promise.all([
      supabase.from("exam_results").select("*").eq("tenant_id", p.tenant_id),
      supabase.from("subjects").select("id, name, code").eq("tenant_id", p.tenant_id),
    ]);
    setResults(res.data || []);
    setSubjects(subs.data || []);
    setLoading(false);
  };

  const scores = results.map(r => r.score_achieved).filter((s): s is number => s != null);
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "0";
  const highest = scores.length > 0 ? Math.max(...scores) : 0;
  const lowest = scores.length > 0 ? Math.min(...scores) : 0;
  const passCount = scores.filter(s => s >= 50).length;
  const passRate = scores.length > 0 ? ((passCount / scores.length) * 100).toFixed(1) : "0";

  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));
  const bySubject: Record<string, number[]> = {};
  results.forEach(r => {
    if (r.score_achieved != null && r.exam_id) {
      if (!bySubject[r.exam_id]) bySubject[r.exam_id] = [];
      bySubject[r.exam_id].push(r.score_achieved);
    }
  });
  const subjectAvgs = Object.entries(bySubject).map(([id, sc]) => ({
    id, name: subjectMap[id]?.name || id, avg: Math.round((sc.reduce((a, b) => a + b, 0) / sc.length) * 10) / 10, count: sc.length,
  })).sort((a, b) => b.avg - a.avg);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Academic Performance</h1><p className="text-sm text-muted-foreground">School-wide academic performance overview</p></div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><BarChart3 className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">School Average</p><p className="text-2xl font-bold">{avgScore}%</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-green-700" /></div><div><p className="text-xs text-muted-foreground">Highest Score</p><p className="text-2xl font-bold">{highest}%</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center"><TrendingDown className="h-5 w-5 text-red-700" /></div><div><p className="text-xs text-muted-foreground">Lowest Score</p><p className="text-2xl font-bold">{lowest}%</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center"><Award className="h-5 w-5 text-amber-700" /></div><div><p className="text-xs text-muted-foreground">Pass Rate</p><p className="text-2xl font-bold">{passRate}%</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Subject Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subjectAvgs.slice(0, 10).map(s => (
                <div key={s.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{s.name}</span>
                    <span className="text-muted-foreground">{s.avg}% ({s.count} students)</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.avg >= 70 ? "bg-green-500" : s.avg >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${s.avg}%` }} />
                  </div>
                </div>
              ))}
              {subjectAvgs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No performance data available.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Results</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Student</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Exam</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Score</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {results.slice(0, 15).map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm">{r.student_id}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{r.exam_id}</td>
                      <td className="px-4 py-3 text-sm font-medium">{r.score_achieved != null ? `${r.score_achieved}%` : "-"}</td>
                      <td className="px-4 py-3">
                        <Badge className={r.score_achieved >= 50 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {r.score_achieved >= 50 ? "Pass" : "Fail"}
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
    </div>
  );
};

export default AcademicPerformance;