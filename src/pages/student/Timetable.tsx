import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getStudentSession } from "@/pages/StudentLogin";
import { Calendar, Clock, MapPin, User } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function StudentTimetable() {
  const session = getStudentSession()!;

  const { data: student } = useQuery({
    queryKey: ["student-class", session.studentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("class_id, school_classes!inner(name)")
        .eq("id", session.studentId)
        .single();
      return data as any;
    },
  });

  const { data: entries } = useQuery({
    queryKey: ["student-timetable", session.tenantId, student?.class_id],
    queryFn: async () => {
      if (!student?.class_id) return [];
      const { data } = await supabase
        .from("timetable_entries")
        .select("day_of_week, room, notes, period_id, timetable_periods!inner(name, start_time, end_time), subjects(name), employees!teacher_id(full_name)")
        .eq("class_id", student.class_id)
        .eq("tenant_id", session.tenantId)
        .eq("is_active", true)
        .order("period_id");
      return data || [];
    },
    enabled: !!student?.class_id,
  });

  const byDay = DAYS.map((_, i) => {
    const dayEntries = (entries || []).filter((e: any) => e.day_of_week === i + 1);
    return { day: DAYS[i], entries: dayEntries };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="h-6 w-6" /> Timetable
        </h1>
        <p className="text-muted-foreground">{student?.school_classes?.name || "Loading..."}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {byDay.map(({ day, entries: dayEntries }) => (
          <Card key={day}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dayEntries.length ? (
                dayEntries.map((e: any, i: number) => (
                  <div key={i} className="p-2 bg-muted/50 rounded-md text-sm space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{(e as any).subjects?.name || "Subject"}</span>
                      <Badge variant="outline" className="text-xs">
                        {(e as any).timetable_periods?.name}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{(e as any).timetable_periods?.start_time?.slice(0, 5)} - {(e as any).timetable_periods?.end_time?.slice(0, 5)}</span>
                    </div>
                    {(e as any).employees?.full_name && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{(e as any).employees?.full_name}</span>
                      </div>
                    )}
                    {e.room && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span>{e.room}</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-2">No classes</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
