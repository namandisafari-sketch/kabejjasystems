import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, ArrowLeft } from "lucide-react";

const CreateExam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [tenantId, setTenantId] = useState("");
  const [form, setForm] = useState({
    class_id: "", subject_id: "", exam_date: "", start_time: "",
    duration_minutes: "", max_marks: "", venue: "", status: "scheduled",
  });

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }

    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", session.user.id).single();
    if (!p?.tenant_id) return;
    setTenantId(p.tenant_id);

    const [cl, sb] = await Promise.all([
      supabase.from("school_classes").select("id, name, level").eq("tenant_id", p.tenant_id).eq("is_active", true),
      supabase.from("subjects").select("id, name, code").eq("tenant_id", p.tenant_id).eq("is_active", true),
    ]);
    setClasses(cl.data || []);
    setSubjects(sb.data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await supabase.from("exams").insert({
      tenant_id: tenantId, class_id: form.class_id, subject_id: form.subject_id,
      exam_date: form.exam_date || null, start_time: form.start_time || null,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      max_marks: form.max_marks ? parseInt(form.max_marks) : null,
      venue: form.venue || null, status: "scheduled",
    });

    setLoading(false);
    navigate("/dos/exams");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dos/exams")}><ArrowLeft className="h-5 w-5" /></Button>
        <div><h1 className="text-2xl font-bold tracking-tight">Create Exam</h1><p className="text-sm text-muted-foreground">Schedule a new examination</p></div>
      </div>

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Class</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.class_id} onChange={e => setForm({...form, class_id: e.target.value})} required>
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.subject_id} onChange={e => setForm({...form, subject_id: e.target.value})} required>
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Exam Date</Label>
                <Input type="date" value={form.exam_date} onChange={e => setForm({...form, exam_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input type="time" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input type="number" placeholder="e.g. 120" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Max Marks</Label>
                <Input type="number" placeholder="e.g. 100" value={form.max_marks} onChange={e => setForm({...form, max_marks: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Venue</Label>
                <Input placeholder="e.g. Main Hall" value={form.venue} onChange={e => setForm({...form, venue: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Create Exam
              </Button>
              <Button variant="outline" type="button" onClick={() => navigate("/dos/exams")}>Cancel</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateExam;