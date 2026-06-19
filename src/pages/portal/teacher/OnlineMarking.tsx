import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Save, CheckCircle2, AlertTriangle, GraduationCap } from "lucide-react";
import { pleGrade, nlscLabel, isAttendanceLocked, calculateAttendancePct } from "@/lib/grading";

const OnlineMarking = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [classLevel, setClassLevel] = useState("");

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data: p } = await supabase.from("profiles").select("tenant_id, id").eq("id", session.user.id).single();
    if (!p?.tenant_id) return;
    setTenantId(p.tenant_id);

    const [cl, ex] = await Promise.all([
      supabase.from("school_classes").select("*").eq("tenant_id", p.tenant_id).eq("is_active", true).order("name"),
      supabase.from("exam_results").select("exam_id").eq("tenant_id", p.tenant_id).not("exam_id", "is", null).order("submitted_at", { ascending: false }),
    ]);
    setClasses(cl.data || []);
    const uniqueExams = [...new Set((ex.data || []).map(r => r.exam_id))];
    setExams(uniqueExams.map(id => ({ id })));

    const { data: subAssignments } = await supabase
      .from("teacher_subject_assignments")
      .select("subject_id, class_id")
      .eq("teacher_id", p.id)
      .eq("tenant_id", p.tenant_id);
    const subIds = [...new Set((subAssignments || []).map(s => s.subject_id))];
    if (subIds.length > 0) {
      const { data: subs } = await supabase
        .from("subjects")
        .select("*")
        .in("id", subIds)
        .eq("is_active", true)
        .order("name");
      setSubjects(subs || []);
    }

    setLoading(false);
  };

  const loadStudents = async () => {
    if (!selectedClass) return;
    const cl = classes.find(c => c.id === selectedClass);
    setClassLevel(cl?.level || "");

    const [st, att] = await Promise.all([
      supabase.from("students").select("*").eq("tenant_id", tenantId).eq("class_id", selectedClass).order("full_name"),
      supabase.from("student_attendance").select("*").eq("tenant_id", tenantId),
    ]);
    setStudents(st.data || []);
    setAttendance(att.data || []);
  };

  useEffect(() => { if (selectedClass) loadStudents(); }, [selectedClass]);

  const getAttendancePct = (studentId: string) => {
    const studentAtt = attendance.filter(a => a.student_id === studentId);
    const present = studentAtt.filter(a => a.status === "Present").length;
    return calculateAttendancePct(present, studentAtt.length || 1);
  };

  const handleScoreChange = (studentId: string, value: string) => {
    setScores(prev => ({ ...prev, [studentId]: value }));
  };

  const handleRemarkChange = (studentId: string, value: string) => {
    setRemarks(prev => ({ ...prev, [studentId]: value }));
  };

  const getGrade = (scoreVal: number) => {
    if (classLevel?.toLowerCase().includes("s") || classLevel?.toLowerCase().includes("secondary")) {
      return `Score ${scoreVal}`;
    }
    return pleGrade(scoreVal).grade;
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const entries = students.map(s => {
      const scoreVal = parseFloat(scores[s.id]);
      const grade = classLevel?.toLowerCase().includes("s") || classLevel?.toLowerCase().includes("secondary")
        ? `${scoreVal}`
        : scoreVal ? pleGrade(scoreVal).grade : null;
      return {
        tenant_id: tenantId,
        student_id: s.id,
        exam_id: selectedExam || null,
        score_achieved: scoreVal || null,
        grade,
        remarks: remarks[s.id] || null,
        status: "approved",
        marked_by: "teacher",
        submitted_at: new Date().toISOString(),
      };
    }).filter(e => e.score_achieved != null);

    if (entries.length > 0) {
      await supabase.from("exam_results").insert(entries);
    }

    setSaving(false);
    setScores({});
    setRemarks({});
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const isNlsc = classLevel?.toLowerCase().includes("s") || classLevel?.toLowerCase().includes("secondary");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <GraduationCap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Online Marking</h1>
          <p className="text-sm text-muted-foreground">
            {isNlsc ? "NLSC Competency-Based Scoring (1-3)" : "UNEB PLE Standard Grading (D1-F9)"}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Class</Label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                <option value="">Select class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
                <option value="">Select subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Exam / Assignment</Label>
              <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={selectedExam} onChange={e => setSelectedExam(e.target.value)}>
                <option value="">Select exam</option>
                {exams.map(e => <option key={e.id} value={e.id}>{e.id}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClass && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Students</CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{isNlsc ? "NLSC: 1=Excellent, 2=Moderate, 3=Basic" : "PLE: D1(90-100) to F9(0-39)"}</span>
                <Button onClick={handleSaveAll} disabled={saving} size="sm">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save All Marks
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {students.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No students in this class.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">#</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Student</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Adm No.</th>
                      <th className="text-center text-xs font-medium text-muted-foreground uppercase px-4 py-3">Attendance</th>
                      <th className="text-center text-xs font-medium text-muted-foreground uppercase px-4 py-3">Score</th>
                      <th className="text-center text-xs font-medium text-muted-foreground uppercase px-4 py-3">Grade</th>
                      <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {students.map((s, i) => {
                      const attPct = getAttendancePct(s.id);
                      const locked = isAttendanceLocked(attPct);
                      const scoreVal = parseFloat(scores[s.id]);
                      const grade = scoreVal ? getGrade(scoreVal) : null;

                      return (
                        <tr key={s.id} className={`hover:bg-muted/30 ${locked ? "bg-red-50" : ""}`}>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3 text-sm font-medium">{s.full_name}</td>
                          <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{s.admission_number}</td>
                          <td className="px-4 py-3 text-center">
                            {locked ? (
                              <div className="flex items-center justify-center gap-1">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <Badge className="bg-red-100 text-red-700">{attPct}%</Badge>
                              </div>
                            ) : (
                              <Badge className="bg-green-100 text-green-700">{attPct}%</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Input
                              type="number"
                              className={`w-20 h-8 text-center text-sm ${locked ? "opacity-50 bg-gray-100" : ""}`}
                              placeholder={isNlsc ? "1-3" : "0-100"}
                              min={isNlsc ? 1 : 0}
                              max={isNlsc ? 3 : 100}
                              value={scores[s.id] || ""}
                              onChange={e => handleScoreChange(s.id, e.target.value)}
                              disabled={locked}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {grade && (
                              <Badge className={
                                isNlsc
                                  ? scoreVal === 1 ? "bg-green-100 text-green-700" : scoreVal === 2 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                                  : scoreVal >= 80 ? "bg-green-100 text-green-700" : scoreVal >= 60 ? "bg-blue-100 text-blue-700" : scoreVal >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                              }>
                                {isNlsc ? nlscLabel(scoreVal as any) : grade}
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              className={`h-8 text-sm ${locked ? "opacity-50 bg-gray-100" : ""}`}
                              placeholder="Optional remark"
                              value={remarks[s.id] || ""}
                              onChange={e => handleRemarkChange(s.id, e.target.value)}
                              disabled={locked}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedClass && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Select a class above to begin marking</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OnlineMarking;