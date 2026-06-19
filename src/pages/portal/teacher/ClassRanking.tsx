import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, Medal, Award } from "lucide-react";

const ClassRanking = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<{ student: string; total: number; avg: number; count: number }[]>([]);

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
      .select("id, score_achieved, max_score, student_id")
      .eq("tenant_id", profile.tenant_id)
      .limit(1000);

    if (results) {
      const map = new Map<string, { total: number; count: number }>();
      for (const r of results) {
        const pct = r.max_score > 0 ? (r.score_achieved || 0) / r.max_score : 0;
        if (!map.has(r.student_id)) map.set(r.student_id, { total: 0, count: 0 });
        const entry = map.get(r.student_id)!;
        entry.total += pct;
        entry.count++;
      }
      setRankings(
        Array.from(map.entries())
          .map(([student, v]) => ({ student, total: v.total, avg: Math.round((v.total / v.count) * 100), count: v.count }))
          .sort((a, b) => b.avg - a.avg)
      );
    }
    setLoading(false);
  };

  const rankIcon = (i: number) => {
    if (i === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (i === 1) return <Medal className="h-4 w-4 text-gray-400" />;
    if (i === 2) return <Award className="h-4 w-4 text-amber-600" />;
    return null;
  };

  if (loading) return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Class Ranking</h1>
          <p className="text-sm text-muted-foreground">Student rankings based on overall performance</p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-3">
        {rankings.slice(0, 3).map((r, i) => (
          <Card key={i} className={i === 0 ? "border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/10" : ""}>
            <CardContent className="flex flex-col items-center py-6">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">{rankIcon(i)}</div>
              <p className="font-bold text-lg">{i + 1}</p>
              <p className="text-sm font-medium text-center truncate max-w-full">{r.student}</p>
              <Badge className="mt-1" variant={i === 0 ? "default" : "secondary"}>{r.avg}%</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Full Rankings</CardTitle><CardDescription>All students ranked by average score</CardDescription></CardHeader>
        <CardContent>
          {rankings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No results data to calculate rankings.</p>
          ) : (
            <div className="space-y-1">
              {rankings.map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg even:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-6 text-right">{i + 1}</span>
                    {rankIcon(i)}
                    <span className="text-sm font-medium">{r.student}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{r.count} exams</span>
                    <span className={`text-sm font-bold w-12 text-right ${r.avg >= 70 ? "text-green-600" : r.avg >= 50 ? "text-amber-600" : "text-red-600"}`}>{r.avg}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassRanking;
