import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, BookOpen, Users, GraduationCap, Loader2, Wand2, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  generateClassTeacherRemark,
  generateHeadTeacherRemark,
  generateSubjectRemark,
  getPerformanceLevel,
} from "@/lib/remarksGenerator";

interface MarksData {
  [studentId: string]: {
    [subjectId: string]: {
      score: number;
      grade: string;
    };
  };
}

interface StudentScore {
  studentId: string;
  studentName: string;
  average: number;
  grade: string;
  subjects: Record<string, { score: number; grade: string }>;
}

const getGradeFromScore = (score: number): string => {
  if (score >= 90) return 'A*';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  if (score >= 40) return 'E';
  if (score >= 30) return 'F';
  return 'G';
};

export default function MarksEntry() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const queryClient = useQueryClient();
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [marksData, setMarksData] = useState<MarksData>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showRemarksPreview, setShowRemarksPreview] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentScore | null>(null);

  // Fetch academic terms
  const { data: terms } = useQuery({
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

  // Set default to current term
  useEffect(() => {
    if (terms && terms.length > 0 && !selectedTerm) {
      const currentTerm = terms.find(t => t.is_current);
      setSelectedTerm(currentTerm?.id || terms[0].id);
    }
  }, [terms]);

  // Fetch school classes (excluding ECD)
  const { data: classes } = useQuery({
    queryKey: ["school-classes", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_classes")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .not("name", "ilike", "%ECD%")
        .not("name", "ilike", "%Nursery%")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch school subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ["school-subjects", tenantId, selectedClass],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_subjects")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!selectedClass,
  });

  // Fetch students in selected class
  const { data: students = [] } = useQuery({
    queryKey: ["students-in-class", tenantId, selectedClass],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_number")
        .eq("tenant_id", tenantId!)
        .eq("class_id", selectedClass)
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId && !!selectedClass,
  });

  // Fetch existing scores for students
  const { data: existingScores } = useQuery({
    queryKey: ["existing-marks", tenantId, selectedTerm, selectedClass],
    queryFn: async () => {
      if (!students || students.length === 0) return {};

      const studentIds = students.map(s => s.id);
      const { data, error } = await supabase
        .from("student_report_cards")
        .select(`
          id,
          student_id,
          academic_scores (
            id,
            subject_id,
            score
          )
        `)
        .eq("tenant_id", tenantId!)
        .eq("term_id", selectedTerm)
        .in("student_id", studentIds);

      if (error) throw error;

      const marks: MarksData = {};
      data?.forEach((rc) => {
        marks[rc.student_id] = {};
        rc.academic_scores?.forEach((score) => {
          marks[rc.student_id][score.subject_id] = {
            score: score.score || 0,
            grade: getGradeFromScore(score.score || 0),
          };
        });
      });

      return marks;
    },
    enabled: !!tenantId && !!selectedTerm && !!selectedClass && students.length > 0,
  });

  // Load existing marks when data changes
  useEffect(() => {
    if (existingScores) {
      setMarksData(existingScores);
    }
  }, [existingScores]);

  // Save marks mutation
  const saveMarksMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);

      for (const studentId in marksData) {
        // Get or create report card
        let reportCard = await supabase
          .from("student_report_cards")
          .select("id")
          .eq("tenant_id", tenantId!)
          .eq("term_id", selectedTerm)
          .eq("student_id", studentId)
          .single();

        let reportCardId = reportCard.data?.id;

        if (!reportCard.data) {
          const { data: newRc, error: rcError } = await supabase
            .from("student_report_cards")
            .insert({
              tenant_id: tenantId!,
              term_id: selectedTerm,
              student_id: studentId,
              created_by: (await supabase.auth.getUser()).data.user?.id,
            })
            .select("id")
            .single();

          if (rcError) throw rcError;
          reportCardId = newRc.id;
        }

        // Save scores
        for (const subjectId in marksData[studentId]) {
          const score = marksData[studentId][subjectId].score;

          // Check if score exists
          const { data: existingScore } = await supabase
            .from("academic_scores")
            .select("id")
            .eq("report_card_id", reportCardId)
            .eq("subject_id", subjectId)
            .single();

          if (existingScore?.id) {
            // Update
            await supabase
              .from("academic_scores")
              .update({ score })
              .eq("id", existingScore.id);
          } else {
            // Insert
            await supabase
              .from("academic_scores")
              .insert({
                report_card_id: reportCardId,
                subject_id: subjectId,
                score,
              });
          }
        }
      }

      setIsSaving(false);
      return true;
    },
    onSuccess: () => {
      toast.success("Marks saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["existing-marks"] });
    },
    onError: (error: any) => {
      setIsSaving(false);
      toast.error(error.message || "Failed to save marks");
    },
  });

  const handleScoreChange = (studentId: string, subjectId: string, score: string) => {
    const numScore = Math.min(100, Math.max(0, parseInt(score) || 0));
    setMarksData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subjectId]: {
          score: numScore,
          grade: getGradeFromScore(numScore),
        },
      },
    }));
  };

  const calculateStudentStats = (studentId: string): StudentScore => {
    const student = students.find(s => s.id === studentId);
    const scores = Object.values(marksData[studentId] || {}).map(s => s.score);
    const average = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return {
      studentId,
      studentName: student?.full_name || 'Unknown',
      average,
      grade: getGradeFromScore(average),
      subjects: marksData[studentId] || {},
    };
  };

  const handlePreviewRemarks = (studentId: string) => {
    const stats = calculateStudentStats(studentId);
    setSelectedStudent(stats);
    setShowRemarksPreview(true);
  };

  if (!tenantId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          Marks Entry
        </h1>
        <p className="text-muted-foreground mt-2">
          Enter and manage student marks for coordination with report cards and automated remarks
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms?.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name} - {term.year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Class</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
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
          </div>
        </CardContent>
      </Card>

      {/* Marks Entry Table */}
      {selectedTerm && selectedClass && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Student Marks Entry</CardTitle>
            <Button
              onClick={() => saveMarksMutation.mutate()}
              disabled={isSaving || Object.keys(marksData).length === 0}
              className="gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Marks
            </Button>
          </CardHeader>
          <CardContent>
            {students.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No students in this class
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      {subjects?.map((subject) => (
                        <TableHead key={subject.id} className="text-center">
                          {subject.name.substring(0, 8)}
                        </TableHead>
                      ))}
                      <TableHead className="text-center">Average</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => {
                      const stats = calculateStudentStats(student.id);
                      return (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.full_name}</TableCell>
                          {subjects?.map((subject) => (
                            <TableCell key={subject.id} className="text-center">
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={
                                  marksData[student.id]?.[subject.id]?.score || ""
                                }
                                onChange={(e) =>
                                  handleScoreChange(student.id, subject.id, e.target.value)
                                }
                                className="w-16 text-center"
                              />
                            </TableCell>
                          ))}
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-center">
                              {stats.average}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreviewRemarks(student.id)}
                              className="gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              Preview
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Remarks Preview Dialog */}
      <Dialog open={showRemarksPreview} onOpenChange={setShowRemarksPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Automated Remarks Preview</DialogTitle>
            <DialogDescription>
              {selectedStudent?.studentName} - Average Score: {selectedStudent?.average}%
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-6">
              {/* Performance Level */}
              <div>
                <h3 className="font-semibold mb-2">Performance Level</h3>
                <div className={`p-3 rounded-lg ${getPerformanceLevel(selectedStudent.average).color}`}>
                  <p className="font-bold">
                    {getPerformanceLevel(selectedStudent.average).level}
                  </p>
                  <p className="text-sm">
                    {getPerformanceLevel(selectedStudent.average).description}
                  </p>
                </div>
              </div>

              {/* Class Teacher Remark */}
              <div>
                <h3 className="font-semibold mb-2">Class Teacher Remarks</h3>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-700">
                    {generateClassTeacherRemark(
                      selectedStudent.average,
                      selectedStudent.studentName
                    )}
                  </p>
                </div>
              </div>

              {/* Head Teacher Remark */}
              <div>
                <h3 className="font-semibold mb-2">Head Teacher Remarks</h3>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-700">
                    {generateHeadTeacherRemark(
                      selectedStudent.average,
                      selectedStudent.studentName
                    )}
                  </p>
                </div>
              </div>

              {/* Subject Performance */}
              <div>
                <h3 className="font-semibold mb-2">Subject Remarks</h3>
                <div className="space-y-2">
                  {subjects?.map((subject) => {
                    const score = selectedStudent.subjects[subject.id]?.score || 0;
                    return (
                      <div key={subject.id} className="bg-gray-50 p-3 rounded-lg border">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-sm">{subject.name}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {generateSubjectRemark(score, subject.name)}
                            </p>
                          </div>
                          <Badge>{score}%</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h3 className="font-semibold mb-2">Recommendations</h3>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-sm text-gray-700">
                    {getPerformanceLevel(selectedStudent.average).recommendation}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowRemarksPreview(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Icon for filter
import { Filter } from "lucide-react";
