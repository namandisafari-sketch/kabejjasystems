import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, ArrowUpDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ColumnDef {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
  sortable?: boolean;
}

interface DatabaseListProps {
  title: string;
  description?: string;
  table: string;
  columns: ColumnDef[];
  filter?: Record<string, any>;
  orderBy?: { column: string; ascending?: boolean };
  searchable?: boolean;
  searchFields?: string[];
  detailPath?: string | ((row: any) => string);
  emptyMessage?: string;
  actions?: (row: any) => React.ReactNode;
}

export function DatabaseList({
  title, description, table, columns, filter = {},
  orderBy = { column: "created_at", ascending: false },
  searchable = true, searchFields,
  detailPath, emptyMessage = "No data found.", actions,
}: DatabaseListProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    loadTenantAndData();
  }, []);

  const loadTenantAndData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", session.user.id)
        .single();

      if (!profile?.tenant_id) return;
      setTenantId(profile.tenant_id);

      let query = supabase
        .from(table as any)
        .select("*")
        .eq("tenant_id", profile.tenant_id);

      Object.entries(filter).forEach(([k, v]) => {
        query = query.eq(k as any, v);
      });

      query = query.order(orderBy.column as any, { ascending: orderBy.ascending });

      const { data: result } = await query;
      setData(result || []);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = search && searchFields
    ? data.filter((row) =>
        searchFields.some((f) =>
          String(row[f] || "").toLowerCase().includes(search.toLowerCase())
        )
      )
    : data;

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        const va = a[sortKey] || "";
        const vb = b[sortKey] || "";
        const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
        return sortAsc ? cmp : -cmp;
      })
    : filtered;

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const getDetailUrl = (row: any) => {
    if (!detailPath) return null;
    return typeof detailPath === "function" ? detailPath(row) : detailPath;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {searchable && searchFields && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {sorted.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{emptyMessage}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className={`text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3 ${
                          col.sortable !== false ? "cursor-pointer hover:text-foreground" : ""
                        }`}
                        onClick={() => col.sortable !== false && toggleSort(col.key)}
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {col.sortable !== false && sortKey === col.key && (
                            <ArrowUpDown className="h-3 w-3" />
                          )}
                        </span>
                      </th>
                    ))}
                    {(detailPath || actions) && (
                      <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sorted.map((row, i) => (
                    <tr key={row.id || i} className="hover:bg-muted/30 transition-colors">
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-sm">
                          {col.render ? col.render(row[col.key], row) : row[col.key] ?? "-"}
                        </td>
                      ))}
                      {(detailPath || actions) && (
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            {actions?.(row)}
                            {detailPath && (
                              <Button variant="ghost" size="sm" className="h-7 text-xs"
                                onClick={() => navigate(getDetailUrl(row)!)}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" /> View
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
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
}
