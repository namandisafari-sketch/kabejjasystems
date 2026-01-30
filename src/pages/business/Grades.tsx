import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, Award, Search, GraduationCap } from "lucide-react";

interface Student {
  id: string;
  full_name: string;
  admission_number: string;
}

interface Exam {
  id: string;
  exam_date: string;
  max_marks: number;
  subject: { name: string; code: string } | null;
  exam_type: { name: string } | null;
}

export default function Grades() {
  const { data: tenant, isLoading: tenantLoading } = useTenant();
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedExam, setSelectedExam] = useState<string>("");
  const [scores, setScores] = useState<Record<string, number | null>>({});
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch classes
  const { data: classes } = useQuery({
    queryKey: ["school-classes", tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return [];
      const { data, error } = await supabase
        .from("school_classes")
        .select("id, name, grade")
        .eq("tenant_id", tenant.tenantId)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenant?.tenantId,
  });

  // Fetch exams for the selected class
  const { data: exams } = useQuery({
    queryKey: ["class-exams", tenant?.tenantId, selectedClass],
    queryFn: async () => {
      if (!tenant?.tenantId || !selectedClass) return [];
      const { data, error } = await supabase
        .from("exams")
        .select("id, exam_date, max_marks, subject:subject_id(name, code), exam_type:exam_type_id(name)")
        .eq("tenant_id", tenant.tenantId)
        .eq("class_id", selectedClass)
        .order("exam_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data as unknown as Exam[];
    },
    enabled: !!tenant?.tenantId && !!selectedClass,
  });

  // Fetch students for selected class
  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ["class-students", selectedClass],
    queryFn: async () => {
      if (!selectedClass) return [];
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_number")
        .eq("class_id", selectedClass)
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data as Student[];
    },
    enabled: !!selectedClass,
  });

  // Fetch existing scores for the selected exam
  const { data: existingScores } = useQuery({
    queryKey: ["exam-scores", selectedExam],
    queryFn: async () => {
      if (!selectedExam) return [];
      const { data, error } = await supabase
        .from("student_exam_scores")
        .select("student_id, marks_obtained")
        .eq("exam_id", selectedExam);
      if (error) throw error;
      
      // Initialize scores state
      const scoresMap: Record<string, number | null> = {};
      (data as { student_id: string; marks_obtained: number | null }[])?.forEach((s) => {
        scoresMap[s.student_id] = s.marks_obtained;
      });
      setScores(scoresMap);
      return data;
    },
    enabled: !!selectedExam,
  });

  // Get selected exam's max marks
  const selectedExamData = exams?.find((e) => e.id === selectedExam);
  const maxMarks = selectedExamData?.max_marks || 100;

  // Save scores mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.tenantId || !selectedExam) {
        throw new Error("Please select class and exam");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Prepare upsert data
      const scoresToSave = Object.entries(scores)
        .filter(([_, score]) => score !== null && score !== undefined)
        .map(([studentId, marks]) => ({
          tenant_id: tenant.tenantId,
          student_id: studentId,
          exam_id: selectedExam,
          marks_obtained: marks,
          graded_by: user.id,
          graded_at: new Date().toISOString(),
        }));

      if (scoresToSave.length === 0) {
        throw new Error("No scores to save");
      }

      const { error } = await supabase
        .from("student_exam_scores")
        .upsert(scoresToSave, {
          onConflict: "student_id,exam_id",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-scores"] });
      toast({ title: "Scores saved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleScoreChange = (studentId: string, value: string) => {
    const numValue = value === "" ? null : Math.min(maxMarks, Math.max(0, parseFloat(value) || 0));
    setScores((prev) => ({ ...prev, [studentId]: numValue }));
  };

  const filteredStudents = students?.filter((s) =>
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isReadyToGrade = selectedClass && selectedExam;

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6" />
            Marks Entry
          </h1>
          <p className="text-muted-foreground">
            Enter and manage student exam scores
          </p>
        </div>

        {isReadyToGrade && (
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Scores
          </Button>
        )}
      </div>

      {/* Selection Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Select Class & Exam</CardTitle>
          <CardDescription>
            Choose the class and exam to enter marks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedExam(""); setScores({}); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Exam</Label>
              <Select value={selectedExam} onValueChange={(v) => { setSelectedExam(v); setScores({}); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams?.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.subject?.name || "Unknown"} - {exam.exam_type?.name || "Exam"} ({exam.exam_date})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Marks Entry Table */}
      {isReadyToGrade && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Student Scores {selectedExamData && `(Max: ${maxMarks})`}
                </CardTitle>
                <CardDescription>
                  {filteredStudents?.length || 0} students in selected class
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {studentsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredStudents && filteredStudents.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Adm. No.</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="w-32">Score (0-{maxMarks})</TableHead>
                    <TableHead className="w-24">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student, idx) => {
                    const score = scores[student.id];
                    const grade = getGrade(score, maxMarks);
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell className="font-mono">{student.admission_number}</TableCell>
                        <TableCell className="font-medium">{student.full_name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={maxMarks}
                            value={score ?? ""}
                            onChange={(e) => handleScoreChange(student.id, e.target.value)}
                            className="w-20"
                            placeholder="--"
                          />
                        </TableCell>
                        <TableCell>
                          <span className={`font-bold ${getGradeColor(grade)}`}>
                            {grade || "-"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No students found in this class</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isReadyToGrade && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Please select a class and exam to enter marks</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Helper function to calculate grade from score (percentage-based)
function getGrade(score: number | null | undefined, maxMarks: number): string {
  if (score === null || score === undefined) return "";
  const percentage = (score / maxMarks) * 100;
  if (percentage >= 80) return "D1";
  if (percentage >= 70) return "D2";
  if (percentage >= 60) return "C3";
  if (percentage >= 55) return "C4";
  if (percentage >= 50) return "C5";
  if (percentage >= 45) return "C6";
  if (percentage >= 40) return "P7";
  if (percentage >= 35) return "P8";
  return "F9";
}

// Helper function to get grade color
function getGradeColor(grade: string): string {
  if (grade.startsWith("D")) return "text-green-600";
  if (grade.startsWith("C")) return "text-blue-600";
  if (grade.startsWith("P")) return "text-amber-600";
  if (grade === "F9") return "text-red-600";
  return "";
}
