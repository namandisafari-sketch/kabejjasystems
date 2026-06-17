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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { GraduationCap, Plus, Edit, X } from "lucide-react";
import type { StaffRoleAssignment, StaffRoleType } from "@/types/school-admin";
import { STAFF_ROLE_LABELS } from "@/types/school-admin";

interface Props { tenantId: string | null; }

export function SchoolStaffRoles({ tenantId }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRoleAssignment | null>(null);
  const [filterRole, setFilterRole] = useState<string>("all");
  const [saving, setSaving] = useState(false);

  const { data: assignments } = useQuery({
    queryKey: ["staff-role-assignments", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("staff_role_assignments")
        .select("*, employee:employee_id(full_name), department:department_id(name), class:class_id(name, secondary_level)")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      return data as (StaffRoleAssignment & {
        employee: { full_name: string };
        department: { name: string } | null;
        class: { name: string; secondary_level: string | null } | null;
      })[];
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

  const { data: departments } = useQuery({
    queryKey: ["departments-list", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("academic_departments").select("id, name").eq("tenant_id", tenantId!).eq("is_active", true).order("name");
      return data as { id: string; name: string }[];
    },
  });

  const { data: classes } = useQuery({
    queryKey: ["classes-list", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("school_classes").select("id, name, secondary_level").eq("tenant_id", tenantId!).order("name");
      return data as { id: string; name: string; secondary_level: string | null }[];
    },
  });

  const filtered = assignments?.filter((a) => filterRole === "all" || a.role_type === filterRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><GraduationCap className="h-5 w-5" />Staff Roles
            <span className="text-sm font-normal text-muted-foreground">({filtered?.length || 0})</span>
          </h2>
          <p className="text-sm text-muted-foreground">Head Teacher, DOS, Deans, HODs, Class Teachers, Patrons, etc.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2" />Assign Role</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Assign"} Staff Role</DialogTitle></DialogHeader>
            <StaffRoleForm
              initial={editing}
              employees={employees}
              departments={departments}
              classes={classes}
              saving={saving}
              onSubmit={async (v) => {
                setSaving(true);
                const q = editing
                  ? supabase.from("staff_role_assignments").update(v).eq("id", editing.id)
                  : supabase.from("staff_role_assignments").insert({ ...v, tenant_id: tenantId });
                const { error } = await q;
                setSaving(false);
                if (error) { toast.error(error.message); return; }
                queryClient.invalidateQueries({ queryKey: ["staff-role-assignments"] });
                setDialogOpen(false);
                setEditing(null);
                toast.success("Saved");
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-1 flex-wrap">
        <Badge variant={filterRole === "all" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterRole("all")}>All</Badge>
        {Object.entries(STAFF_ROLE_LABELS).slice(0, 8).map(([k, v]) => (
          <Badge key={k} variant={filterRole === k ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterRole(k)}>{v}</Badge>
        ))}
      </div>

      <div className="space-y-3">
        {filtered?.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{a.employee?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{STAFF_ROLE_LABELS[a.role_type]}{a.department ? ` — ${a.department.name}` : ""}{a.class ? ` — ${a.class.name}` : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Active" : "Inactive"}</Badge>
                <Button variant="ghost" size="icon" onClick={() => { setEditing(a); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(!filtered || filtered.length === 0) && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No role assignments for this filter.</CardContent></Card>
        )}
      </div>
    </div>
  );
}

function StaffRoleForm({ initial, employees, departments, classes, onSubmit, saving }: {
  initial: StaffRoleAssignment | null;
  employees?: { id: string; full_name: string; employee_code: string }[];
  departments?: { id: string; name: string }[];
  classes?: { id: string; name: string; secondary_level: string | null }[];
  onSubmit: (values: any) => void;
  saving?: boolean;
}) {
  const [roleType, setRoleType] = useState<StaffRoleType>(initial?.role_type || "class_teacher");

  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); onSubmit({ employee_id: fd.get("employee_id"), role_type: fd.get("role_type"), department_id: fd.get("department_id") || null, class_id: fd.get("class_id") || null, start_date: fd.get("start_date"), end_date: fd.get("end_date") || null, responsibilities: fd.get("responsibilities") || null }); }} className="space-y-4">
      <div className="space-y-2"><Label>Staff Member</Label>
        <select name="employee_id" defaultValue={initial?.employee_id || ""} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">Select staff...</option>
          {employees?.map((e) => <option key={e.id} value={e.id}>{e.full_name} ({e.employee_code})</option>)}
        </select>
      </div>
      <div className="space-y-2"><Label>Role</Label>
        <Select value={roleType} onValueChange={(v) => setRoleType(v as StaffRoleType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(STAFF_ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <input type="hidden" name="role_type" value={roleType} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Department</Label>
          <select name="department_id" defaultValue={initial?.department_id || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">— None —</option>
            {departments?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="space-y-2"><Label>Class</Label>
          <select name="class_id" defaultValue={initial?.class_id || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">— None —</option>
            {classes?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.secondary_level ? ` (${c.secondary_level})` : ""}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2"><Label>Start Date</Label><Input type="date" name="start_date" defaultValue={initial?.start_date} required /></div>
        <div className="space-y-2"><Label>End Date</Label><Input type="date" name="end_date" defaultValue={initial?.end_date || ""} /></div>
      </div>
      <div className="space-y-2"><Label>Responsibilities</Label><Textarea name="responsibilities" defaultValue={initial?.responsibilities || ""} /></div>
      <Button type="submit" disabled={saving} className="w-full">{saving ? "Saving..." : initial ? "Update" : "Assign"} Role</Button>
    </form>
  );
}
