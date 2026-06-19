import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";

const SubjectAverages = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [averages, setAverages] = useState<{ subject: string; avg: number; count: number }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data: profile } = await supabase.from("profiles").select("tenant_id").eq("id", session.user.id).single();
    if (!profile?.tenant_id) return;

    const { data: results } = await supabase
      .from("exam_results")
      .select("id, score_achieved, max_score, exam_id, subjects!inner(name)")
      .eq("tenant_id", profile.tenant_id)
      .limit(500);

    if (results) {
      const map = new Map<string, { total: number; count: number }>();
      for (const r of results) {
        const subj = (r as any).subjects?.name || r.exam_id || "Unknown";
        const pct = r.max_score > 0 ? (r.score_achieved || 0) / r.max_score : 0;
        if (!map.has(subj)) map.set(subj, { total: 0, count: 0 });
        const entry = map.get(subj)!;
        entry.total += pct;
        entry.count++;
      }
      setAverages(
        Array.from(map.entries())
          .map(([subject, v]) => ({ subject, avg: Math.round((v.total / v.count) * 100), count: v.count }))
          .sort((a, b) => b.avg - a.avg)
      );
    }
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subject Averages</h1>
          <p className="text-sm text-muted-foreground">Average performance across all subjects</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Performance by Subject</CardTitle><CardDescription>Average scores calculated from exam results</CardDescription></CardHeader>
        <CardContent>
          {averages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No subject data available yet.</p>
          ) : (
            <div className="space-y-3">
              {averages.map((a, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium flex items-center gap-1"><BookOpen className="h-3 w-3 text-muted-foreground" /> {a.subject}</span>
                    <span className={`font-bold ${a.avg >= 70 ? "text-green-600" : a.avg >= 50 ? "text-amber-600" : "text-red-600"}`}>{a.avg}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${a.avg >= 70 ? "bg-green-500" : a.avg >= 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${a.avg}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{a.count} result{a.count !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubjectAverages;
