import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertTriangle, Clock, RotateCcw, BookOpen, BarChart3 } from "lucide-react";

const LessonTracker = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState("");
  const [plans, setPlans] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [completionStatus, setCompletionStatus] = useState<Record<string, boolean>>({});
  const [rolloverReasons, setRolloverReasons] = useState<Record<string, string>>({});

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", session.user.id).single();
    if (!p?.tenant_id) return;
    setTenantId(p.tenant_id);

    const [pl, lg] = await Promise.all([
      supabase.from("lesson_plans").select("*").eq("tenant_id", p.tenant_id).order("created_at", { ascending: false }),
      supabase.from("lesson_plans").select("*").eq("tenant_id", p.tenant_id).eq("status", "completed"),
    ]);
    setPlans(pl.data || []);
    setLogs(lg.data || []);
    setLoading(false);
  };

  const handleStatusChange = async (planId: string, covered: boolean) => {
    setSaving(planId);
    setCompletionStatus(prev => ({ ...prev, [planId]: covered }));

    await supabase.from("lesson_plans").update({
      status: covered ? "completed" : "incomplete",
      updated_at: new Date().toISOString(),
    }).eq("id", planId);

    if (!covered && rolloverReasons[planId]) {
      await supabase.from("lesson_plans").insert({
        tenant_id: tenantId,
        title: `Rollover: ${plans.find(p => p.id === planId)?.title || ""}`,
        status: "draft",
        content: { rollover_from: planId, reason: rolloverReasons[planId] },
      });
    }

    setSaving(null);
    init();
  };

  const plannedCount = plans.filter(p => p.status === "active" || p.status === "submitted").length;
  const completedCount = logs.length;
  const coveragePct = plannedCount > 0 ? Math.round((completedCount / (plannedCount + completedCount)) * 100) : 0;
  const daysBehind = 0;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><BarChart3 className="h-5 w-5 text-primary" /></div>
        <div><h1 className="text-2xl font-bold tracking-tight">Lesson Tracking & Syllabus Coverage</h1><p className="text-sm text-muted-foreground">Audit trail: track what was planned vs what was actually taught</p></div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center"><BookOpen className="h-5 w-5 text-blue-700" /></div>
            <div><p className="text-xs text-muted-foreground">Planned Lessons</p><p className="text-2xl font-bold">{plannedCount + completedCount}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-green-700" /></div>
            <div><p className="text-xs text-muted-foreground">Completed</p><p className="text-2xl font-bold">{completedCount}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center"><BarChart3 className="h-5 w-5 text-purple-700" /></div>
            <div><p className="text-xs text-muted-foreground">Coverage</p><p className="text-2xl font-bold">{coveragePct}%</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${daysBehind > 14 ? "bg-red-100" : "bg-amber-100"}`}>
              <AlertTriangle className={`h-5 w-5 ${daysBehind > 14 ? "text-red-700" : "text-amber-700"}`} />
            </div>
            <div><p className="text-xs text-muted-foreground">Syllabus Drift</p><p className={`text-2xl font-bold ${daysBehind > 14 ? "text-red-600" : "text-amber-600"}`}>{daysBehind} days</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Lesson Progress Log</CardTitle>
            <div className="flex items-center gap-2">
              <select className="h-9 px-3 rounded border text-sm" value={selectedPlan} onChange={e => setSelectedPlan(e.target.value)}>
                <option value="">All lessons</option>
                {plans.filter(p => p.status !== "completed").map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {plans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p>No lesson plans found. Create a lesson plan first.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Lesson</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Subject</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Date</th>
                    <th className="text-center text-xs font-medium text-muted-foreground uppercase px-4 py-3">Competencies Covered</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(selectedPlan ? plans.filter(p => p.id === selectedPlan) : plans).map((p: any) => {
                    const isCompleted = p.status === "completed";
                    const isIncomplete = p.status === "incomplete";
                    return (
                      <tr key={p.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 text-sm font-medium">{p.title}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{p.subject_id || "-"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{p.date || "-"}</td>
                        <td className="px-4 py-3 text-center">
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto" />
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleStatusChange(p.id, true)}
                                className="h-6 w-6 rounded-full border-2 border-green-500 hover:bg-green-50 flex items-center justify-center">
                                <span className="text-green-600 text-xs">✓</span>
                              </button>
                              <button onClick={() => handleStatusChange(p.id, false)}
                                className="h-6 w-6 rounded-full border-2 border-red-300 hover:bg-red-50 flex items-center justify-center">
                                <span className="text-red-400 text-xs">✗</span>
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={isCompleted ? "bg-green-100 text-green-700" : isIncomplete ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-700"}>
                            {isCompleted ? "Covered" : isIncomplete ? "Incomplete" : "Pending"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {!isCompleted && (
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleStatusChange(p.id, true)}
                                className="text-xs text-green-600 hover:underline flex items-center gap-1"
                                disabled={saving === p.id}>
                                <CheckCircle2 className="h-3 w-3" /> Mark Covered
                              </button>
                              <button onClick={() => {
                                const reason = prompt("Why was this not covered? It will be rolled over to the next period:");
                                if (reason) {
                                  setRolloverReasons(prev => ({ ...prev, [p.id]: reason }));
                                  handleStatusChange(p.id, false);
                                }
                              }}
                                className="text-xs text-amber-600 hover:underline flex items-center gap-1"
                                disabled={saving === p.id}>
                                <RotateCcw className="h-3 w-3" /> Roll Over
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LessonTracker;