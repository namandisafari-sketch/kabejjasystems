import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ExamManagement = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState<any[]>([]);
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

    const { data } = await supabase
      .from("exams")
      .select("*")
      .eq("tenant_id", p.tenant_id)
      .order("exam_date", { ascending: false });

    setExams(data || []);
    setLoading(false);
  };

  const statusColor = (s: string) => {
    const map: Record<string, string> = {
      scheduled: "bg-blue-100 text-blue-700", ongoing: "bg-green-100 text-green-700",
      completed: "bg-gray-100 text-gray-700", cancelled: "bg-red-100 text-red-700",
    };
    return map[s] || "";
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Examination Management</h1>
          <p className="text-sm text-muted-foreground">Create and manage school exams</p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" /> Create Exam</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {exams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No exams scheduled.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Class</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Subject</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Duration</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Max Marks</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Venue</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {exams.map((e: any) => (
                    <tr key={e.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm">{e.class_id}</td>
                      <td className="px-4 py-3 text-sm">{e.subject_id}</td>
                      <td className="px-4 py-3 text-sm">{e.exam_date}</td>
                      <td className="px-4 py-3 text-sm">{e.duration_minutes ? `${e.duration_minutes} min` : "-"}</td>
                      <td className="px-4 py-3 text-sm">{e.max_marks || "-"}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusColor(e.status)}>{e.status || "Scheduled"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{e.venue || "-"}</td>
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

export default ExamManagement;
