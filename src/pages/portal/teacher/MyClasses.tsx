import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Users, Loader2, ArrowRight, Calendar } from "lucide-react";

const MyClasses = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

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
      setClasses(mapped);
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
        {classes.map((c: any) => (
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
        ))}
        {classes.length === 0 && (
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
