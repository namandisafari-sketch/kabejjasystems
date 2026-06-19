import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Trophy, Medal, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const TopStudents = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

    const { data: grades } = await supabase
      .from("student_grades")
      .select("student_id, score, max_score")
      .eq("tenant_id", p.tenant_id);

    if (grades && grades.length > 0) {
      const grouped: Record<string, { scores: number[]; maxScores: number[] }> = {};
      grades.forEach((g: any) => {
        if (!grouped[g.student_id]) grouped[g.student_id] = { scores: [], maxScores: [] };
        grouped[g.student_id].scores.push(g.score || 0);
        grouped[g.student_id].maxScores.push(g.max_score || 100);
      });

      const { data: studentNames } = await supabase
        .from("students")
        .select("id, full_name, class_id")
        .eq("tenant_id", p.tenant_id)
        .in("id", Object.keys(grouped));

      const nameMap: Record<string, any> = {};
      studentNames?.forEach((s: any) => { nameMap[s.id] = s; });

      const ranked = Object.entries(grouped)
        .map(([id, data]) => {
          const totalPct = data.scores.reduce((a, b, i) => a + (b / (data.maxScores[i] || 100)) * 100, 0) / data.scores.length;
          return { student_id: id, name: nameMap[id]?.full_name || id, class: nameMap[id]?.class_id || "-", average: Math.round(totalPct * 10) / 10 };
        })
        .sort((a, b) => b.average - a.average)
        .slice(0, 20);

      setStudents(ranked);
    }
    setLoading(false);
  };

  const rankIcon = (i: number) => {
    if (i === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (i === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (i === 2) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{i + 1}</span>;
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Top Students</h1>
        <p className="text-sm text-muted-foreground">Students ranked by academic performance</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {students.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No performance data available yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Rank</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Student Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Class</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((s, i) => (
                    <tr key={s.student_id} className={`hover:bg-muted/30 ${i < 3 ? "bg-amber-50/50" : ""}`}>
                      <td className="px-4 py-3">{rankIcon(i)}</td>
                      <td className="px-4 py-3 text-sm font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.class}</td>
                      <td className="px-4 py-3">
                        <Badge className={s.average >= 80 ? "bg-green-100 text-green-700" : s.average >= 60 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>
                          {s.average}%
                        </Badge>
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

export default TopStudents;
