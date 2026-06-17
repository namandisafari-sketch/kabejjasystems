import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FileText, Plus, Edit, Eye, Copy, Trash2 } from "lucide-react";
import type { ReportCardTemplate } from "@/types/school-admin";

interface Props { tenantId: string | null; }

const DEFAULT_SECTIONS = [
  { section_type: "student_info", title: "Student Information", display_order: 1, config: {}, is_visible: true },
  { section_type: "subject_scores", title: "Subject Scores", display_order: 2, config: { show_grades: true, show_remarks: true }, is_visible: true },
  { section_type: "element_scores", title: "Subject Elements", display_order: 3, config: { show_elements: true }, is_visible: false },
  { section_type: "aoi_summary", title: "Activities of Integration", display_order: 4, config: {}, is_visible: false },
  { section_type: "skills", title: "Skills Assessment", display_order: 5, config: {}, is_visible: false },
  { section_type: "attendance", title: "Attendance", display_order: 6, config: {}, is_visible: true },
  { section_type: "teacher_remark", title: "Class Teacher's Remark", display_order: 7, config: {}, is_visible: true },
  { section_type: "head_remark", title: "Head Teacher's Remark", display_order: 8, config: {}, is_visible: true },
  { section_type: "signatures", title: "Signatures", display_order: 9, config: {}, is_visible: true },
];

const DEFAULT_GRADING = [
  { grade: "A", label: "Excellent", min: 80, max: 100, points: 1, color: "#22c55e" },
  { grade: "B", label: "Very Good", min: 70, max: 79, points: 2, color: "#3b82f6" },
  { grade: "C", label: "Good", min: 60, max: 69, points: 3, color: "#eab308" },
  { grade: "D", label: "Credit", min: 50, max: 59, points: 4, color: "#f97316" },
  { grade: "E", label: "Pass", min: 40, max: 49, points: 5, color: "#ef4444" },
  { grade: "F", label: "Fail", min: 0, max: 39, points: 6, color: "#991b1b" },
];

export function ReportCardTemplates({ tenantId }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReportCardTemplate | null>(null);

  const { data: templates } = useQuery({
    queryKey: ["report-templates", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("report_card_templates").select("*").eq("tenant_id", tenantId!).order("name");
      return data as ReportCardTemplate[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (editing) return supabase.from("report_card_templates").update(values).eq("id", editing.id);
      return supabase.from("report_card_templates").insert({ ...values, tenant_id: tenantId });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["report-templates"] }); setDialogOpen(false); setEditing(null); toast.success("Template saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><FileText className="h-5 w-5" />Report Card Templates</h2>
          <p className="text-sm text-muted-foreground">Define flexible report card layouts, sections, and grading scales per level.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2" />New Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Report Card Template</DialogTitle></DialogHeader>
            <TemplateForm initial={editing} onSubmit={(v) => saveMutation.mutate(v)} saving={saveMutation.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {templates?.map((tpl) => (
          <Card key={tpl.id} className={tpl.is_default ? "ring-2 ring-primary" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{tpl.name}{tpl.is_default ? <Badge className="ml-2">Default</Badge> : ""}</CardTitle>
                  <CardDescription>{tpl.level} &middot; {tpl.sections?.length || 0} sections</CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(tpl); setDialogOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Grading: {(tpl.grading_scale || []).map((g: any) => `${g.grade}(${g.min}-${g.max})`).join(", ")}</p>
                <p>Sections: {(tpl.sections || []).filter((s: any) => s.is_visible).map((s: any) => s.title).join(", ")}</p>
                {tpl.description && <p className="italic">{tpl.description}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {(!templates || templates.length === 0) && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No report card templates yet. Create one to define your school's layout.</CardContent></Card>
      )}
    </div>
  );
}

function TemplateForm({ initial, onSubmit, saving }: { initial: ReportCardTemplate | null; onSubmit: (v: any) => void; saving: boolean }) {
  const [sections, setSections] = useState<any[]>(initial?.sections?.length ? initial.sections : DEFAULT_SECTIONS);
  const [grading, setGrading] = useState<any[]>(initial?.grading_scale?.length ? initial.grading_scale : DEFAULT_GRADING);
  const [level, setLevel] = useState(initial?.level || "o-level");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onSubmit({
      name: fd.get("name"),
      description: fd.get("description") || null,
      level,
      sections,
      grading_scale: grading,
      scoring_config: { aggregation: fd.get("aggregation") || "sum" },
      layout_config: { page_size: fd.get("page_size") || "A4", orientation: fd.get("orientation") || "portrait" },
      is_default: fd.get("is_default") === "on",
      is_active: true,
    });
  };

  const toggleSection = (idx: number) => {
    setSections(sections.map((s, i) => i === idx ? { ...s, is_visible: !s.is_visible } : s));
  };

  const addGradeRow = () => {
    setGrading([...grading, { grade: "", label: "", min: 0, max: 0, points: 0, color: "#6b7280" }]);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2"><Label>Template Name</Label><Input name="name" defaultValue={initial?.name} placeholder="e.g. NCDC O-Level Report" required /></div>
      <div className="space-y-2"><Label>Description</Label><Textarea name="description" defaultValue={initial?.description || ""} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Level</Label><Select value={level} onValueChange={setLevel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="o-level">O-Level</SelectItem><SelectItem value="a-level">A-Level</SelectItem><SelectItem value="primary">Primary</SelectItem><SelectItem value="kindergarten">Kindergarten</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label>Page Size</Label>
          <select name="page_size" defaultValue={(initial?.layout_config as any)?.page_size || "A4"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="A4">A4</option><option value="Letter">Letter</option><option value="Legal">Legal</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Orientation</Label>
          <select name="orientation" defaultValue={(initial?.layout_config as any)?.orientation || "portrait"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="portrait">Portrait</option><option value="landscape">Landscape</option>
          </select>
        </div>
        <div className="space-y-2"><Label>Score Aggregation</Label>
          <select name="aggregation" defaultValue={(initial?.scoring_config as any)?.aggregation || "sum"} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="sum">Sum of Scores</option><option value="weighted">Weighted Average</option><option value="best_of">Best of</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2"><input type="checkbox" name="is_default" defaultChecked={initial?.is_default || false} className="h-4 w-4" id="is_default" /><Label htmlFor="is_default">Set as default template</Label></div>

      <div>
        <h4 className="font-medium text-sm mb-2">Sections</h4>
        <div className="space-y-1 border rounded-lg p-3">
          {sections.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-1 text-sm">
              <span className={s.is_visible ? "" : "text-muted-foreground line-through"}>{s.title}</span>
              <Switch checked={s.is_visible} onCheckedChange={() => toggleSection(i)} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2"><h4 className="font-medium text-sm">Grading Scale</h4><Button type="button" variant="outline" size="sm" onClick={addGradeRow}><Plus className="h-3 w-3 mr-1" />Add Grade</Button></div>
        <div className="space-y-2">
          {grading.map((g, i) => (
            <div key={i} className="flex gap-2 items-center text-sm">
              <Input className="w-16 h-8" placeholder="G" value={g.grade} onChange={(e) => { const ng = [...grading]; ng[i].grade = e.target.value; setGrading(ng); }} />
              <Input className="w-24 h-8" placeholder="Label" value={g.label} onChange={(e) => { const ng = [...grading]; ng[i].label = e.target.value; setGrading(ng); }} />
              <Input className="w-16 h-8" type="number" placeholder="Min" value={g.min} onChange={(e) => { const ng = [...grading]; ng[i].min = Number(e.target.value); setGrading(ng); }} />
              <Input className="w-16 h-8" type="number" placeholder="Max" value={g.max} onChange={(e) => { const ng = [...grading]; ng[i].max = Number(e.target.value); setGrading(ng); }} />
              {g.grade && <Badge style={{ backgroundColor: g.color || "#6b7280" }} className="text-white text-xs">{g.grade}</Badge>}
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" disabled={saving} className="w-full">{saving ? "Saving..." : "Save Template"}</Button>
    </form>
  );
}
