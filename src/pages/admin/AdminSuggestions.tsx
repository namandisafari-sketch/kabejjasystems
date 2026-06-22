import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lightbulb, Search, MessageSquare, CheckCircle2, Clock, XCircle, BarChart3 } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/i18n";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pending", variant: "outline" },
  reviewed: { label: "Reviewed", variant: "secondary" },
  implemented: { label: "Implemented", variant: "default" },
  dismissed: { label: "Dismissed", variant: "destructive" },
};

export default function AdminSuggestions() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ["admin-suggestions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suggestions")
        .select(`
          *,
          tenants:tenant_id (name, business_code)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data;
    },
  });

  const filtered = suggestions?.filter((s) => {
    const matchSearch =
      searchTerm === "" ||
      s.submitter_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.tenants as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: suggestions?.length || 0,
    pending: suggestions?.filter((s) => s.status === "pending").length || 0,
    reviewed: suggestions?.filter((s) => s.status === "reviewed").length || 0,
    implemented: suggestions?.filter((s) => s.status === "implemented").length || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Lightbulb className="h-6 w-6" />
          {t.navigation.adminSidebarItems.suggestions}
        </h1>
        <p className="text-muted-foreground">View all suggestions submitted across all schools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-2xl font-bold">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Reviewed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{stats.reviewed}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Implemented</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{stats.implemented}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search suggestions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="implemented">Implemented</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Submitter</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="max-w-md">Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No suggestions found</TableCell>
                </TableRow>
              ) : (
                filtered?.map((s) => {
                  const cfg = statusConfig[s.status] || statusConfig.pending;
                  const tenant = s.tenants as any;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{tenant?.name || "Unknown"}</TableCell>
                      <TableCell>
                        <div>{s.submitter_name}</div>
                        {s.submitter_email && (
                          <div className="text-xs text-muted-foreground">{s.submitter_email}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{s.category}</Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="truncate text-sm">{s.message}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(s.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
