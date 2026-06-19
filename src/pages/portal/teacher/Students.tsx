import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, User, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Students = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }

    const { data: p } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", session.user.id)
      .single();
    if (!p?.tenant_id) return;

    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("tenant_id", p.tenant_id)
      .order("full_name");

    setStudents(data || []);
    setLoading(false);
  };

  const filtered = search
    ? students.filter((s) =>
        s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.admission_number?.toLowerCase().includes(search.toLowerCase())
      )
    : students;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Students</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} students found</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or admission no..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((s) => (
          <Card key={s.id} className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(`/teacher/student-profiles`)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{s.full_name}</p>
                  <p className="text-xs text-muted-foreground">{s.admission_number || "No Adm No."}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {s.gender && <Badge variant="outline" className="text-xs">{s.gender}</Badge>}
                    {s.class_id && <Badge variant="outline" className="text-xs">{s.class_id}</Badge>}
                    {s.boarding_status && <Badge variant="outline" className="text-xs">{s.boarding_status}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {s.parent_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.parent_phone}</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-12 text-center text-muted-foreground">No students found.</CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Students;
