import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Users, Loader2, ArrowRight, Calendar } from "lucide-react";

const MyClasses = () => {
  const navigate = useNavigate();
  const [classList, setClassList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [subjectMap, setSubjectMap] = useState<Record<string, any[]>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }

    const { data: p } = await supabase
      .from("profiles")
      .select("id, tenant_id")
      .eq("id", session.user.id)
      .single();
    if (!p) return;
    setProfile(p);

    const { data: assignments } = await supabase
      .from("teacher_class_assignments")
      .select("*, school_classes!inner(*)")
      .eq("teacher_id", p.id)
      .eq("tenant_id", p.tenant_id);

    if (assignments) {
      const mapped = assignments.map((a: any) => a.school_classes);
      setClassList(mapped);

      const { data: subAssignments } = await supabase
        .from("teacher_subject_assignments")
        .select("subject_id, class_id")
        .eq("teacher_id", p.id)
        .eq("tenant_id", p.tenant_id);

      if (subAssignments) {
        const subIds = [...new Set(subAssignments.map(s => s.subject_id))];
        if (subIds.length > 0) {
          const { data: subs } = await supabase
            .from("subjects")
            .select("id, name, code")
            .in("id", subIds);
          const subLookup = (subs || []).reduce((acc: any, s: any) => ({ ...acc, [s.id]: s }), {});

          const map: Record<string, any[]> = {};
          subAssignments.forEach(sa => {
            if (!sa.class_id) return;
            if (!map[sa.class_id]) map[sa.class_id] = [];
            const sub = subLookup[sa.subject_id];
            if (sub && !map[sa.class_id].find(x => x.id === sub.id)) {
              map[sa.class_id].push(sub);
            }
          });
          setSubjectMap(map);
        }
      }
    }
    setLoading(false);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Classes</h1>
        <p className="text-sm text-muted-foreground">Classes assigned to you this term</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {classList.map((c: any) => {
          const classSubjects = subjectMap[c.id] || [];
          return (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{c.name}</CardTitle>
                  <Badge>{c.level || "N/A"}</Badge>
                </div>
                {c.section && <p className="text-sm text-muted-foreground">Stream: {c.section}</p>}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />- students</span>
                  {c.capacity && <span className="flex items-center gap-1">Cap: {c.capacity}</span>}
                </div>
                {classSubjects.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {classSubjects.map((s: any) => (
                      <Badge key={s.id} variant="secondary" className="text-xs">{s.name}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate("/teacher/attendance")}>
                    <Calendar className="h-3 w-3 mr-1" /> Attendance
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate("/teacher/marks")}>
                    <BookOpen className="h-3 w-3 mr-1" /> Marks
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {classList.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-muted-foreground">
              No class assignments found. Contact your administrator.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MyClasses;
