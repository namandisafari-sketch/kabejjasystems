import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStudentSession } from "@/pages/StudentLogin";
import { BarChart3, TrendingUp } from "lucide-react";

export default function StudentPerformance() {
  const session = getStudentSession()!;
  const [termFilter, setTermFilter] = useState("all");

  const { data: terms } = useQuery({
    queryKey: ["student-terms", session.tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("academic_terms")
        .select("id, name")
        .eq("tenant_id", session.tenantId)
        .order("start_date", { ascending: false });
      return data || [];
    },
  });

  const { data: grades } = useQuery({
    queryKey: ["student-grades", session.studentId, termFilter],
    queryFn: async () => {
      let q = supabase
        .from("student_grades")
        .select("score, max_score, grade, assessment_type, subject_id, term_id, subjects(name), academic_terms!inner(name)")
        .eq("student_id", session.studentId)
        .order("created_at", { ascending: false });
      if (termFilter !== "all") q = q.eq("term_id", termFilter);
      const { data } = await q;
      return data || [];
    },
  });

  const bySubject = (grades || []).reduce((acc: any, g: any) => {
    const name = g.subjects?.name || "Unknown";
    if (!acc[name]) acc[name] = [];
    acc[name].push(g);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" /> Academic Performance
          </h1>
          <p className="text-muted-foreground">Your grades and assessment scores</p>
        </div>
        <Select value={termFilter} onValueChange={setTermFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All terms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Terms</SelectItem>
            {terms?.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {Object.entries(bySubject).map(([subject, subjectGrades]) => {
        const scores = subjectGrades as any[];
        const avg = (scores.reduce((s, g) => s + (g.score / g.max_score) * 100, 0) / scores.length).toFixed(1);
        return (
          <Card key={subject}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{subject}</span>
                <span className="text-sm font-normal text-muted-foreground">
                  <TrendingUp className="h-4 w-4 inline mr-1" />
                  Avg: {avg}%
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {scores.map((g, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="capitalize px-2 py-0.5 bg-muted rounded text-xs">{g.assessment_type}</span>
                      <span className="text-muted-foreground">{g.academic_terms?.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${(g.score / g.max_score) >= 0.8 ? "bg-green-500" : (g.score / g.max_score) >= 0.5 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${(g.score / g.max_score) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono w-16 text-right">{g.score}/{g.max_score}</span>
                      {g.grade && <span className="font-bold w-8 text-right">{g.grade}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {(!grades || grades.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No grades recorded yet for this term
          </CardContent>
        </Card>
      )}
    </div>
  );
}
