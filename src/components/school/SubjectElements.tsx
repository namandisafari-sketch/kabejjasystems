import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { BookOpen, Plus, Edit, GripVertical } from "lucide-react";
import type { SubjectElement } from "@/types/school-admin";

interface Props { tenantId: string | null; }

export function SubjectElements({ tenantId }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectElement | null>(null);

  const { data: schoolSubjects } = useQuery({
    queryKey: ["school-subjects", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("school_subjects").select("id, name, code, level").eq("tenant_id", tenantId!).order("name");
      return data as { id: string; name: string; code: string | null; level: string }[];
    },
  });

  const { data: elements } = useQuery({
    queryKey: ["subject-elements", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("subject_elements").select("*").eq("tenant_id", tenantId!).order("display_order").order("name");
      return data as SubjectElement[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: Partial<SubjectElement>) => {
      if (editing) return supabase.from("subject_elements").update(values).eq("id", editing.id);
      return supabase.from("subject_elements").insert({ ...values, tenant_id: tenantId });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["subject-elements"] }); setDialogOpen(false); setEditing(null); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  const grouped = (schoolSubjects || []).map((subj) => ({
    ...subj,
    elements: (elements || []).filter((e) => e.school_subject_id === subj.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5" />Subject Elements</h2>
          <p className="text-sm text-muted-foreground">NCDC New Curriculum: define elements per subject (e.g. Music → Singing, Dancing, Instruments)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2" />Add Element</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Subject Element</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); saveMutation.mutate({ school_subject_id: fd.get("subject_id") as string, name: fd.get("name") as string, code: fd.get("code") as string, description: fd.get("description") as string, max_score: Number(fd.get("max_score")) || 100, display_order: Number(fd.get("display_order")) || 0 }); }} className="space-y-4">
              <div className="space-y-2"><Label>Subject</Label>
                <select name="subject_id" defaultValue={editing?.school_subject_id || ""} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select subject...</option>
                  {schoolSubjects?.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.level})</option>)}
                </select>
              </div>
              <div className="space-y-2"><Label>Element Name</Label><Input name="name" defaultValue={editing?.name} placeholder="e.g. Singing" required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Code</Label><Input name="code" defaultValue={editing?.code || ""} placeholder="e.g. MUS-SING" /></div>
                <div className="space-y-2"><Label>Max Score</Label><Input name="max_score" type="number" defaultValue={editing?.max_score || 100} /></div>
              </div>
              <div className="space-y-2"><Label>Display Order</Label><Input name="display_order" type="number" defaultValue={editing?.display_order || 0} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea name="description" defaultValue={editing?.description || ""} /></div>
              <Button type="submit" disabled={saveMutation.isPending} className="w-full">{saveMutation.isPending ? "Saving..." : "Save Element"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {grouped.map((subj) => (
        <Card key={subj.id}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>{subj.name} <span className="text-xs text-muted-foreground font-normal">({subj.level})</span></span>
              <Badge variant="outline">{subj.elements.length} elements</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {subj.elements.length > 0 ? (
              <div className="space-y-1">
                {subj.elements.map((el) => (
                  <div key={el.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 text-sm">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">{el.name}</span>
                      {el.code && <span className="text-xs text-muted-foreground">({el.code})</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">Max: {el.max_score}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditing(el); setDialogOpen(true); }}><Edit className="h-3 w-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">No elements defined. Click "Add Element" to define the first one.</p>
            )}
          </CardContent>
        </Card>
      ))}
      {(!schoolSubjects || schoolSubjects.length === 0) && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Create subjects first to define elements.</CardContent></Card>
      )}
    </div>
  );
}
