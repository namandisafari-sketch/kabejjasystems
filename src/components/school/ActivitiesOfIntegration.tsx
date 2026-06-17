import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ClipboardCheck, Plus, BookOpen, Users } from "lucide-react";
import type { ActivityOfIntegration, StudentAoiScore } from "@/types/school-admin";

interface Props { tenantId: string | null; }

export function ActivitiesOfIntegration({ tenantId }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAoi, setEditAoi] = useState<ActivityOfIntegration | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedTerm, setSelectedTerm] = useState<string>("all");
  const [scoreDialog, setScoreDialog] = useState<{ aoiId: string; title: string } | null>(null);

  const { data: classes } = useQuery({
    queryKey: ["classes", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("school_classes").select("id, name, secondary_level").eq("tenant_id", tenantId!).order("name");
      return data as { id: string; name: string; secondary_level: string | null }[];
    },
  });

  const { data: subjects } = useQuery({
    queryKey: ["school-subjects", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("school_subjects").select("id, name, level").eq("tenant_id", tenantId!).order("name");
      return data;
    },
  });

  const { data: terms } = useQuery({
    queryKey: ["terms", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("academic_terms").select("id, name, is_current").eq("tenant_id", tenantId!).order("start_date", { ascending: false });
      return data as { id: string; name: string; is_current: boolean }[];
    },
  });

  const { data: aois } = useQuery({
    queryKey: ["aois", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("activities_of_integration").select("*, subject:school_subject_id(name), class:class_id(name), term:academic_term_id(name)").eq("tenant_id", tenantId!).order("chapter_number");
      return data as (ActivityOfIntegration & { subject: { name: string }; class: { name: string }; term: { name: string } })[];
    },
  });

  const filtered = aois?.filter((a) => {
    if (selectedClass !== "all" && a.class_id !== selectedClass) return false;
    if (selectedSubject !== "all" && a.school_subject_id !== selectedSubject) return false;
    if (selectedTerm !== "all" && a.academic_term_id !== selectedTerm) return false;
    return true;
  });

  const saveAoi = useMutation({
    mutationFn: async (values: any) => {
      if (editAoi) return supabase.from("activities_of_integration").update(values).eq("id", editAoi.id);
      return supabase.from("activities_of_integration").insert({ ...values, tenant_id: tenantId });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["aois"] }); setDialogOpen(false); setEditAoi(null); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><ClipboardCheck className="h-5 w-5" />Activities of Integration</h2>
          <p className="text-sm text-muted-foreground">Chapter-based assessment per subject. Scores feed into UNEB final grade.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditAoi(null)}><Plus className="h-4 w-4 mr-2" />New Activity</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editAoi ? "Edit" : "New"} Activity of Integration</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); saveAoi.mutate({ school_subject_id: fd.get("subject_id"), class_id: fd.get("class_id"), academic_term_id: fd.get("term_id"), chapter_number: Number(fd.get("chapter_number")), chapter_title: fd.get("chapter_title"), max_score: Number(fd.get("max_score")) || 100, weight_percentage: Number(fd.get("weight")) || 0, due_date: fd.get("due_date") || null }); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Subject</Label>
                  <select name="subject_id" defaultValue={editAoi?.school_subject_id || ""} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select...</option>
                    {subjects?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2"><Label>Class</Label>
                  <select name="class_id" defaultValue={editAoi?.class_id || ""} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select...</option>
                    {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-2"><Label>Term</Label>
                <select name="term_id" defaultValue={editAoi?.academic_term_id || ""} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select...</option>
                  {terms?.map((t) => <option key={t.id} value={t.id}>{t.name}{t.is_current ? " (Current)" : ""}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Chapter #</Label><Input name="chapter_number" type="number" defaultValue={editAoi?.chapter_number || 1} required /></div>
                <div className="space-y-2"><Label>Chapter Title</Label><Input name="chapter_title" defaultValue={editAoi?.chapter_title || ""} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Max Score</Label><Input name="max_score" type="number" defaultValue={editAoi?.max_score || 100} /></div>
                <div className="space-y-2"><Label>Weight (%)</Label><Input name="weight" type="number" defaultValue={editAoi?.weight_percentage || 0} /></div>
              </div>
              <div className="space-y-2"><Label>Due Date</Label><Input name="due_date" type="date" defaultValue={editAoi?.due_date || ""} /></div>
              <Button type="submit" disabled={saveAoi.isPending} className="w-full">{saveAoi.isPending ? "Saving..." : "Save"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">All Classes</option>
          {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">All Subjects</option>
          {subjects?.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">All Terms</option>
          {terms?.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="grid gap-3">
        {filtered?.map((aoi) => (
          <Card key={aoi.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="font-medium">Ch.{aoi.chapter_number}: {aoi.chapter_title}</span>
                  <Badge variant="outline" className="text-xs">{aoi.subject?.name}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{aoi.class?.name} &middot; {aoi.term?.name} &middot; Max: {aoi.max_score} &middot; Weight: {aoi.weight_percentage}%</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setScoreDialog({ aoiId: aoi.id, title: `Ch.${aoi.chapter_number}: ${aoi.chapter_title}` })}>
                  <Users className="h-3 w-3 mr-1" />Scores
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!filtered || filtered.length === 0) && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No activities of integration for the selected filters.</CardContent></Card>
        )}
      </div>

      <AoiScoreDialog
        aoiId={scoreDialog?.aoiId || null}
        title={scoreDialog?.title || ""}
        onClose={() => setScoreDialog(null)}
        tenantId={tenantId}
      />
    </div>
  );
}

function AoiScoreDialog({ aoiId, title, onClose, tenantId }: { aoiId: string | null; title: string; onClose: () => void; tenantId: string | null }) {
  const queryClient = useQueryClient();
  const [scores, setScores] = useState<Record<string, string>>({});

  const { data: aoi } = useQuery({
    queryKey: ["aoi", aoiId],
    enabled: !!aoiId,
    queryFn: async () => {
      const { data } = await supabase.from("activities_of_integration").select("*, subject:school_subject_id(name), class:class_id(name)").eq("id", aoiId!).single();
      return data as any;
    },
  });

  const { data: students } = useQuery({
    queryKey: ["aoi-students", aoi?.class_id],
    enabled: !!aoi?.class_id,
    queryFn: async () => {
      const { data } = await supabase.from("students").select("id, full_name, admission_number").eq("class_id", aoi!.class_id!).eq("tenant_id", tenantId!).is("deleted_at", null).order("full_name");
      return data as { id: string; full_name: string; admission_number: string | null }[];
    },
  });

  const { data: existingScores } = useQuery({
    queryKey: ["aoi-scores", aoiId],
    enabled: !!aoiId,
    queryFn: async () => {
      const { data } = await supabase.from("student_aoi_scores").select("*").eq("aoi_id", aoiId!);
      const map: Record<string, string> = {};
      data?.forEach((s: any) => { map[s.student_id] = String(s.score); });
      return map;
    },
    onSuccess: (data) => { if (data) setScores(data); },
  });

  const saveScores = useMutation({
    mutationFn: async () => {
      const entries = Object.entries(scores).filter(([_, v]) => v !== "" && v !== undefined).map(([studentId, score]) => ({ aoi_id: aoiId!, student_id: studentId, score: Number(score) }));
      for (const entry of entries) {
        await supabase.from("student_aoi_scores").upsert(entry, { onConflict: "aoi_id,student_id" });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["aoi-scores"] }); toast.success("Scores saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  if (!aoiId) return null;

  return (
    <Dialog open={!!aoiId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
          <p className="text-xs text-muted-foreground">{aoi?.subject?.name} &middot; {aoi?.class?.name} &middot; Max: {aoi?.max_score}</p>
        </DialogHeader>
        <div className="space-y-2">
          {students?.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-1">
              <span className="text-sm">{s.full_name}</span>
              <Input
                type="number"
                className="w-24 h-8 text-sm"
                placeholder="Score"
                value={scores[s.id] || ""}
                onChange={(e) => setScores({ ...scores, [s.id]: e.target.value })}
                max={aoi?.max_score || 100}
              />
            </div>
          ))}
        </div>
        <Button onClick={() => saveScores.mutate()} disabled={saveScores.isPending} className="w-full">
          {saveScores.isPending ? "Saving..." : "Save All Scores"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
