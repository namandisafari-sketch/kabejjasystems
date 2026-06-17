import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Shield, Users, Calendar, Plus, Edit, Building2 } from "lucide-react";
import type { GoverningBody, GoverningBodyMember, GoverningBodyMeeting, GoverningBodyType, GoverningBodyMemberRole } from "@/types/school-admin";
import { GOVERNING_BODY_LABELS, MEMBER_ROLE_LABELS } from "@/types/school-admin";

interface Props { tenantId: string | null; }

export function SchoolGoverningBody({ tenantId }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<GoverningBody | null>(null);

  const { data: bodies } = useQuery({
    queryKey: ["governing-bodies", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("governing_bodies").select("*").eq("tenant_id", tenantId!).order("created_at");
      return data as GoverningBody[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: Partial<GoverningBody>) => {
      if (editing) {
        return supabase.from("governing_bodies").update(values).eq("id", editing.id);
      }
      return supabase.from("governing_bodies").insert({ ...values, tenant_id: tenantId });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["governing-bodies"] }); setDialogOpen(false); setEditing(null); toast.success("Saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Building2 className="h-5 w-5" />Governing Body</h2>
          <p className="text-sm text-muted-foreground">SMC (Primary), BoG (Secondary), or School Board (Nursery)</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2" />Add Body</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Governing Body</DialogTitle></DialogHeader>
            <GoverningBodyForm
              initial={editing}
              onSubmit={(v) => saveMutation.mutate(v)}
              loading={saveMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {bodies?.map((body) => (
        <Card key={body.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Shield className="h-4 w-4" />{body.name}
                  <Badge variant={body.status === "active" ? "default" : "secondary"}>{body.status}</Badge>
                </CardTitle>
                <CardDescription>{GOVERNING_BODY_LABELS[body.body_type]} &middot; {body.meeting_frequency} meetings</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setEditing(body); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><span className="text-muted-foreground">Chairperson</span><p className="font-medium">{body.chairperson_name || "—"}</p></div>
              <div><span className="text-muted-foreground">Deputy</span><p className="font-medium">{body.deputy_chairperson || "—"}</p></div>
              <div><span className="text-muted-foreground">Secretary</span><p className="font-medium">{body.secretary || "—"}</p></div>
              <div><span className="text-muted-foreground">Treasurer</span><p className="font-medium">{body.treasurer || "—"}</p></div>
            </div>
            <div className="mt-4">
              <GoverningBodyMembers bodyId={body.id} tenantId={tenantId} />
            </div>
            <div className="mt-4">
              <GoverningBodyMeetings bodyId={body.id} tenantId={tenantId} />
            </div>
          </CardContent>
        </Card>
      ))}
      {(!bodies || bodies.length === 0) && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No governing body added yet.</CardContent></Card>
      )}
    </div>
  );
}

function GoverningBodyForm({ initial, onSubmit, loading }: { initial: GoverningBody | null; onSubmit: (v: any) => void; loading: boolean }) {
  const [form, setForm] = useState({ name: initial?.name || "", body_type: initial?.body_type || "bog", chairperson_name: initial?.chairperson_name || "", chairperson_contact: initial?.chairperson_contact || "", deputy_chairperson: initial?.deputy_chairperson || "", secretary: initial?.secretary || "", treasurer: initial?.treasurer || "", meeting_frequency: initial?.meeting_frequency || "termly", term_years: initial?.term_years || 3, notes: initial?.notes || "" });
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSubmit(form); };
  return (<form onSubmit={handleSubmit} className="space-y-4">
    <div className="space-y-2"><Label>Body Type</Label><Select value={form.body_type} onValueChange={(v) => setForm({ ...form, body_type: v as GoverningBodyType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(GOVERNING_BODY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
    <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. St. Mary's BoG" required /></div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2"><Label>Chairperson</Label><Input value={form.chairperson_name} onChange={(e) => setForm({ ...form, chairperson_name: e.target.value })} /></div>
      <div className="space-y-2"><Label>Chairperson Contact</Label><Input value={form.chairperson_contact} onChange={(e) => setForm({ ...form, chairperson_contact: e.target.value })} /></div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2"><Label>Deputy Chairperson</Label><Input value={form.deputy_chairperson} onChange={(e) => setForm({ ...form, deputy_chairperson: e.target.value })} /></div>
      <div className="space-y-2"><Label>Secretary</Label><Input value={form.secretary} onChange={(e) => setForm({ ...form, secretary: e.target.value })} /></div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2"><Label>Treasurer</Label><Input value={form.treasurer} onChange={(e) => setForm({ ...form, treasurer: e.target.value })} /></div>
      <div className="space-y-2"><Label>Meetings</Label><Input value={form.meeting_frequency} onChange={(e) => setForm({ ...form, meeting_frequency: e.target.value })} placeholder="termly" /></div>
    </div>
    <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
    <Button type="submit" disabled={loading} className="w-full">{loading ? "Saving..." : "Save"}</Button>
  </form>);
}

function GoverningBodyMembers({ bodyId, tenantId }: { bodyId: string; tenantId: string | null }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: members } = useQuery({
    queryKey: ["body-members", bodyId], enabled: !!tenantId,
    queryFn: async () => { const { data } = await supabase.from("governing_body_members").select("*").eq("governing_body_id", bodyId).order("created_at"); return data as GoverningBodyMember[]; },
  });

  const addMember = useMutation({
    mutationFn: async (values: any) => supabase.from("governing_body_members").insert({ ...values, governing_body_id: bodyId, tenant_id: tenantId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["body-members"] }); setOpen(false); toast.success("Member added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const [newMember, setNewMember] = useState({ full_name: "", role: "member" as GoverningBodyMemberRole, phone: "", email: "" });

  return (<div>
    <div className="flex items-center justify-between mb-2"><h4 className="text-sm font-medium"><Users className="h-4 w-4 inline mr-1" />Members</h4><Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" />Add</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add Member</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); addMember.mutate(newMember); }} className="space-y-3">
        <div className="space-y-1"><Label>Full Name</Label><Input required value={newMember.full_name} onChange={(e) => setNewMember({ ...newMember, full_name: e.target.value })} /></div>
        <div className="space-y-1"><Label>Role</Label><Select value={newMember.role} onValueChange={(v) => setNewMember({ ...newMember, role: v as GoverningBodyMemberRole })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(MEMBER_ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label>Phone</Label><Input value={newMember.phone} onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })} /></div><div className="space-y-1"><Label>Email</Label><Input type="email" value={newMember.email} onChange={(e) => setNewMember({ ...newMember, email: e.target.value })} /></div></div>
        <Button type="submit" disabled={addMember.isPending} className="w-full">Add Member</Button>
      </form></DialogContent></Dialog></div>
    {members?.map((m) => <div key={m.id} className="flex items-center justify-between py-1.5 text-sm border-b last:border-0"><span>{m.full_name}</span><span className="text-muted-foreground text-xs">{MEMBER_ROLE_LABELS[m.role]}</span></div>)}
    {(!members || members.length === 0) && <p className="text-xs text-muted-foreground py-2">No members yet.</p>}
  </div>);
}

function GoverningBodyMeetings({ bodyId, tenantId }: { bodyId: string; tenantId: string | null }) {
  const queryClient = useQueryClient();
  const { data: meetings } = useQuery({
    queryKey: ["body-meetings", bodyId], enabled: !!tenantId,
    queryFn: async () => { const { data } = await supabase.from("governing_body_meetings").select("*").eq("governing_body_id", bodyId).order("meeting_date", { ascending: false }); return data as GoverningBodyMeeting[]; },
  });
  return (<div>
    <h4 className="text-sm font-medium mb-2"><Calendar className="h-4 w-4 inline mr-1" />Meetings</h4>
    {meetings?.slice(0, 3).map((m) => <div key={m.id} className="flex items-center justify-between py-1 text-sm border-b last:border-0"><span>{m.meeting_date} — {m.meeting_type}</span><Badge variant="outline" className="text-xs">{m.status}</Badge></div>)}
    {(!meetings || meetings.length === 0) && <p className="text-xs text-muted-foreground py-2">No meetings recorded.</p>}
  </div>);
}
