import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, CheckCircle, XCircle, Plus, Eye } from "lucide-react";

const AdmissionsManagement = () => {
  const navigate = useNavigate();
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tenantId, setTenantId] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data: p } = await supabase.from("profiles").select("tenant_id").eq("id", session.user.id).single();
    if (!p?.tenant_id) return;
    setTenantId(p.tenant_id);

    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("tenant_id", p.tenant_id)
      .order("created_at", { ascending: false });
    setAdmissions(data?.filter(s => s.admission_status !== "enrolled") || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("students").update({ admission_status: status }).eq("id", id);
    loadData();
  };

  const filtered = admissions.filter(s =>
    search === "" || s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.admission_number?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold tracking-tight">Admissions Management</h1><p className="text-sm text-muted-foreground">Review and manage student admission applications</p></div>
        <Button><Plus className="h-4 w-4 mr-2" /> New Admission</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search applicants..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No admission applications found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Adm No.</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Applicant Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Class</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Applied</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map(s => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm font-mono">{s.admission_number}</td>
                      <td className="px-4 py-3 text-sm font-medium">{s.full_name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.class_id}</td>
                      <td className="px-4 py-3">
                        <Badge className={
                          s.admission_status === "confirmed" ? "bg-green-100 text-green-700" :
                          s.admission_status === "pending" ? "bg-amber-100 text-amber-700" :
                          "bg-gray-100 text-gray-700"
                        }>{s.admission_status || "Pending"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.created_at ? new Date(s.created_at).toLocaleDateString() : "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {s.admission_status !== "confirmed" && (
                            <Button variant="ghost" size="sm" className="text-green-600" onClick={() => updateStatus(s.id, "confirmed")}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {s.admission_status !== "rejected" && s.admission_status !== "confirmed" && (
                            <Button variant="ghost" size="sm" className="text-red-600" onClick={() => updateStatus(s.id, "rejected")}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdmissionsManagement;