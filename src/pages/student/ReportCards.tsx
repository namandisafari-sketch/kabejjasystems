import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStudentSession } from "@/pages/StudentLogin";
import { FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function StudentReportCards() {
  const session = getStudentSession()!;

  const { data: reportCards } = useQuery({
    queryKey: ["student-report-cards", session.studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("student_report_cards")
        .select("id, average_score, overall_grade, overall_achievement, class_rank, total_students_in_class, status, published_at, term_id, academic_terms(name)")
        .eq("student_id", session.studentId)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const getGradeColor = (grade: string) => {
    const g = grade?.toUpperCase();
    if (["A", "A-", "B+"].includes(g)) return "default";
    if (["B", "B-", "C+"].includes(g)) return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" /> Report Cards
        </h1>
        <p className="text-muted-foreground">View and download your report cards</p>
      </div>

      {reportCards?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportCards.map((rc) => (
            <Card key={rc.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{(rc as any).academic_terms?.name || "Report Card"}</span>
                  <Badge variant={getGradeColor(rc.overall_grade || "")}>{rc.overall_grade || "—"}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <span className="text-muted-foreground">Average</span>
                    <p className="font-medium">{rc.average_score?.toFixed(1) || "—"}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Class Rank</span>
                    <p className="font-medium">{rc.class_rank || "—"} / {rc.total_students_in_class || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Achievement</span>
                    <p className="font-medium">{rc.overall_achievement || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Published</span>
                    <p className="font-medium">{rc.published_at ? format(new Date(rc.published_at), "MMM d, yyyy") : "—"}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={`/student/report-cards/${rc.id}`} target="_blank">
                    <Download className="h-4 w-4 mr-1" /> View Full Report
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No published report cards available
          </CardContent>
        </Card>
      )}
    </div>
  );
}
