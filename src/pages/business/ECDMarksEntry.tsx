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
import { Save, BookOpen, Users, GraduationCap, Loader2, Trophy } from "lucide-react";

interface MarksData {
  [studentId: string]: {
    [learningAreaId: string]: {
      score: number;
      remark: string;
    };
  };
}

const ECDMarksEntry = () => {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const queryClient = useQueryClient();
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [marksData, setMarksData] = useState<MarksData>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isCalculatingRanks, setIsCalculatingRanks] = useState(false);

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

  // Fetch school classes
  const { data: classes } = useQuery({
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

  // Fetch learning areas
  const { data: learningAreas } = useQuery({
    queryKey: ["ecd-learning-areas", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ecd_learning_areas")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch students in selected class
  const { data: students } = useQuery<Array<{ id: string; full_name: string; admission_number: string | null }>>({
    queryKey: ["students-in-class", tenantId, selectedClass],
    queryFn: async () => {
      // @ts-ignore - Supabase type instantiation issue
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, admission_number")
        .eq("tenant_id", tenantId as string)
        .eq("class_id", selectedClass)
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!tenantId && !!selectedClass,
  });

  // Fetch existing report cards and ratings for students in this class
  const { data: existingData } = useQuery({
    queryKey: ["existing-marks", tenantId, selectedTerm, selectedClass, students],
    queryFn: async () => {
      if (!students || students.length === 0) return { reportCards: [], marks: {} };
      
      const studentIds = students.map(s => s.id);
      const { data: reportCards, error: rcError } = await supabase
        .from("ecd_report_cards")
        .select(`
          id,
          student_id,
          average_score,
          class_rank,
          ecd_learning_ratings (
            id,
            learning_area_id,
            numeric_score,
            remark
          )
        `)
        .eq("tenant_id", tenantId!)
        .eq("term_id", selectedTerm)
        .in("student_id", studentIds);

      if (rcError) throw rcError;

      const marks: MarksData = {};
      reportCards?.forEach((rc) => {
        marks[rc.student_id] = {};
        rc.ecd_learning_ratings?.forEach((rating) => {
          marks[rc.student_id][rating.learning_area_id] = {
            score: rating.numeric_score || 0,
            remark: rating.remark || "",
          };
        });
      });

      return { reportCards, marks };
    },
    enabled: !!tenantId && !!selectedTerm && !!selectedClass && !!students && students.length > 0,
  });

  // Load existing marks when data changes
  useEffect(() => {
    if (existingData?.marks) {
      setMarksData(existingData.marks);
    }
  }, [existingData]);

  const handleScoreChange = (studentId: string, learningAreaId: string, score: string) => {
    const numScore = Math.min(100, Math.max(0, parseInt(score) || 0));
    setMarksData((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [learningAreaId]: {
          ...prev[studentId]?.[learningAreaId],
          score: numScore,
        },
      },
    }));
  };

  const getGradeRemark = (score: number): string => {
    if (score >= 80) return "Excellent";
    if (score >= 70) return "Very Good";
    if (score >= 60) return "Good";
    if (score >= 50) return "Fair";
    return "Needs Improvement";
  };

  // Calculate ranks for all students in the class
  const calculateRanks = async () => {
    if (!tenantId || !selectedTerm || !selectedClass) return;
    
    setIsCalculatingRanks(true);
    try {
      // Get all report cards for the term and class
      const { data: reportCards, error } = await supabase
        .from("ecd_report_cards")
        .select("id, student_id, average_score")
        .eq("tenant_id", tenantId)
        .eq("term_id", selectedTerm)
        .eq("class_id", selectedClass)
        .not("average_score", "is", null);

      if (error) throw error;
      if (!reportCards || reportCards.length === 0) {
        toast.error("No report cards with scores found. Save marks first.");
        return;
      }

      // Sort by average score descending
      const sorted = [...reportCards].sort((a, b) => (b.average_score || 0) - (a.average_score || 0));
      const totalStudents = sorted.length;

      // Calculate ranks with tie handling
      for (let i = 0; i < sorted.length; i++) {
        let rank = i + 1;
        // Same score gets same rank
        if (i > 0 && sorted[i].average_score === sorted[i - 1].average_score) {
          // Find what rank was assigned to the previous one
          const prevRC = sorted[i - 1];
          const { data: prevData } = await supabase
            .from("ecd_report_cards")
            .select("class_rank")
            .eq("id", prevRC.id)
            .single();
          if (prevData?.class_rank) rank = prevData.class_rank;
        }

        await supabase
          .from("ecd_report_cards")
          .update({
            class_rank: rank,
            total_students_in_class: totalStudents,
          })
          .eq("id", sorted[i].id);
      }

      toast.success(`Calculated positions for ${totalStudents} pupils`);
      queryClient.invalidateQueries({ queryKey: ["existing-marks"] });
      queryClient.invalidateQueries({ queryKey: ["ecd-report-cards"] });
    } catch (error: any) {
      toast.error("Failed to calculate positions: " + error.message);
    } finally {
      setIsCalculatingRanks(false);
    }
  };

  const saveMarksMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId || !selectedTerm || !selectedClass || !students) {
        throw new Error("Missing required data");
      }

      setIsSaving(true);

      for (const student of students) {
        const studentMarks = marksData[student.id];
        if (!studentMarks) continue;

        const existingReportCard = existingData?.reportCards?.find(
          (rc) => rc.student_id === student.id
        );

        let reportCardId: string;

        if (existingReportCard) {
          reportCardId = existingReportCard.id;
        } else {
          const { data: newRC, error: rcError } = await supabase
            .from("ecd_report_cards")
            .insert({
              tenant_id: tenantId,
              student_id: student.id,
              term_id: selectedTerm,
              class_id: selectedClass,
              status: "draft",
            })
            .select()
            .single();

          if (rcError) throw rcError;
          reportCardId = newRC.id;
        }

        let totalScore = 0;
        let areaCount = 0;

        for (const [learningAreaId, data] of Object.entries(studentMarks)) {
          const gradeRemark = getGradeRemark(data.score);
          totalScore += data.score;
          areaCount++;

          const existingRating = existingReportCard?.ecd_learning_ratings?.find(
            (r) => r.learning_area_id === learningAreaId
          );

          if (existingRating) {
            await supabase
              .from("ecd_learning_ratings")
              .update({
                numeric_score: data.score,
                rating_code: gradeRemark.charAt(0),
                grade_remark: gradeRemark,
                remark: data.remark,
              })
              .eq("id", existingRating.id);
          } else {
            await supabase.from("ecd_learning_ratings").insert({
              report_card_id: reportCardId,
              learning_area_id: learningAreaId,
              numeric_score: data.score,
              rating_code: gradeRemark.charAt(0),
              grade_remark: gradeRemark,
              remark: data.remark,
            });
          }
        }

        const averageScore = areaCount > 0 ? totalScore / areaCount : 0;
        await supabase
          .from("ecd_report_cards")
          .update({
            total_score: totalScore,
            average_score: averageScore,
          })
          .eq("id", reportCardId);
      }
    },
    onSuccess: () => {
      toast.success("Marks saved successfully!");
      queryClient.invalidateQueries({ queryKey: ["existing-marks"] });
      queryClient.invalidateQueries({ queryKey: ["ecd-report-cards"] });
      setIsSaving(false);
    },
    onError: (error) => {
      toast.error("Failed to save marks: " + error.message);
      setIsSaving(false);
    },
  });

  const selectedTermName = terms?.find((t) => t.id === selectedTerm)?.name;
  const selectedClassName = classes?.find((c) => c.id === selectedClass)?.name;

  return (
    <div className="space-y-4 md:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Marks Entry
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Enter exam scores for each pupil by learning area
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Select Term & Class
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Academic Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms?.map((term) => (
                    <SelectItem key={term.id} value={term.id}>
                      {term.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Class</label>
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
      {selectedTerm && selectedClass && students && students.length > 0 && (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                {selectedClassName} - {selectedTermName}
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {students.length} pupils • Enter marks out of 100
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={() => saveMarksMutation.mutate()}
                disabled={isSaving}
                className="gap-2 w-full sm:w-auto"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save All Marks
              </Button>
              <Button
                onClick={calculateRanks}
                disabled={isCalculatingRanks}
                variant="secondary"
                className="gap-2 w-full sm:w-auto"
              >
                {isCalculatingRanks ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trophy className="h-4 w-4" />
                )}
                Calculate Positions
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[140px] sm:min-w-[200px] text-xs sm:text-sm p-2 sm:p-4">
                      Pupil Name
                    </TableHead>
                    {learningAreas?.map((area) => (
                      <TableHead key={area.id} className="text-center min-w-[80px] sm:min-w-[120px] p-2 sm:p-4">
                        <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                          <span className="text-[10px] sm:text-xs">{area.icon}</span>
                          <span className="text-[10px] sm:text-xs font-medium line-clamp-2">{area.name}</span>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[60px] sm:min-w-[100px] text-xs sm:text-sm p-2 sm:p-4">Total</TableHead>
                    <TableHead className="text-center min-w-[60px] sm:min-w-[100px] text-xs sm:text-sm p-2 sm:p-4">Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const studentMarks = marksData[student.id] || {};
                    let total = 0;
                    let count = 0;

                    learningAreas?.forEach((area) => {
                      if (studentMarks[area.id]?.score) {
                        total += studentMarks[area.id].score;
                        count++;
                      }
                    });

                    const average = count > 0 ? (total / count).toFixed(1) : "0.0";

                    return (
                      <TableRow key={student.id}>
                        <TableCell className="sticky left-0 bg-background z-10 font-medium p-2 sm:p-4">
                          <div>
                            <p className="text-xs sm:text-sm">{student.full_name}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              {student.admission_number}
                            </p>
                          </div>
                        </TableCell>
                        {learningAreas?.map((area) => (
                          <TableCell key={area.id} className="text-center p-1 sm:p-4">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={studentMarks[area.id]?.score || ""}
                              onChange={(e) =>
                                handleScoreChange(student.id, area.id, e.target.value)
                              }
                              className="w-12 sm:w-16 mx-auto text-center text-xs sm:text-sm h-8 sm:h-10"
                              placeholder="0"
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-center p-1 sm:p-4">
                          <Badge variant="secondary" className="font-bold text-xs sm:text-sm">
                            {total}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center p-1 sm:p-4">
                          <Badge
                            className={`text-xs sm:text-sm ${
                              parseFloat(average) >= 70
                                ? "bg-green-500"
                                : parseFloat(average) >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                          >
                            {average}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedTerm && selectedClass && students?.length === 0 && (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center px-4">
            <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium">No Pupils Found</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              No active pupils are enrolled in this class.
            </p>
          </CardContent>
        </Card>
      )}

      {(!selectedTerm || !selectedClass) && (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center px-4">
            <BookOpen className="h-10 w-10 sm:h-12 sm:w-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium">Select Term & Class</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Choose an academic term and class to start entering marks.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ECDMarksEntry;
