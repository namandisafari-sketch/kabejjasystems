import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Download, Mail, Building2, Search, CheckSquare, Square } from "lucide-react";

export default function AdminBulkActions() {
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["admin-tenants-bulk"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, email, phone, business_type, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredTenants = tenants?.filter(
    (t) =>
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleTenant = (id: string) => {
    setSelectedTenants((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedTenants.length === filteredTenants?.length) {
      setSelectedTenants([]);
    } else {
      setSelectedTenants(filteredTenants?.map((t) => t.id) || []);
    }
  };

  const exportToCSV = (exportAll = false) => {
    const dataToExport = exportAll
      ? tenants
      : tenants?.filter((t) => selectedTenants.includes(t.id));

    if (!dataToExport?.length) {
      toast.error("No data to export");
      return;
    }

    const headers = ["Name", "Email", "Phone", "Business Type", "Status", "Created At"];
    const rows = dataToExport.map((t) => [
      t.name || "",
      t.email || "",
      t.phone || "",
      t.business_type || "",
      t.status || "",
      t.created_at ? format(new Date(t.created_at), "yyyy-MM-dd") : "",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `tenants_export_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    link.click();

    toast.success(`Exported ${dataToExport.length} tenants`);
  };

  const copyEmails = () => {
    const selectedEmails = tenants
      ?.filter((t) => selectedTenants.includes(t.id) && t.email)
      .map((t) => t.email)
      .join(", ");

    if (!selectedEmails) {
      toast.error("No emails to copy");
      return;
    }

    navigator.clipboard.writeText(selectedEmails);
    toast.success("Emails copied to clipboard");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: "default",
      pending: "secondary",
      suspended: "destructive",
      rejected: "outline",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Bulk Actions</h1>
        <p className="text-muted-foreground">Export data and manage tenants in bulk</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Selected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{selectedTenants.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">With Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants?.filter((t) => t.email).length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Export data or copy email addresses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => exportToCSV(true)} variant="outline">
              <Download className="h-4 w-4 mr-2" /> Export All to CSV
            </Button>
            <Button
              onClick={() => exportToCSV(false)}
              variant="outline"
              disabled={selectedTenants.length === 0}
            >
              <Download className="h-4 w-4 mr-2" /> Export Selected ({selectedTenants.length})
            </Button>
            <Button
              onClick={copyEmails}
              variant="outline"
              disabled={selectedTenants.length === 0}
            >
              <Mail className="h-4 w-4 mr-2" /> Copy Selected Emails
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Select Tenants
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button variant="outline" size="sm" onClick={toggleAll}>
                {selectedTenants.length === filteredTenants?.length ? (
                  <>
                    <Square className="h-4 w-4 mr-2" /> Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4 mr-2" /> Select All
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : filteredTenants?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No tenants found</p>
          ) : (
            <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
              {filteredTenants?.map((tenant) => (
                <div
                  key={tenant.id}
                  className={`flex items-center gap-4 p-3 hover:bg-muted/50 cursor-pointer ${
                    selectedTenants.includes(tenant.id) ? "bg-muted/30" : ""
                  }`}
                  onClick={() => toggleTenant(tenant.id)}
                >
                  <Checkbox
                    checked={selectedTenants.includes(tenant.id)}
                    onCheckedChange={() => toggleTenant(tenant.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{tenant.name}</span>
                      {getStatusBadge(tenant.status || "pending")}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {tenant.email || "No email"} • {tenant.business_type}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(tenant.created_at), "PP")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
