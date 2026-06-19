import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, AlertTriangle, Users } from "lucide-react";

const SlowLearners = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", session.user.id).single();
    if (!p?.tenant_id) return;

    const [st, res] = await Promise.all([
      supabase.from("students").select("*").eq("tenant_id", p.tenant_id),
      supabase.from("exam_results").select("*").eq("tenant_id", p.tenant_id),
    ]);
    setStudents(st.data || []);
    setResults(res.data || []);
    setLoading(false);
  };

  const studentAverages: Record<string, { avg: number; count: number }> = {};
  results.forEach(r => {
    if (r.score_achieved != null) {
      if (!studentAverages[r.student_id]) studentAverages[r.student_id] = { avg: 0, count: 0 };
      studentAverages[r.student_id].avg += r.score_achieved;
      studentAverages[r.student_id].count += 1;
    }
  });
  Object.keys(studentAverages).forEach(k => {
    studentAverages[k].avg = Math.round(studentAverages[k].avg / studentAverages[k].count);
  });

  const filtered = students.filter(s => {
    const avg = studentAverages[s.id]?.avg ?? 100;
    const below50 = avg < 50;
    const matchesSearch = search === "" || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.admission_number?.toLowerCase().includes(search.toLowerCase());
    return below50 && matchesSearch;
  });

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold tracking-tight">Slow Learners</h1><p className="text-sm text-muted-foreground">Students performing below 50% average — needs academic intervention</p></div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>{filtered.length} students need intervention</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
              <p>No students below 50% average found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Adm No.</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Full Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Class</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Average</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(s => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-mono">{s.admission_number}</td>
                      <td className="px-4 py-3 text-sm font-medium">{s.full_name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.class_id}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-red-100 text-red-700">{studentAverages[s.id]?.avg ?? "N/A"}%</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{s.status || "Active"}</td>
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

export default SlowLearners;