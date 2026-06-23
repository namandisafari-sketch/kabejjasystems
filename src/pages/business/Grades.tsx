import { useState } from "react";
import { useLanguage } from "@/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Award, Search, Download, TrendingUp, Users, BookOpen } from "lucide-react";

export default function Grades() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: classes } = useQuery({
    queryKey: ["classes", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: subjects } = useQuery({
    queryKey: ["subjects", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_subjects")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });

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

  const { data: gradeData, isLoading } = useQuery({
    queryKey: ["grades-overview", tenantId, selectedClass, selectedSubject, currentTerm?.id],
    queryFn: async () => {
      if (!selectedClass) return null;
      const { data: enrollments } = await supabase
        .from("class_enrollments")
        .select("student_id, students!inner(id, first_name, last_name, admission_number)")
        .eq("class_id", selectedClass)
        .eq("tenant_id", tenantId!)
        .eq("academic_term_id", currentTerm?.id);
      const students = enrollments?.map((e: any) => e.students) || [];
      if (!selectedSubject || students.length === 0) return { students: [], marks: [] };
      const { data: marks } = await supabase
        .from("student_marks")
        .select("*, exam_types!inner(name, weight_percentage)")
        .eq("tenant_id", tenantId!)
        .eq("subject_id", selectedSubject)
        .in("student_id", students.map((s: any) => s.id));
      return {
        students,
        marks: marks || [],
        selectedSubject,
      };
    },
    enabled: !!tenantId && !!selectedClass,
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grades Overview</h1>
          <p className="text-muted-foreground">View and analyze student grades</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="w-64">
          <Label>Class</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes?.map((cls: any) => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-64">
          <Label>Subject</Label>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Select subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Subjects</SelectItem>
              {subjects?.map((subj: any) => (
                <SelectItem key={subj.id} value={subj.id}>{subj.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-64">
          <Label>Term</Label>
          <Input value={currentTerm?.name || "Current Term"} disabled />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gradeData?.students?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subjects?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {gradeData?.marks?.length
                ? (gradeData.marks.reduce((sum: number, m: any) => sum + (m.score || 0), 0) / gradeData.marks.length).toFixed(1)
                : "--"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="grades" className="w-full">
        <TabsList>
          <TabsTrigger value="grades">Student Grades</TabsTrigger>
          <TabsTrigger value="distribution">Grade Distribution</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="grades" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Grades</CardTitle>
              <CardDescription>
                {selectedClass
                  ? `Showing grades for ${classes?.find((c: any) => c.id === selectedClass)?.name || "selected class"}`
                  : "Select a class to view grades"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedClass ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a class and subject to view grades</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Admission No.</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradeData?.students?.length ? (
                        gradeData.students.map((student: any) => {
                          const studentMarks = gradeData.marks?.filter((m: any) => m.student_id === student.id) || [];
                          const avgScore = studentMarks.length
                            ? studentMarks.reduce((s: number, m: any) => s + (m.score || 0), 0) / studentMarks.length
                            : null;
                          const grade = avgScore !== null
                            ? avgScore >= 80 ? "A" : avgScore >= 70 ? "B" : avgScore >= 60 ? "C" : avgScore >= 50 ? "D" : "F"
                            : "--";
                          return (
                            <TableRow key={student.id}>
                              <TableCell className="font-medium">{student.admission_number}</TableCell>
                              <TableCell>{student.first_name} {student.last_name}</TableCell>
                              <TableCell>{avgScore !== null ? avgScore.toFixed(1) : "--"}</TableCell>
                              <TableCell>
                                <Badge variant={grade === "A" || grade === "B" ? "default" : grade === "F" ? "destructive" : "secondary"}>
                                  {grade}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={avgScore !== null && avgScore >= 50 ? "secondary" : "outline"}>
                                  {avgScore !== null && avgScore >= 50 ? "Pass" : avgScore !== null ? "Fail" : "No marks"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                            {selectedSubject ? "No students found in this class" : "Select a subject to view grades"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Grade Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedClass ? (
                <p className="text-muted-foreground text-center py-8">Select a class and subject to view grade distribution</p>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Grade distribution charts will be displayed here based on accumulated marks data
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Academic Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedClass ? (
                <p className="text-muted-foreground text-center py-8">Select a class to view analytics</p>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Detailed analytics including subject averages, pass rates, and trends will be available here
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
