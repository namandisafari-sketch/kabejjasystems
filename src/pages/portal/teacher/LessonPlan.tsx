import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, FileText, CheckSquare } from "lucide-react";

const CORE_COMPETENCIES = [
  "Critical Thinking & Problem Solving",
  "Creativity & Innovation",
  "Communication & Collaboration",
  "Self-Directed Learning",
  "Mathematical Thinking",
  "Scientific Inquiry",
  "Digital Literacy",
  "Citizenship & Ethics",
];

const TEACHING_METHODS = [
  "Lecture/Demonstration", "Group Discussion", "Pair Work", "Role Play",
  "Hands-on Activity", "Project-Based", "Inquiry-Based", "Field Work",
  "Debate", "Peer Teaching", "Think-Pair-Share", "Jigsaw",
];

const INCLUSIVITY_ITEMS = [
  "Visual aids (large print, high contrast)",
  "Braille materials available",
  "Front seating for visually/hearing impaired",
  "Extra time for tasks",
  "Simplified instructions with visuals",
  "Peer buddy support",
  "Sign language interpretation",
  "Modified assessment criteria",
];

const LessonPlan = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "", subject_id: "", class_id: "", date: new Date().toISOString().split("T")[0],
    core_competency: "", learning_outcome: "", teaching_methods: "",
    materials: "", inclusivity: [] as string[], remarks: "",
  });

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", session.user.id).single();
    if (!p?.tenant_id) return;
    setTenantId(p.tenant_id);

    const [sb, cl, pl] = await Promise.all([
      supabase.from("subjects").select("id, name, code").eq("tenant_id", p.tenant_id).eq("is_active", true),
      supabase.from("school_classes").select("id, name, level").eq("tenant_id", p.tenant_id).eq("is_active", true),
      supabase.from("lesson_plans").select("*").eq("tenant_id", p.tenant_id).order("created_at", { ascending: false }),
    ]);
    setSubjects(sb.data || []);
    setClasses(cl.data || []);
    setPlans(pl.data || []);
    setLoading(false);
  };

  const toggleInclusivity = (item: string) => {
    setForm(prev => ({
      ...prev,
      inclusivity: prev.inclusivity.includes(item)
        ? prev.inclusivity.filter(i => i !== item)
        : [...prev.inclusivity, item],
    }));
  };

  const handleSave = async () => {
    if (!form.title || !form.core_competency || !form.learning_outcome) return;
    setSaving(true);

    await supabase.from("lesson_plans").insert({
      tenant_id: tenantId, title: form.title, subject_id: form.subject_id || null,
      class_id: form.class_id || null, date: form.date, status: "submitted",
      content: {
        core_competency: form.core_competency,
        learning_outcome: form.learning_outcome,
        teaching_methods: form.teaching_methods,
        materials: form.materials,
        inclusivity: form.inclusivity,
        remarks: form.remarks,
      },
    });

    setSaving(false);
    setShowForm(false);
    setForm({
      title: "", subject_id: "", class_id: "", date: new Date().toISOString().split("T")[0],
      core_competency: "", learning_outcome: "", teaching_methods: "",
      materials: "", inclusivity: [], remarks: "",
    });
    init();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><FileText className="h-5 w-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold tracking-tight">Lesson Plans</h1><p className="text-sm text-muted-foreground">Create detailed lesson plans aligned to the scheme of work</p></div>
        </div>
        <Button onClick={() => setShowForm(!showForm)}><FileText className="h-4 w-4 mr-2" /> New Lesson Plan</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Create Lesson Plan</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="space-y-2">
                <Label>Lesson Title *</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })}>
                  <option value="">Select</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })}>
                  <option value="">Select</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>1. Core Competency *</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.core_competency} onChange={e => setForm({ ...form, core_competency: e.target.value })}>
                  <option value="">Select core competency</option>
                  {CORE_COMPETENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>2. Behavioral / Learning Outcome *</Label>
                <Textarea className="min-h-[80px]" placeholder="What the learner should be able to do by the end of the lesson" value={form.learning_outcome} onChange={e => setForm({ ...form, learning_outcome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>3. Teaching Methods & Learner Activities</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {TEACHING_METHODS.map(m => (
                    <button key={m} type="button"
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${form.teaching_methods.includes(m) ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                      onClick={() => setForm(prev => ({
                        ...prev,
                        teaching_methods: prev.teaching_methods.includes(m)
                          ? prev.teaching_methods.replace(m, "").replace(", ", "").trim()
                          : prev.teaching_methods ? `${prev.teaching_methods}, ${m}` : m,
                      }))}>
                      {m}
                    </button>
                  ))}
                </div>
                <Textarea className="min-h-[80px]" placeholder="Step-by-step description of learner activities" value={form.teaching_methods} onChange={e => setForm({ ...form, teaching_methods: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>4. Instructional Materials / Tools</Label>
                <Input placeholder="e.g. Charts, projector, textbook, lab equipment" value={form.materials} onChange={e => setForm({ ...form, materials: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>5. Inclusivity Checklist</Label>
                <p className="text-xs text-muted-foreground mb-2">Check all accommodations provided for special needs learners</p>
                <div className="grid grid-cols-2 gap-2">
                  {INCLUSIVITY_ITEMS.map(item => (
                    <label key={item} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50 text-sm"
                      onClick={() => toggleInclusivity(item)}>
                      <CheckSquare className={`h-4 w-4 ${form.inclusivity.includes(item) ? "text-primary" : "text-muted-foreground"}`} />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Remarks / Notes</Label>
                <Textarea className="min-h-[60px]" value={form.remarks} onChange={e => setForm({ ...form, remarks: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={handleSave} disabled={saving || !form.title || !form.core_competency || !form.learning_outcome}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Submit Lesson Plan
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Saved Lesson Plans</CardTitle></CardHeader>
        <CardContent className="p-0">
          {plans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p>No lesson plans created yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Title</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Subject</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Class</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {plans.map((p: any) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-medium">{p.title}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{p.subject_id || "-"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{p.class_id || "-"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{p.date || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          p.status === "approved" ? "bg-green-100 text-green-700" :
                          p.status === "submitted" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>{p.status || "Draft"}</span>
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

export default LessonPlan;