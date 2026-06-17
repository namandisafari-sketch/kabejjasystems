import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, Plus, Edit, Users } from "lucide-react";
import type { AcademicDepartment } from "@/types/school-admin";

interface Props { tenantId: string | null; }

export function SchoolDepartments({ tenantId }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AcademicDepartment | null>(null);

  const { data: departments } = useQuery({
    queryKey: ["departments", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("academic_departments").select("*, hod:hod_id(full_name)").eq("tenant_id", tenantId!).order("name");
      return data as (AcademicDepartment & { hod: { full_name: string } | null })[];
    },
  });

  const { data: employees } = useQuery({
    queryKey: ["employees-short", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, full_name, employee_code").eq("tenant_id", tenantId!).is("deleted_at", null).order("full_name");
      return data as { id: string; full_name: string; employee_code: string }[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: Partial<AcademicDepartment>) => {
      if (editing) return supabase.from("academic_departments").update(values).eq("id", editing.id);
      return supabase.from("academic_departments").insert({ ...values, tenant_id: tenantId });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["departments"] }); setDialogOpen(false); setEditing(null); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><BookOpen className="h-5 w-5" />Academic Departments</h2>
          <p className="text-sm text-muted-foreground">Science, Arts, Languages, Vocational, etc.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2" />Add Department</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Department</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); saveMutation.mutate({ name: fd.get("name") as string, code: fd.get("code") as string, description: fd.get("description") as string, hod_id: fd.get("hod_id") as string || null }); }} className="space-y-4">
              <div className="space-y-2"><Label>Department Name</Label><Input name="name" defaultValue={editing?.name} placeholder="e.g. Science Department" required /></div>
              <div className="space-y-2"><Label>Code</Label><Input name="code" defaultValue={editing?.code} placeholder="e.g. SCI" /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea name="description" defaultValue={editing?.description} /></div>
              <div className="space-y-2"><Label>Head of Department</Label>
                <select name="hod_id" defaultValue={editing?.hod_id || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                  <option value="">— Not assigned —</option>
                  {employees?.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
                </select>
              </div>
              <Button type="submit" disabled={saveMutation.isPending} className="w-full">{saveMutation.isPending ? "Saving..." : "Save Department"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {departments?.map((dept) => (
          <Card key={dept.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{dept.name}</CardTitle>
                  {dept.code && <p className="text-xs text-muted-foreground">Code: {dept.code}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={dept.is_active ? "default" : "secondary"}>{dept.is_active ? "Active" : "Inactive"}</Badge>
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(dept); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              <p><span className="text-muted-foreground">HOD:</span> {dept.hod?.full_name || "—"}</p>
              {dept.description && <p className="text-muted-foreground text-xs">{dept.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
      {(!departments || departments.length === 0) && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No departments created yet.</CardContent></Card>
      )}
    </div>
  );
}
