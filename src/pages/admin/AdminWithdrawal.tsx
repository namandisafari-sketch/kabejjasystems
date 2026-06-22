import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Download, Archive, AlertTriangle, Loader2, Database, FileDown } from "lucide-react";
import { useLanguage } from "@/i18n";

export default function AdminWithdrawal() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [withdrawDialog, setWithdrawDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [withdrawReason, setWithdrawReason] = useState("");

  const { data: tenants } = useQuery({
    queryKey: ["admin-withdrawal-tenants"],
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
    queryKey: ["admin-withdrawal-students", schoolFilter],
    queryFn: async () => {
      let q = supabase
        .from("students")
        .select("id, full_name, admission_number, admission_status, is_active, tenant_id, class_id, school_classes(name), tenants!inner(id, name)")
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
    s.admission_number?.toLowerCase().includes(search.toLowerCase())
  );

  const exportData = async (student: any) => {
    const [gradesRes, feesRes, paymentsRes, reportCardsRes] = await Promise.all([
      supabase.from("student_grades").select("*, subjects(name), academic_terms(name)").eq("student_id", student.id),
      supabase.from("student_fees").select("*, academic_terms(name)").eq("student_id", student.id),
      supabase.from("fee_payments").select("*").eq("student_id", student.id),
      supabase.from("student_report_cards").select("*, academic_terms(name)").eq("student_id", student.id),
    ]);

    const exportObj = {
      student: { full_name: student.full_name, admission_number: student.admission_number, class: (student as any).school_classes?.name, school: (student as any).tenants?.name },
      grades: gradesRes.data || [],
      fees: feesRes.data || [],
      payments: paymentsRes.data || [],
      reportCards: reportCardsRes.data || [],
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${student.admission_number}_${student.full_name.replace(/\s+/g, "_")}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Data exported" });
  };

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStudent) return;

      await supabase.from("students").update({
        is_active: false,
        admission_status: "withdrawn",
        class_id: null,
      }).eq("id", selectedStudent.id);
    },
    onSuccess: () => {
      toast({ title: "Student withdrawn", description: "Data exported and records cleared" });
      setWithdrawDialog(false);
      setSelectedStudent(null);
      setWithdrawReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawal-students"] });
    },
    onError: (err) => toast({ variant: "destructive", title: "Failed", description: err.message }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Archive className="h-6 w-6" /> {t.navigation.adminSidebarItems.withdrawal}
        </h1>
        <p className="text-muted-foreground">Export student data and clear records when a learner withdraws</p>
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
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s: any) => (
                <TableRow key={s.id} className={!s.is_active ? "opacity-60" : ""}>
                  <TableCell className="font-medium">{s.full_name}</TableCell>
                  <TableCell className="text-sm">{s.admission_number}</TableCell>
                  <TableCell className="text-sm">{(s as any).tenants?.name}</TableCell>
                  <TableCell className="text-sm">{(s as any).school_classes?.name || "—"}</TableCell>
                  <TableCell>
                    {s.is_active ? (
                      <Badge variant="default" className="bg-green-500">Active</Badge>
                    ) : (
                      <Badge variant="outline">Withdrawn</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => exportData(s)}>
                        <Download className="h-4 w-4 mr-1" /> Export
                      </Button>
                      {s.is_active && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => { setSelectedStudent(s); setWithdrawReason(""); setWithdrawDialog(true); }}
                        >
                          <Archive className="h-4 w-4 mr-1" /> Withdraw
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={withdrawDialog} onOpenChange={setWithdrawDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Withdraw Student
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will export all data for <strong>{selectedStudent?.full_name}</strong> ({selectedStudent?.admission_number}),
              then mark them as withdrawn and clear their class assignment. This frees up space for new learners.
              The data export will download automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Reason for withdrawal (optional)</Label>
            <Textarea
              placeholder="e.g. Transferred to another school, family relocation..."
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={async () => {
                if (selectedStudent) {
                  await exportData(selectedStudent);
                  withdrawMutation.mutate();
                }
              }}
              disabled={withdrawMutation.isPending}
            >
              {withdrawMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Archive className="h-4 w-4 mr-1" />}
              Export & Withdraw
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
