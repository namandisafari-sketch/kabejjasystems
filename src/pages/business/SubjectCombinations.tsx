import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { DEFAULT_COMBINATIONS, A_LEVEL_PRINCIPAL_SUBJECTS, A_LEVEL_SUBSIDIARY_SUBJECTS } from "@/lib/ncdc-grading";
import { Plus, Pencil, Trash2, BookOpen, Users, GraduationCap, Loader2, CheckCircle2 } from "lucide-react";

export default function SubjectCombinations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCombination, setEditingCombination] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", code: "", description: "", principal_subjects: [] as string[], subsidiary_subjects: [] as string[] });
  const [newPrincipal, setNewPrincipal] = useState("");
  const [newSubsidiary, setNewSubsidiary] = useState("");
  const [importing, setImporting] = useState(false);

  const { data: combinations, isLoading } = useQuery({
    queryKey: ["subject-combinations", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("subject_combinations").select("*").eq("tenant_id", tenantId).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: studentCounts } = useQuery({
    queryKey: ["combination-student-counts", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("student_combinations").select("combination_id, student_id").eq("tenant_id", tenantId);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((sc: any) => { counts[sc.combination_id] = (counts[sc.combination_id] || 0) + 1; });
      return counts;
    },
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (payload.id) {
        const { error } = await supabase.from("subject_combinations").update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("subject_combinations").insert({ ...payload, tenant_id: tenantId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-combinations"] });
      setIsAddOpen(false); setIsEditOpen(false);
      resetForm();
      toast({ title: "Combination saved", description: "Subject combination has been saved successfully" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subject_combinations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-combinations"] });
      toast({ title: "Combination deleted", description: "Subject combination has been removed" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => setFormData({ name: "", code: "", description: "", principal_subjects: [], subsidiary_subjects: [] });

  const openEdit = (combo: any) => {
    setEditingCombination(combo);
    setFormData({ name: combo.name, code: combo.code, description: combo.description || "", principal_subjects: combo.principal_subjects || [], subsidiary_subjects: combo.subsidiary_subjects || [] });
    setIsEditOpen(true);
  };

  const addPrincipal = () => {
    if (newPrincipal && formData.principal_subjects.length < 4 && !formData.principal_subjects.includes(newPrincipal)) {
      setFormData({ ...formData, principal_subjects: [...formData.principal_subjects, newPrincipal] });
      setNewPrincipal("");
    }
  };

  const addSubsidiary = () => {
    if (newSubsidiary && !formData.subsidiary_subjects.includes(newSubsidiary)) {
      setFormData({ ...formData, subsidiary_subjects: [...formData.subsidiary_subjects, newSubsidiary] });
      setNewSubsidiary("");
    }
  };

  const importDefaults = async () => {
    setImporting(true);
    try {
      let count = 0;
      for (const combo of DEFAULT_COMBINATIONS) {
        const exists = combinations?.some((c: any) => c.code === combo.code);
        if (!exists) {
          await supabase.from("subject_combinations").insert({ ...combo, tenant_id: tenantId });
          count++;
        }
      }
      queryClient.invalidateQueries({ queryKey: ["subject-combinations"] });
      toast({ title: "Import complete", description: `${count} default combinations imported` });
    } catch (err: any) {
      toast({ title: "Import error", description: err.message, variant: "destructive" });
    } finally { setImporting(false); }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">A-Level Subject Combinations</h1>
          <p className="text-muted-foreground">Manage NCDC subject combinations for S5-S6 students</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={importDefaults} disabled={importing}>
            {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <GraduationCap className="h-4 w-4 mr-2" />}
            Import Defaults
          </Button>
          <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Combination
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><BookOpen className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{combinations?.length || 0}</p><p className="text-xs text-muted-foreground">Combinations</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Users className="h-8 w-8 text-sky-500" /><div><p className="text-2xl font-bold">{Object.values(studentCounts || {}).reduce((a: number, b: number) => a + b, 0)}</p><p className="text-xs text-muted-foreground">Assigned Students</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><GraduationCap className="h-8 w-8 text-emerald-500" /><div><p className="text-2xl font-bold">{combinations?.filter((c: any) => c.is_active !== false).length || 0}</p><p className="text-xs text-muted-foreground">Active</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Subject Combinations</CardTitle><CardDescription>Each combination has 3 principal subjects and 2 subsidiary subjects</CardDescription></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !combinations?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No combinations yet. Click "Import Defaults" or "Add Combination" to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Principal Subjects (3)</TableHead>
                  <TableHead>Subsidiary Subjects (2)</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinations.map((combo: any) => (
                  <TableRow key={combo.id}>
                    <TableCell className="font-mono font-bold">{combo.code}</TableCell>
                    <TableCell>{combo.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(combo.principal_subjects || []).map((s: string) => (
                          <Badge key={s} variant="default" className="text-xs">{s}</Badge>
                        ))}
                        {(!combo.principal_subjects || combo.principal_subjects.length === 0) && <span className="text-muted-foreground text-xs">Not set</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(combo.subsidiary_subjects || []).map((s: string) => (
                          <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                        {(!combo.subsidiary_subjects || combo.subsidiary_subjects.length === 0) && <span className="text-muted-foreground text-xs">Not set</span>}
                      </div>
                    </TableCell>
                    <TableCell>{studentCounts?.[combo.id] || 0}</TableCell>
                    <TableCell><Badge variant={combo.is_active !== false ? "default" : "secondary"}>{combo.is_active !== false ? "Active" : "Inactive"}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(combo)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(combo.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Subject Combination</DialogTitle><DialogDescription>Define a new A-Level subject combination (3 principal + 2 subsidiary subjects)</DialogDescription></DialogHeader>
          <CombinationForm formData={formData} setFormData={setFormData} newPrincipal={newPrincipal} setNewPrincipal={setNewPrincipal} newSubsidiary={newSubsidiary} setNewSubsidiary={setNewSubsidiary} addPrincipal={addPrincipal} addSubsidiary={addSubsidiary} />
          <DialogFooter><Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate(formData)} disabled={saveMutation.isPending || !formData.name || !formData.code}>{saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Subject Combination</DialogTitle><DialogDescription>Modify the A-Level subject combination</DialogDescription></DialogHeader>
          <CombinationForm formData={formData} setFormData={setFormData} newPrincipal={newPrincipal} setNewPrincipal={setNewPrincipal} newSubsidiary={newSubsidiary} setNewSubsidiary={setNewSubsidiary} addPrincipal={addPrincipal} addSubsidiary={addSubsidiary} />
          <DialogFooter><Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button><Button onClick={() => saveMutation.mutate({ ...formData, id: editingCombination?.id })} disabled={saveMutation.isPending}>{saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Update</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CombinationForm({ formData, setFormData, newPrincipal, setNewPrincipal, newSubsidiary, setNewSubsidiary, addPrincipal, addSubsidiary }: any) {
  const availablePrincipals = A_LEVEL_PRINCIPAL_SUBJECTS.filter((s: string) => !formData.principal_subjects.includes(s));
  const availableSubsidiaries = A_LEVEL_SUBSIDIARY_SUBJECTS.filter((s: string) => !formData.subsidiary_subjects.includes(s));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Combination Code</Label>
          <Input placeholder="e.g., PCM" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} maxLength={5} />
        </div>
        <div className="space-y-2">
          <Label>Combination Name</Label>
          <Input placeholder="e.g., Physics, Chemistry, Mathematics" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea placeholder="Brief description of this combination pathway" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={2} />
      </div>
      <div className="space-y-2">
        <Label>Principal Subjects (3 maximum)</Label>
        <div className="flex gap-2">
          <Select value={newPrincipal} onValueChange={setNewPrincipal}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>{availablePrincipals.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={addPrincipal} disabled={!newPrincipal || formData.principal_subjects.length >= 3}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.principal_subjects.map((s: string) => (
            <Badge key={s} variant="default" className="cursor-pointer" onClick={() => setFormData({ ...formData, principal_subjects: formData.principal_subjects.filter((x: string) => x !== s) })}>
              {s} &times;
            </Badge>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Subsidiary Subjects (2 recommended)</Label>
        <div className="flex gap-2">
          <Select value={newSubsidiary} onValueChange={setNewSubsidiary}>
            <SelectTrigger className="flex-1"><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>{availableSubsidiaries.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="button" variant="outline" size="sm" onClick={addSubsidiary} disabled={!newSubsidiary}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {formData.subsidiary_subjects.map((s: string) => (
            <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => setFormData({ ...formData, subsidiary_subjects: formData.subsidiary_subjects.filter((x: string) => x !== s) })}>
              {s} &times;
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
