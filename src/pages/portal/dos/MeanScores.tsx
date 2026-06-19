import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calculator, BookOpen } from "lucide-react";

const MeanScores = () => {
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

  const subjectMap = Object.fromEntries(subjects.map(s => [s.id, s]));

  const scoresBySubject: Record<string, number[]> = {};
  results.forEach(r => {
    if (r.score_achieved != null) {
      const key = r.exam_id || "unknown";
      if (!scoresBySubject[key]) scoresBySubject[key] = [];
      scoresBySubject[key].push(r.score_achieved);
    }
  });

  const subjectAverages = Object.entries(scoresBySubject).map(([examId, scores]) => {
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return { examId, avg: Math.round(avg * 10) / 10, count: scores.length, max: Math.max(...scores), min: Math.min(...scores) };
  }).sort((a, b) => b.avg - a.avg);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Mean Scores Analysis</h1><p className="text-sm text-muted-foreground">Average scores by subject / examination</p></div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Calculator className="h-5 w-5 text-muted-foreground" /> Subject Mean Scores</CardTitle></CardHeader>
        <CardContent className="p-0">
          {subjectAverages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No exam results available for analysis.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Exam / Subject</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Students</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Mean Score</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Highest</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Lowest</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Visual</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subjectAverages.map((s, i) => (
                    <tr key={s.examId} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium">{s.examId}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.count}</td>
                      <td className="px-4 py-3 text-sm font-bold">{s.avg}%</td>
                      <td className="px-4 py-3 text-sm text-green-600 font-medium">{s.max}%</td>
                      <td className="px-4 py-3 text-sm text-red-600 font-medium">{s.min}%</td>
                      <td className="px-4 py-3">
                        <div className="h-3 w-full bg-muted rounded-full overflow-hidden max-w-[200px]">
                          <div className={`h-full rounded-full ${s.avg >= 70 ? "bg-green-500" : s.avg >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${s.avg}%` }} />
                        </div>
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

export default MeanScores;