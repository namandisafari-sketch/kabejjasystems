import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BookOpen, Save, Plus, ChevronDown, ChevronRight } from "lucide-react";

const WEEKS = Array.from({ length: 12 }, (_, i) => `Week ${i + 1}`);

const ECD_DOMAINS = ["Health & Physical", "Communication & Language", "Cognitive", "Social & Emotional", "Values & Attitudes"];
const PRIMARY_THEMES = ["Self-Awareness", "Our Environment", "Health & Nutrition", "Community", "Transport & Communication", "Culture & Heritage", "Technology", "Money & Enterprise"];
const PRIMARY_STRANDS: Record<string, string[]> = {
  "English": ["Comprehension", "Grammar", "Composition", "Spelling", "Reading"],
  "Mathematics": ["Numbers", "Measurement", "Geometry", "Data Handling", "Algebra"],
  "Science": ["Living Things", "Matter & Energy", "Earth & Space", "Environment", "Health"],
  "Social Studies": ["Our Country", "East Africa", "Africa", "World", "Rights & Responsibilities"],
};
const SECONDARY_CHAPTERS = ["Introduction & Overview", "Chapter 1: Foundations", "Chapter 2: Core Concepts", "Chapter 3: Application", "Chapter 4: Analysis & Evaluation", "Chapter 5: Synthesis", "Chapter 6: Review & Assessment"];

const SchemeOfWork = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [schemes, setSchemes] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedScheme, setExpandedScheme] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", tier: "primary", subject_id: "", class_id: "", term: "1", academic_year: new Date().getFullYear().toString(),
  });
  const [weekPlans, setWeekPlans] = useState<Record<number, { topic: string; objectives: string; activities: string; materials: string }>>({});

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data: p } = await supabase.from("profiles").select("id, tenant_id").eq("id", session.user.id).single();
    if (!p?.tenant_id) return;
    setTenantId(p.tenant_id);

    const [sc, sb, cl] = await Promise.all([
      supabase.from("lesson_plans").select("*").eq("tenant_id", p.tenant_id).order("created_at", { ascending: false }),
      supabase.from("subjects").select("*").eq("tenant_id", p.tenant_id).eq("is_active", true),
      supabase.from("school_classes").select("*").eq("tenant_id", p.tenant_id).eq("is_active", true),
    ]);
    setSchemes(sc.data || []);
    let filteredSubjects = sb.data || [];
    const { data: subAssignments } = await supabase
      .from("teacher_subject_assignments")
      .select("subject_id")
      .eq("teacher_id", p.id)
      .eq("tenant_id", p.tenant_id);
    if (subAssignments && subAssignments.length > 0) {
      const allowedIds = new Set(subAssignments.map(s => s.subject_id));
      filteredSubjects = filteredSubjects.filter(s => allowedIds.has(s.id));
    }
    setSubjects(filteredSubjects);
    setClasses(cl.data || []);
    setLoading(false);
  };

  const tierOptions = (tier: string) => {
    switch (tier) {
      case "ecd": return ECD_DOMAINS;
      case "primary": return PRIMARY_THEMES;
      case "secondary": return SECONDARY_CHAPTERS;
      default: return PRIMARY_THEMES;
    }
  };

  const handleCreateScheme = async () => {
    setSaving(true);
    const weekData = WEEKS.map((_, i) => weekPlans[i] || { topic: "", objectives: "", activities: "", materials: "" });
    await supabase.from("lesson_plans").insert({
      tenant_id: tenantId, title: form.title, subject_id: form.subject_id || null,
      class_id: form.class_id || null, status: "active",
      content: { tier: form.tier, term: form.term, academic_year: form.academic_year, weekPlans: weekData },
    });
    setSaving(false);
    setShowForm(false);
    setForm({ title: "", tier: "primary", subject_id: "", class_id: "", term: "1", academic_year: new Date().getFullYear().toString() });
    setWeekPlans({});
    init();
  };

  const getTierLabel = (tier: string) => {
    const labels: Record<string, string> = { ecd: "ECD", primary: "Primary", secondary: "Secondary" };
    return labels[tier] || tier;
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><BookOpen className="h-5 w-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold tracking-tight">Scheme of Work</h1><p className="text-sm text-muted-foreground">Plan your term curriculum aligned to national syllabi</p></div>
        </div>
        <Button onClick={() => setShowForm(!showForm)}><Plus className="h-4 w-4 mr-2" /> New Scheme</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Create New Scheme of Work</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Term 1 English" />
              </div>
              <div className="space-y-2">
                <Label>Educational Tier</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })}>
                  <option value="ecd">ECD (Developmental Domains)</option>
                  <option value="primary">Primary (Themes/Strands)</option>
                  <option value="secondary">Secondary (NCDC Chapters)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })}>
                  <option value="">Select subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.class_id} onChange={e => setForm({ ...form, class_id: e.target.value })}>
                  <option value="">Select class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-4 mb-4">
              <div className="space-y-2">
                <Label>Term</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={form.term} onChange={e => setForm({ ...form, term: e.target.value })}>
                  <option value="1">Term 1</option>
                  <option value="2">Term 2</option>
                  <option value="3">Term 3</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} />
              </div>
            </div>

            <div className="border rounded-lg p-4 space-y-3 max-h-[500px] overflow-y-auto">
              <h3 className="text-sm font-semibold mb-3">12-Week Plan</h3>
              {WEEKS.map((week, i) => {
                const suggestions = tierOptions(form.tier);
                const wk = weekPlans[i] || { topic: "", objectives: "", activities: "", materials: "" };
                return (
                  <details key={i} className="border rounded-md p-3">
                    <summary className="text-sm font-medium cursor-pointer">{week}</summary>
                    <div className="mt-3 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Topic / Theme</Label>
                        <select className="w-full h-9 px-2 rounded border text-sm" value={wk.topic} onChange={e => setWeekPlans({ ...weekPlans, [i]: { ...wk, topic: e.target.value } })}>
                          <option value="">Select...</option>
                          {suggestions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Learning Objectives</Label>
                        <Textarea className="text-sm min-h-[60px]" value={wk.objectives} onChange={e => setWeekPlans({ ...weekPlans, [i]: { ...wk, objectives: e.target.value } })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Learner Activities</Label>
                        <Textarea className="text-sm min-h-[60px]" value={wk.activities} onChange={e => setWeekPlans({ ...weekPlans, [i]: { ...wk, activities: e.target.value } })} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Materials Needed</Label>
                        <Input className="text-sm" value={wk.materials} onChange={e => setWeekPlans({ ...weekPlans, [i]: { ...wk, materials: e.target.value } })} />
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={handleCreateScheme} disabled={saving || !form.title}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Scheme of Work
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Saved Schemes of Work</CardTitle></CardHeader>
        <CardContent className="p-0">
          {schemes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p>No schemes of work created yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {schemes.map((s: any) => {
                const content = typeof s.content === "string" ? JSON.parse(s.content) : s.content;
                const weekCount = content?.weekPlans ? Object.values(content.weekPlans).filter((w: any) => w.topic).length : 0;
                return (
                  <div key={s.id}>
                    <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 cursor-pointer"
                      onClick={() => setExpandedScheme(expandedScheme === s.id ? null : s.id)}>
                      <div className="flex items-center gap-3">
                        {expandedScheme === s.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <div>
                          <p className="text-sm font-medium">{s.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {content?.tier && <Badge variant="secondary" className="mr-2 text-xs">{getTierLabel(content.tier)}</Badge>}
                            Term {content?.term || "-"} | {weekCount}/12 weeks planned
                          </p>
                        </div>
                      </div>
                      <Badge>{s.status || "Active"}</Badge>
                    </div>
                    {expandedScheme === s.id && content?.weekPlans && (
                      <div className="px-4 pb-4 space-y-2">
                        {WEEKS.map((week, i) => {
                          const wp = content.weekPlans[i];
                          return (
                            <div key={i} className={`p-3 rounded-md text-sm ${wp?.topic ? "bg-muted/50" : "bg-muted/20"}`}>
                              <span className="font-medium">{week}:</span> {wp?.topic || <span className="text-muted-foreground italic">Not planned</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SchemeOfWork;