import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, GraduationCap, Plus, Loader2, Key, CheckCircle2, XCircle, UserCheck, UserX } from "lucide-react";
import { useLanguage } from "@/i18n";

export default function AdminStudentAccounts() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [form, setForm] = useState({ studentId: "", email: "", password: "" });

  const { data: tenants } = useQuery({
    queryKey: ["admin-student-tenants"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenants")
        .select("id, name")
        .in("business_type", ["kindergarten", "primary_school", "secondary_school"])
        .eq("status", "active")
        .order("name");
      return data || [];
    },
  });

  const { data: students } = useQuery({
    queryKey: ["admin-student-accounts", schoolFilter],
    queryFn: async () => {
      let q = supabase
        .from("students")
        .select("id, full_name, admission_number, admission_status, is_active, user_id, email, class_id, school_classes(name), tenants!inner(id, name)")
        .order("full_name")
        .limit(200);
      if (schoolFilter !== "all") q = q.eq("tenants.id", schoolFilter);
      const { data } = await q;
      return data || [];
    },
  });

  const filtered = (students || []).filter((s: any) =>
    search === "" ||
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  const studentsWithoutAccount = (students || []).filter((s: any) => !s.user_id);

  const createAccountMutation = useMutation({
    mutationFn: async ({ studentId, email, password }: { studentId: string; email: string; password: string }) => {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: "student" } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      const { error } = await supabase
        .from("students")
        .update({ user_id: authData.user.id, email })
        .eq("id", studentId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Student account created" });
      setCreateOpen(false);
      setForm({ studentId: "", email: "", password: "" });
      queryClient.invalidateQueries({ queryKey: ["admin-student-accounts"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Failed", description: err.message }),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Password reset email sent" });
      setResetOpen(false);
    },
    onError: (err) => toast({ variant: "destructive", title: "Failed", description: err.message }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6" /> {t.navigation.adminSidebarItems.studentAccounts}
          </h1>
          <p className="text-muted-foreground">Manage student portal login access</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Create Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Student Portal Account</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Student</Label>
                <Select
                  value={form.studentId}
                  onValueChange={(v) => setForm({ ...form, studentId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select student (no account yet)" />
                  </SelectTrigger>
                  <SelectContent>
                    {studentsWithoutAccount.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} ({s.admission_number}) - {(s as any).tenants?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Email (login)</Label>
                <Input
                  type="email"
                  placeholder="student@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="Set initial password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createAccountMutation.mutate(form)}
                disabled={!form.studentId || !form.email || !form.password || createAccountMutation.isPending}
              >
                {createAccountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Create Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={schoolFilter} onValueChange={setSchoolFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All schools" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schools</SelectItem>
            {tenants?.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Admission #</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Portal Access</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell className="text-sm">{s.admission_number}</TableCell>
                  <TableCell className="text-sm">{(s as any).tenants?.name}</TableCell>
                  <TableCell className="text-sm">{(s as any).school_classes?.name || "—"}</TableCell>
                  <TableCell className="text-sm font-mono">{s.email || "—"}</TableCell>
                  <TableCell>
                    {s.user_id ? (
                      <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Active</Badge>
                    ) : (
                      <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" /> None</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {s.is_active ? (
                      <UserCheck className="h-4 w-4 text-green-500" />
                    ) : (
                      <UserX className="h-4 w-4 text-red-400" />
                    )}
                  </TableCell>
                  <TableCell>
                    {s.user_id && (
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedStudent(s); setResetOpen(true); }}>
                        <Key className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Send a password reset email to <strong>{selectedStudent?.email}</strong> for <strong>{selectedStudent?.full_name}</strong>?
          </p>
          <Button
            onClick={() => resetPasswordMutation.mutate({ email: selectedStudent?.email })}
            disabled={resetPasswordMutation.isPending}
          >
            {resetPasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Send Reset Email
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
