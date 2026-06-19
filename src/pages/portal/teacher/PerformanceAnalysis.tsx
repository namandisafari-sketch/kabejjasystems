import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, TrendingDown, BarChart3, Award, BookOpen } from "lucide-react";

const PerformanceAnalysis = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalExams: 0, avgScore: 0, highest: 0, lowest: 0, passRate: 0 });
  const [recentResults, setRecentResults] = useState<any[]>([]);

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
      .select("id, score_achieved, max_score, exam_id, student_id, remarks")
      .eq("tenant_id", profile.tenant_id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (results && results.length > 0) {
      const scores = results.map(r => r.score_achieved || 0);
      const maxScores = results.map(r => r.max_score || 100);
      const percentages = results.map((r, i) => maxScores[i] > 0 ? (scores[i] / maxScores[i]) * 100 : 0);
      setStats({
        totalExams: results.length,
        avgScore: Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length),
        highest: Math.round(Math.max(...percentages)),
        lowest: Math.round(Math.min(...percentages)),
        passRate: Math.round((percentages.filter(p => p >= 50).length / percentages.length) * 100),
      });
      setRecentResults(results.slice(0, 10));
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Performance Analysis</h1>
          <p className="text-sm text-muted-foreground">Overall student performance metrics and trends</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Records</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.totalExams}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><BarChart3 className="h-3 w-3" /> Average Score</CardTitle></CardHeader><CardContent className="flex items-baseline gap-1"><p className="text-2xl font-bold">{stats.avgScore}%</p>{stats.avgScore >= 50 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Award className="h-3 w-3" /> Highest</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600">{stats.highest}%</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Lowest</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600">{stats.lowest}%</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pass Rate</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{stats.passRate}%</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Recent Results</CardTitle><CardDescription>Latest exam submissions</CardDescription></CardHeader>
        <CardContent>
          {recentResults.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No exam results found for your school.</p>
          ) : (
            <div className="space-y-2">
              {recentResults.map((r, i) => {
                const pct = r.max_score > 0 ? Math.round((r.score_achieved / r.max_score) * 100) : 0;
                return (
                  <div key={r.id || i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{r.student_id}</p>
                      <p className="text-xs text-muted-foreground">{r.exam_id} {pct >= 50 ? "✅" : "📝"}</p>
                    </div>
                    <div className={`text-sm font-bold ${pct >= 70 ? "text-green-600" : pct >= 50 ? "text-amber-600" : "text-red-600"}`}>{pct}%</div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceAnalysis;
