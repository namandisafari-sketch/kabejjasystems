import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStudentSession } from "@/pages/StudentLogin";
import { BookOpen, FileText, ExternalLink, Search, Download } from "lucide-react";

export default function StudentResources() {
  const session = getStudentSession()!;
  const [search, setSearch] = useState("");

  const { data: resources } = useQuery({
    queryKey: ["student-resources", session.tenantId],
    queryFn: async () => {
      const { data: student } = await supabase
        .from("students")
        .select("class_id")
        .eq("id", session.studentId)
        .single();

      let q = supabase
        .from("student_resources")
        .select("id, title, description, file_url, resource_type, created_at, subjects(name)")
        .eq("tenant_id", session.tenantId)
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (student?.class_id) {
        q = q.or(`class_id.eq.${student.class_id},class_id.is.null`);
      }

      const { data } = await q;
      return data || [];
    },
  });

  const filtered = (resources || []).filter((r: any) =>
    search === "" ||
    r.title?.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase()) ||
    (r as any).subjects?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" /> Learning Resources
        </h1>
        <p className="text-muted-foreground">Access study materials and resources</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search resources..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((r: any) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="p-2 bg-primary/10 rounded">
                  {r.resource_type === "link" ? (
                    <ExternalLink className="h-5 w-5 text-primary" />
                  ) : (
                    <FileText className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{r.title}</h3>
                  {r.subjects?.name && (
                    <Badge variant="outline" className="text-xs mt-1">{r.subjects.name}</Badge>
                  )}
                </div>
              </div>
              {r.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
              )}
              {r.file_url && (
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                    {r.resource_type === "link" ? (
                      <><ExternalLink className="h-4 w-4 mr-1" /> Open Link</>
                    ) : (
                      <><Download className="h-4 w-4 mr-1" /> Download</>
                    )}
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {(!resources || resources.length === 0) && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No resources available yet</CardContent>
        </Card>
      )}
    </div>
  );
}
