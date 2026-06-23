import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { ncdcGrade, ncdcGradeColor, ncdcGradeBadgeVariant, calculateWeightedScore, type AssessmentType } from "@/lib/ncdc-grading";
import { ClipboardCheck, Award, Loader2, Plus, TrendingUp, Users, BookOpen } from "lucide-react";

const ASSESSMENT_TYPES: { value: AssessmentType; label: string }[] = [
  { value: "formative", label: "Formative Assessment" },
  { value: "summative", label: "Summative Assessment" },
  { value: "project", label: "Project Work" },
  { value: "practical", label: "Practical" },
  { value: "homework", label: "Homework" },
  { value: "assignment", label: "Assignment" },
  { value: "mid_term", label: "Mid-Term" },
  { value: "end_of_term", label: "End of Term" },
];

export default function ContinuousAssessment() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedType, setSelectedType] = useState<AssessmentType>("formative");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const { data: classes } = useQuery({
    queryKey: ["classes", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("*").eq("tenant_id", tenantId).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("school_subjects").select("*").eq("tenant_id", tenantId).eq("is_active", true).order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: currentTerm } = useQuery({
    queryKey: ["current-term", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase.from("academic_terms").select("*").eq("tenant_id", tenantId).eq("is_current", true).single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: students } = useQuery({
    queryKey: ["class-students", tenantId, selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const { data: enrollments } = await supabase.from("class_enrollments")
        .select("student_id, students!inner(id, first_name, last_name, admission_number)")
        .eq("class_id", selectedClass).eq("tenant_id", tenantId).eq("academic_term_id", currentTerm?.id);
      return (enrollments || []).map((e: any) => e.students).filter(Boolean);
    },
    enabled: !!tenantId && !!selectedClass && !!currentTerm?.id,
  });

  const { data: existingAssessments } = useQuery({
    queryKey: ["continuous-assessments", tenantId, selectedClass, selectedSubject, selectedType, currentTerm?.id],
    queryFn: async () => {
      if (!selectedSubject || !selectedClass) return [];
      const { data } = await supabase.from("continuous_assessments")
        .select("*").eq("tenant_id", tenantId).eq("subject_id", selectedSubject)
        .eq("class_id", selectedClass).eq("assessment_type", selectedType)
        .eq("term_id", currentTerm?.id);
      return data || [];
    },
    enabled: !!tenantId && !!selectedSubject && !!selectedClass && !!currentTerm?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (records: any[]) => {
      for (const record of records) {
        const { error } = await supabase.from("continuous_assessments").upsert(record, { onConflict: "id" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["continuous-assessments"] });
      toast({ title: "Scores saved", description: "Assessment scores have been recorded using NCDC grading scale" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSave = () => {
    if (!selectedSubject || !selectedClass || !currentTerm?.id) return;
    const records = (students || []).map((s: any) => ({
      tenant_id: tenantId, student_id: s.id, class_id: selectedClass,
      subject_id: selectedSubject, term_id: currentTerm.id,
      assessment_type: selectedType, score: parseFloat(scores[s.id] || "0") || 0,
      max_score: 100, weight: 100, feedback: feedback[s.id] || null,
    }));
    saveMutation.mutate(records);
  };

  const assessmentData = existingAssessments || [];
  const avgScore = assessmentData.length ? assessmentData.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / assessmentData.length : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">NCDC Continuous Assessment</h1>
          <p className="text-muted-foreground">Record formative and summative assessments for A-Level (A=5 to E=1)</p>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="w-56"><Label>Class</Label><Select value={selectedClass} onValueChange={setSelectedClass}><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger><SelectContent>{classes?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="w-56"><Label>Subject</Label><Select value={selectedSubject} onValueChange={setSelectedSubject}><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{subjects?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="w-56"><Label>Assessment Type</Label><Select value={selectedType} onValueChange={(v) => setSelectedType(v as AssessmentType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ASSESSMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Users className="h-8 w-8 text-primary" /><div><p className="text-2xl font-bold">{students?.length || 0}</p><p className="text-xs text-muted-foreground">Students</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><TrendingUp className="h-8 w-8 text-sky-500" /><div><p className="text-2xl font-bold">{avgScore.toFixed(1)}</p><p className="text-xs text-muted-foreground">Class Average</p></div></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center gap-3"><Award className="h-8 w-8 text-emerald-500" /><div><p className="text-2xl font-bold">{ncdcGrade(avgScore).grade}</p><p className="text-xs text-muted-foreground">NCDC Grade ({ncdcGrade(avgScore).points} pts)</p></div></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Assessment Scores</CardTitle><CardDescription>Enter scores (0-100) using NCDC A=80-100, B=70-79, C=60-69, D=50-59, E=&lt;50 scale</CardDescription></CardHeader>
        <CardContent>
          {!selectedClass ? (
            <div className="text-center py-8 text-muted-foreground"><ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>Select a class, subject, and assessment type</p></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admission</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-24">Score (0-100)</TableHead>
                    <TableHead className="w-20">NCDC Grade</TableHead>
                    <TableHead className="w-20">Points</TableHead>
                    <TableHead>Feedback</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(students || []).map((student: any) => {
                    const existing = assessmentData.find((a: any) => a.student_id === student.id);
                    const val = scores[student.id] ?? existing?.score?.toString() ?? "";
                    const numVal = parseFloat(val) || 0;
                    const grade = ncdcGrade(numVal);
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.admission_number}</TableCell>
                        <TableCell>{student.first_name} {student.last_name}</TableCell>
                        <TableCell>
                          <Input type="number" min={0} max={100} value={val} onChange={e => setScores({ ...scores, [student.id]: e.target.value })}
                            className="w-20 h-8 text-center" />
                        </TableCell>
                        <TableCell>
                          <Badge variant={ncdcGradeBadgeVariant(grade.grade) as any} className={ncdcGradeColor(grade.grade)}>
                            {val ? grade.grade : "--"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold">{val ? grade.points : "--"}</TableCell>
                        <TableCell>
                          <Input value={feedback[student.id] ?? existing?.feedback ?? ""}
                            onChange={e => setFeedback({ ...feedback, [student.id]: e.target.value })}
                            placeholder="Optional feedback" className="h-8 text-xs" />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!students || students.length === 0) && (
                    <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No students in this class</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {(students || []).length > 0 && (
                <div className="flex justify-end mt-4">
                  <Button onClick={handleSave} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    Save Scores
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>NCDC Grade Scale Reference</CardTitle><CardDescription>NCDC Competency-Based Curriculum scoring guide for A-Level</CardDescription></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Grade</TableHead><TableHead>Points</TableHead><TableHead>Score Range</TableHead><TableHead>Label</TableHead><TableHead>Remark</TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow><TableCell><Badge variant="default" className="bg-green-600">A</Badge></TableCell><TableCell className="font-bold">5</TableCell><TableCell>80-100%</TableCell><TableCell>Excellent</TableCell><TableCell>Outstanding performance</TableCell></TableRow>
              <TableRow><TableCell><Badge variant="secondary" className="bg-blue-600 text-white">B</Badge></TableCell><TableCell className="font-bold">4</TableCell><TableCell>70-79%</TableCell><TableCell>Very Good</TableCell><TableCell>Above average performance</TableCell></TableRow>
              <TableRow><TableCell><Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">C</Badge></TableCell><TableCell className="font-bold">3</TableCell><TableCell>60-69%</TableCell><TableCell>Good</TableCell><TableCell>Satisfactory performance</TableCell></TableRow>
              <TableRow><TableCell><Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">D</Badge></TableCell><TableCell className="font-bold">2</TableCell><TableCell>50-59%</TableCell><TableCell>Fair</TableCell><TableCell>Minimum pass</TableCell></TableRow>
              <TableRow><TableCell><Badge variant="destructive">E</Badge></TableCell><TableCell className="font-bold">1</TableCell><TableCell>0-49%</TableCell><TableCell>Poor</TableCell><TableCell>Below expected standard</TableCell></TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
