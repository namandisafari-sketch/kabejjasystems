import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Attendance = () => {
  const navigate = useNavigate();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

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
    setTenantId(p.tenant_id);

    const { data } = await supabase
      .from("student_attendance")
      .select("*")
      .eq("tenant_id", p.tenant_id)
      .order("date", { ascending: false })
      .limit(50);

    setRecords(data || []);
    setLoading(false);
  };

  const filtered = statusFilter === "all" ? records : records.filter((r) => r.status === statusFilter);

  const statusIcon = (s: string) => {
    switch (s) {
      case "Present": return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "Absent": return <XCircle className="h-4 w-4 text-red-600" />;
      case "Late": return <Clock className="h-4 w-4 text-amber-600" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "Present": return "bg-green-100 text-green-700 border-green-200";
      case "Absent": return "bg-red-100 text-red-700 border-red-200";
      case "Late": return "bg-amber-100 text-amber-700 border-amber-200";
      case "Excused": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "";
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance Records</h1>
          <p className="text-sm text-muted-foreground">Daily student attendance</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Records</SelectItem>
              <SelectItem value="Present">Present</SelectItem>
              <SelectItem value="Absent">Absent</SelectItem>
              <SelectItem value="Late">Late</SelectItem>
              <SelectItem value="Excused">Excused</SelectItem>
            </SelectContent>
          </Select>
          <Button>Take Attendance</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No attendance records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Student</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Class</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm">{r.student_id}</td>
                      <td className="px-4 py-3 text-sm">{r.class_id}</td>
                      <td className="px-4 py-3 text-sm">{r.date}</td>
                      <td className="px-4 py-3">
                        <Badge className={`border ${statusColor(r.status)}`}>
                          <span className="flex items-center gap-1">
                            {statusIcon(r.status)}
                            {r.status}
                          </span>
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{r.notes || "-"}</td>
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

export default Attendance;
