import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SubjectAllocation = () => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<any[]>([]);
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
      .from("teacher_subject_assignments")
      .select("*, subjects(name), profiles:teacher_id(full_name)")
      .eq("tenant_id", p.tenant_id);

    setAssignments(data || []);
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Subject Allocation</h1>
        <p className="text-sm text-muted-foreground">Teacher subject and class assignments</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {assignments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No subject allocations yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Teacher</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Subject</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Class</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {assignments.map((a: any) => (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{a.profiles?.full_name || a.teacher_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{a.subjects?.name || a.subject_id}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{a.class_id || "All classes"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</td>
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

export default SubjectAllocation;
