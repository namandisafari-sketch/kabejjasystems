import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getStudentSession } from "@/pages/StudentLogin";
import {
  BookOpen, CheckCircle2, Circle, Clock,
  GraduationCap, Target,
} from "lucide-react";

export default function StudentCurriculum() {
  const session = getStudentSession()!;
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const { data: student } = useQuery({
    queryKey: ["student-info", session.studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("class_id, date_of_birth, gender")
        .eq("id", session.studentId)
        .single();
      return data;
    },
  });

  const { data: subjects, isLoading: subjectsLoading } = useQuery({
    queryKey: ["student-curriculum-subjects", session.tenantId, student?.class_id],
    queryFn: async () => {
      if (!student?.class_id) return [];
      const { data } = await supabase
        .from("subjects")
        .select("id, name, code, is_core")
        .eq("tenant_id", session.tenantId)
        .order("name");
      return data || [];
    },
    enabled: !!student?.class_id,
  });

  const subjectIds = (subjects || []).map((s: any) => s.id);

  const { data: lessonPlans } = useQuery({
    queryKey: ["student-curriculum-plans", session.tenantId, student?.class_id, subjectIds],
    queryFn: async () => {
      if (!student?.class_id || subjectIds.length === 0) return [];

      const { data } = await supabase
        .from("lesson_plans")
        .select("id, title, subject_id, class_id, status, created_at, content")
        .eq("tenant_id", session.tenantId)
        .eq("class_id", student.class_id)
        .in("subject_id", subjectIds)
        .order("created_at", { ascending: false });

      return data || [];
    },
    enabled: !!student?.class_id && subjectIds.length > 0,
  });

  const plansBySubject: Record<string, any[]> = {};
  (lessonPlans || []).forEach((p: any) => {
    if (!plansBySubject[p.subject_id]) plansBySubject[p.subject_id] = [];
    plansBySubject[p.subject_id].push(p);
  });

  const getSubjectProgress = (subId: string) => {
    const plans = plansBySubject[subId] || [];
    const total = plans.length;
    const completed = plans.filter((p: any) => p.status === "completed").length;
    return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6" /> Curriculum & Syllabus
        </h1>
        <p className="text-muted-foreground">Track your class syllabus and lesson progress</p>
      </div>

      {/* Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Syllabus Overview
          </CardTitle>
          <CardDescription>
            {session.className} — {subjects?.length || 0} subjects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {(subjects || []).map((sub: any) => {
              const progress = getSubjectProgress(sub.id);
              return (
                <button
                  key={sub.id}
                  onClick={() => setExpandedSubject(expandedSubject === sub.id ? null : sub.id)}
                  className={`p-3 rounded-lg border text-left transition-all text-sm ${
                    expandedSubject === sub.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="font-medium truncate">{sub.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">{sub.code}</div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>{progress.percent}%</span>
                      <span>{progress.completed}/{progress.total}</span>
                    </div>
                    <Progress value={progress.percent} className="h-1.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Subject Plans */}
      {subjects?.map((sub: any) => {
        if (expandedSubject !== sub.id) return null;
        const plans = plansBySubject[sub.id] || [];
        const progress = getSubjectProgress(sub.id);

        return (
          <Card key={sub.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    {sub.name}
                  </CardTitle>
                  <CardDescription>{sub.code} · {progress.completed} of {progress.total} lessons completed</CardDescription>
                </div>
                <Badge variant={progress.total > 0 && progress.completed === progress.total ? "default" : "secondary"}>
                  {progress.percent}%
                </Badge>
              </div>
              <Progress value={progress.percent} className="h-2 mt-2" />
            </CardHeader>
            <CardContent>
              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No lesson plans available yet for this subject.</p>
              ) : (
                <div className="space-y-2">
                  {plans.map((plan: any) => {
                    const isComplete = plan.status === "completed";
                    return (
                      <div
                        key={plan.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
                          isComplete ? "bg-green-50/50 border-green-200" : "bg-card"
                        }`}
                      >
                        {isComplete ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        ) : plan.status === "incomplete" ? (
                          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${isComplete ? "text-green-700" : ""}`}>
                            {plan.title}
                          </p>
                          {plan.content?.topic && (
                            <p className="text-xs text-muted-foreground truncate">{plan.content.topic}</p>
                          )}
                        </div>
                        <Badge
                          variant={isComplete ? "default" : "outline"}
                          className={`text-xs shrink-0 ${
                            isComplete ? "bg-green-100 text-green-700 hover:bg-green-100" : ""
                          }`}
                        >
                          {plan.status || "planned"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {(!subjects || subjects.length === 0) && !subjectsLoading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No subjects found for your class.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
