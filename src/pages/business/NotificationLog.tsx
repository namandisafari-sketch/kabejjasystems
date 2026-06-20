import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Bell, MessageSquare, Mail, Smartphone, CheckCircle2, XCircle, Clock, Search, Loader2 } from "lucide-react";

interface NotificationLogEntry {
  id: string;
  tenant_id: string;
  channel: string;
  recipient: string;
  subject: string | null;
  message: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  parents: { full_name: string } | null;
}

const PAGE_SIZE = 20;

const channelConfig: Record<string, { icon: React.ReactNode; className: string }> = {
  whatsapp: { icon: <Smartphone className="h-3 w-3" />, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  sms: { icon: <MessageSquare className="h-3 w-3" />, className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" },
  email: { icon: <Mail className="h-3 w-3" />, className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100" },
};

const statusConfig: Record<string, { icon: React.ReactNode; className: string }> = {
  sent: { icon: <CheckCircle2 className="h-3 w-3" />, className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" },
  pending: { icon: <Clock className="h-3 w-3" />, className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100" },
  failed: { icon: <XCircle className="h-3 w-3" />, className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" },
};

export default function NotificationLog() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["notification-log", tenantId, channelFilter, statusFilter, searchTerm, page],
    queryFn: async () => {
      if (!tenantId) return { entries: [], count: 0 };

      let query = supabase
        .from("outgoing_notifications")
        .select("*, parents:parent_id(full_name)", { count: "exact" })
        .eq("tenant_id", tenantId);

      if (channelFilter !== "all") {
        query = query.eq("channel", channelFilter);
      }
      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (searchTerm) {
        query = query.ilike("recipient", `%${searchTerm}%`);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data: entries, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { entries: (entries || []) as NotificationLogEntry[], count: count || 0 };
    },
    enabled: !!tenantId,
  });

  const entries = data?.entries || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Notification Log</h1>
          <p className="text-muted-foreground">View outgoing notification history</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Outgoing Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by recipient..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(0);
                }}
                className="pl-9"
              />
            </div>
            <Select
              value={channelFilter}
              onValueChange={(v) => {
                setChannelFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Timestamp</th>
                      <th className="text-left py-3 px-2 font-medium">Channel</th>
                      <th className="text-left py-3 px-2 font-medium">Recipient</th>
                      <th className="text-left py-3 px-2 font-medium">Subject</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                      <th className="text-left py-3 px-2 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => {
                      const channelStyle = channelConfig[entry.channel] || channelConfig.sms;
                      const statusStyle = statusConfig[entry.status] || statusConfig.pending;
                      return (
                        <tr key={entry.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2 whitespace-nowrap text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-2">
                            <Badge className={channelStyle.className} variant="outline">
                              <span className="flex items-center gap-1">
                                {channelStyle.icon}
                                {entry.channel}
                              </span>
                            </Badge>
                          </td>
                          <td className="py-3 px-2">
                            <div>
                              <span className="font-medium">{entry.recipient}</span>
                              {entry.parents && (
                                <span className="text-muted-foreground ml-1">
                                  ({entry.parents.full_name})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 max-w-[200px] truncate">
                            {entry.subject || "—"}
                          </td>
                          <td className="py-3 px-2">
                            <Badge className={statusStyle.className} variant="outline">
                              <span className="flex items-center gap-1 capitalize">
                                {statusStyle.icon}
                                {entry.status}
                              </span>
                            </Badge>
                          </td>
                          <td className="py-3 px-2 max-w-[200px] truncate text-muted-foreground">
                            {entry.error_message || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
