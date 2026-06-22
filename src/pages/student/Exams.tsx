import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStudentSession } from "@/pages/StudentLogin";
import { CalendarClock, Clock, MapPin, Timer } from "lucide-react";
import { format, differenceInDays, differenceInHours, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n";

function Countdown({ targetDate }: { targetDate: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const target = parseISO(targetDate);
  const days = differenceInDays(target, now);
  const hours = differenceInHours(target, now) % 24;

  if (days < 0) return <Badge variant="secondary">Completed</Badge>;
  if (days === 0 && hours <= 0) return <Badge variant="default">Today!</Badge>;

  return (
    <Badge variant="outline" className="text-xs font-mono">
      <Timer className="h-3 w-3 mr-1" />
      {days > 0 ? `${days}d ` : ""}{hours}h remaining
    </Badge>
  );
}

export default function StudentExams() {
  const session = getStudentSession()!;
  const { t } = useLanguage();

  const { data: exams, isLoading } = useQuery({
    queryKey: ["student-exams", session.studentId, session.className],
    queryFn: async () => {
      const { data: student } = await supabase
        .from("students")
        .select("class_id")
        .eq("id", session.studentId)
        .single();

      if (!student?.class_id) return [];

      const { data } = await supabase
        .from("exams")
        .select("id, exam_name, exam_date, start_time, end_time, venue, instructions, status, subjects(name)")
        .eq("class_id", student.class_id)
        .order("exam_date", { ascending: true })
        .order("start_time", { ascending: true });

      return (data || []).sort((a, b) => {
        if (!a.exam_date) return 1;
        if (!b.exam_date) return -1;
        return new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime();
      });
    },
  });

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      scheduled: { label: "Scheduled", variant: "outline" },
      ongoing: { label: "Ongoing", variant: "default" },
      completed: { label: "Completed", variant: "secondary" },
      cancelled: { label: "Cancelled", variant: "destructive" },
    };
    return map[status] || { label: status, variant: "outline" as const };
  };

  const now = new Date();
  const upcoming = exams?.filter(e => e.exam_date && new Date(e.exam_date) >= now) || [];
  const past = exams?.filter(e => !e.exam_date || new Date(e.exam_date) < now) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarClock className="h-6 w-6" /> {t.exams.title} {t.nav.timetable}
        </h1>
        <p className="text-muted-foreground">View your scheduled exams and countdown</p>
      </div>

      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Exams</CardTitle>
            <CardDescription>{upcoming.length} exam(s) scheduled</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.map((exam) => (
              <div key={exam.id} className="p-4 rounded-lg border bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{exam.exam_name}</h3>
                      {(exam as any).subjects?.name && (
                        <span className="text-sm text-muted-foreground">· {(exam as any).subjects.name}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                      {exam.exam_date && (
                        <span className="flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {format(new Date(exam.exam_date), "MMM d, yyyy")}
                        </span>
                      )}
                      {exam.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {exam.start_time.slice(0, 5)}{exam.end_time ? ` - ${exam.end_time.slice(0, 5)}` : ""}
                        </span>
                      )}
                      {exam.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {exam.venue}
                        </span>
                      )}
                    </div>
                    {exam.instructions && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{exam.instructions}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {exam.exam_date && <Countdown targetDate={exam.exam_date} />}
                    {statusBadge(exam.status || "scheduled") && (
                      <Badge variant={statusBadge(exam.status || "scheduled").variant} className="text-xs">
                        {statusBadge(exam.status || "scheduled").label}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Past Exams</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {past.map((exam) => (
              <div key={exam.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">{exam.exam_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {exam.exam_date && format(new Date(exam.exam_date), "MMM d, yyyy")}
                    {(exam as any).subjects?.name && ` · ${(exam as any).subjects.name}`}
                  </p>
                </div>
                <Badge variant="secondary">Completed</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {!isLoading && (!exams || exams.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CalendarClock className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No exams scheduled yet</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
