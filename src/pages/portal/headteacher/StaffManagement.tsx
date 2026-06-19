import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, User, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const StaffManagement = () => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<any[]>([]);
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
      .from("employees")
      .select("*")
      .eq("tenant_id", p.tenant_id)
      .order("full_name");

    setStaff(data || []);
    setLoading(false);
  };

  const filtered = search
    ? staff.filter((s) =>
        s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.role?.toLowerCase().includes(search.toLowerCase()) ||
        s.department?.toLowerCase().includes(search.toLowerCase())
      )
    : staff;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} staff members</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 w-60" />
          </div>
          <Button><Plus className="h-4 w-4 mr-2" /> Add Staff</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No staff found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Role</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Department</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Email</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Phone</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Salary</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((s: any) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium">{s.full_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">{s.role}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.department || "-"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.email || "-"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.phone || "-"}</td>
                      <td className="px-4 py-3 text-sm">{s.salary ? `UGX ${s.salary.toLocaleString()}` : "-"}</td>
                      <td className="px-4 py-3">
                        <Badge className={s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}>
                          {s.is_active ? "Active" : "Inactive"}
                        </Badge>
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

export default StaffManagement;
