import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { 
  ClipboardCheck, Plus, Calendar, Clock, MapPin, User, BookOpen,
  Settings, Trash2, Edit, FileText, AlertCircle, CheckCircle, XCircle
} from "lucide-react";
import { format } from "date-fns";

const EXAM_STATUSES = [
  { value: "scheduled", label: "Scheduled", color: "bg-blue-100 text-blue-800" },
  { value: "ongoing", label: "Ongoing", color: "bg-yellow-100 text-yellow-800" },
  { value: "completed", label: "Completed", color: "bg-green-100 text-green-800" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
];

export default function Exams() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;

  const [activeTab, setActiveTab] = useState("exams");
  const [isExamDialogOpen, setIsExamDialogOpen] = useState(false);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [editingType, setEditingType] = useState<any>(null);
  const [selectedExam, setSelectedExam] = useState<any>(null);

  const [examForm, setExamForm] = useState({
    term_id: "",
    exam_type_id: "",
    class_id: "",
    subject_id: "",
    exam_date: "",
    start_time: "",
    end_time: "",
    duration_minutes: 60,
    max_marks: 100,
    venue: "",
    instructions: "",
  });

  const [typeForm, setTypeForm] = useState({
    name: "",
    code: "",
    weight_percentage: 100,
    description: "",
  });

  // Fetch current term
  const { data: currentTerm } = useQuery({
    queryKey: ["current-term", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_terms")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_current", true)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch all terms
  const { data: terms = [] } = useQuery({
    queryKey: ["academic-terms", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_terms")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("year", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch exam types
  const { data: examTypes = [] } = useQuery({
    queryKey: ["exam-types", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_types")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ["school-classes", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_classes")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch exams
  const { data: exams = [], isLoading: isLoadingExams } = useQuery({
    queryKey: ["exams", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("exam_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch students for selected exam's class
  const { data: students = [] } = useQuery({
    queryKey: ["students-for-exam", selectedExam?.class_id, tenantId],
    queryFn: async (): Promise<any[]> => {
      if (!selectedExam?.class_id || !tenantId) return [];
      const { data, error } = await (supabase as any)
        .from("students")
        .select("id, full_name, admission_number")
        .eq("tenant_id", tenantId)
        .eq("class_id", selectedExam.class_id)
        .eq("status", "active");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedExam?.class_id && !!tenantId,
  });

  // Fetch exam results for selected exam
  const { data: examResults = [] } = useQuery({
    queryKey: ["exam-results", selectedExam?.id],
    queryFn: async (): Promise<any[]> => {
      if (!selectedExam?.id) return [];
      const { data, error } = await (supabase as any)
        .from("exam_results")
        .select("*")
        .eq("exam_id", selectedExam.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedExam?.id,
  });

  // Save exam type
  const saveTypeMutation = useMutation({
    mutationFn: async (formData: typeof typeForm) => {
      if (editingType) {
        const { error } = await supabase
          .from("exam_types")
          .update(formData)
          .eq("id", editingType.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("exam_types")
          .insert({ ...formData, tenant_id: tenantId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-types"] });
      setIsTypeDialogOpen(false);
      setEditingType(null);
      setTypeForm({ name: "", code: "", weight_percentage: 100, description: "" });
      toast({ title: editingType ? "Exam type updated" : "Exam type added" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Save exam
  const saveExamMutation = useMutation({
    mutationFn: async (formData: typeof examForm) => {
      const payload = {
        ...formData,
        term_id: formData.term_id || currentTerm?.id,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
      };
      if (editingExam) {
        const { error } = await supabase
          .from("exams")
          .update(payload)
          .eq("id", editingExam.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("exams")
          .insert({ ...payload, tenant_id: tenantId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      setIsExamDialogOpen(false);
      setEditingExam(null);
      resetExamForm();
      toast({ title: editingExam ? "Exam updated" : "Exam scheduled" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Save results
  const saveResultsMutation = useMutation({
    mutationFn: async (results: { student_id: string; marks: number; is_absent: boolean }[]) => {
      for (const result of results) {
        const { error } = await supabase
          .from("student_exam_scores")
          .upsert({
            exam_id: selectedExam.id,
            student_id: result.student_id,
            tenant_id: tenantId,
            marks_obtained: result.is_absent ? null : result.marks,
            is_absent: result.is_absent,
            graded_at: new Date().toISOString(),
          }, { onConflict: "exam_id,student_id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-results"] });
      toast({ title: "Results saved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetExamForm = () => {
    setExamForm({
      term_id: "",
      exam_type_id: "",
      class_id: "",
      subject_id: "",
      exam_date: "",
      start_time: "",
      end_time: "",
      duration_minutes: 60,
      max_marks: 100,
      venue: "",
      instructions: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = EXAM_STATUSES.find(s => s.value === status);
    return <Badge className={statusConfig?.color}>{statusConfig?.label || status}</Badge>;
  };

  const upcomingExams = exams.filter((e: any) => new Date(e.exam_date) >= new Date() && e.status === "scheduled");
  const completedExams = exams.filter((e: any) => e.status === "completed");

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Exams Management
          </h1>
          <p className="text-sm text-muted-foreground">Schedule exams and record results</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Exam Types</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage Exam Types</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Name</Label>
                      <Input
                        placeholder="e.g., Mid-Term"
                        value={typeForm.name}
                        onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Code</Label>
                      <Input
                        placeholder="e.g., MID"
                        value={typeForm.code}
                        onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Weight %</Label>
                    <Input
                      type="number"
                      value={typeForm.weight_percentage}
                      onChange={(e) => setTypeForm({ ...typeForm, weight_percentage: Number(e.target.value) })}
                    />
                  </div>
                  <Button onClick={() => saveTypeMutation.mutate(typeForm)}>
                    {editingType ? "Update" : "Add Type"}
                  </Button>
                </div>
                <div className="space-y-2">
                  {examTypes.map((type: any) => (
                    <div key={type.id} className="flex items-center justify-between p-3 bg-card border rounded-lg">
                      <div>
                        <p className="font-medium">{type.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {type.code} • {type.weight_percentage}% weight
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingType(type);
                            setTypeForm({
                              name: type.name,
                              code: type.code || "",
                              weight_percentage: type.weight_percentage,
                              description: type.description || "",
                            });
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={() => setIsExamDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Schedule Exam</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Upcoming</p>
                <p className="text-xl font-bold">{upcomingExams.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-xl font-bold">{completedExams.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Exam Types</p>
                <p className="text-xl font-bold">{examTypes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ClipboardCheck className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Exams</p>
                <p className="text-xl font-bold">{exams.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Exams List */}
      <Card>
        <CardHeader>
          <CardTitle>All Exams</CardTitle>
          <CardDescription>View and manage scheduled exams</CardDescription>
        </CardHeader>
        <CardContent>
          {exams.length > 0 ? (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((exam: any) => {
                    const examType = examTypes.find((t: any) => t.id === exam.exam_type_id);
                    const examClass = classes.find((c: any) => c.id === exam.class_id);
                    const examSubject = subjects.find((s: any) => s.id === exam.subject_id);
                    return (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                            {examSubject?.name || "—"}
                          </div>
                        </TableCell>
                        <TableCell>{examClass?.name || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{examType?.name || "—"}</Badge>
                        </TableCell>
                        <TableCell>
                          {exam.exam_date ? format(new Date(exam.exam_date), "MMM d, yyyy") : "—"}
                        </TableCell>
                        <TableCell>
                          {exam.start_time ? exam.start_time.slice(0, 5) : "—"}
                          {exam.end_time && ` - ${exam.end_time.slice(0, 5)}`}
                        </TableCell>
                        <TableCell>{getStatusBadge(exam.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedExam(exam);
                              setIsResultsDialogOpen(true);
                            }}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Results
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingExam(exam);
                              setExamForm({
                                term_id: exam.term_id,
                                exam_type_id: exam.exam_type_id,
                                class_id: exam.class_id,
                                subject_id: exam.subject_id,
                                exam_date: exam.exam_date,
                                start_time: exam.start_time || "",
                                end_time: exam.end_time || "",
                                duration_minutes: exam.duration_minutes || 60,
                                max_marks: exam.max_marks || 100,
                                venue: exam.venue || "",
                                instructions: exam.instructions || "",
                              });
                              setIsExamDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-12">
              <ClipboardCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No exams scheduled</h3>
              <p className="text-muted-foreground mb-4">
                Schedule your first exam to get started.
              </p>
              <Button onClick={() => setIsExamDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Exam
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exam Dialog */}
      <Dialog open={isExamDialogOpen} onOpenChange={setIsExamDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingExam ? "Edit Exam" : "Schedule New Exam"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Exam Type *</Label>
                <Select
                  value={examForm.exam_type_id}
                  onValueChange={(v) => setExamForm({ ...examForm, exam_type_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {examTypes.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Term</Label>
                <Select
                  value={examForm.term_id || currentTerm?.id}
                  onValueChange={(v) => setExamForm({ ...examForm, term_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent>
                    {terms.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} ({t.year})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Class *</Label>
                <Select
                  value={examForm.class_id}
                  onValueChange={(v) => setExamForm({ ...examForm, class_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subject *</Label>
                <Select
                  value={examForm.subject_id}
                  onValueChange={(v) => setExamForm({ ...examForm, subject_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Exam Date *</Label>
              <Input
                type="date"
                value={examForm.exam_date}
                onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={examForm.start_time}
                  onChange={(e) => setExamForm({ ...examForm, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={examForm.end_time}
                  onChange={(e) => setExamForm({ ...examForm, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Marks</Label>
                <Input
                  type="number"
                  value={examForm.max_marks}
                  onChange={(e) => setExamForm({ ...examForm, max_marks: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Venue</Label>
                <Input
                  placeholder="e.g., Hall A"
                  value={examForm.venue}
                  onChange={(e) => setExamForm({ ...examForm, venue: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Instructions</Label>
              <Textarea
                placeholder="Exam instructions..."
                value={examForm.instructions}
                onChange={(e) => setExamForm({ ...examForm, instructions: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsExamDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => saveExamMutation.mutate(examForm)}
              disabled={!examForm.exam_type_id || !examForm.class_id || !examForm.subject_id || !examForm.exam_date}
              className="flex-1"
            >
              {editingExam ? "Update Exam" : "Schedule Exam"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={isResultsDialogOpen} onOpenChange={setIsResultsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Enter Results: {selectedExam?.subject?.name} - {selectedExam?.class?.name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="w-24">Marks (/{selectedExam?.max_marks})</TableHead>
                  <TableHead className="w-20">Absent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student: any) => {
                  const result = examResults.find((r: any) => r.student_id === student.id);
                  return (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.full_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max={selectedExam?.max_marks}
                          defaultValue={result?.marks_obtained || ""}
                          className="w-20"
                          id={`marks-${student.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="checkbox"
                          defaultChecked={result?.is_absent}
                          id={`absent-${student.id}`}
                          className="h-4 w-4"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsResultsDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => {
                const results = students.map((s: any) => ({
                  student_id: s.id,
                  marks: Number((document.getElementById(`marks-${s.id}`) as HTMLInputElement)?.value || 0),
                  is_absent: (document.getElementById(`absent-${s.id}`) as HTMLInputElement)?.checked || false,
                }));
                saveResultsMutation.mutate(results);
              }}
              className="flex-1"
            >
              Save Results
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
