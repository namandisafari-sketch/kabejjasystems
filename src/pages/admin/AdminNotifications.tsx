import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Bell, Search, MessageSquare, Phone, Mail, CheckCircle2, XCircle, Clock, Building2 } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/i18n";

export default function AdminNotifications() {
  const { t } = useLanguage();
  const [configSearch, setConfigSearch] = useState("");
  const [logSearch, setLogSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: configs } = useQuery({
    queryKey: ["admin-notification-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_config")
        .select(`
          *,
          tenants:tenant_id (name, business_code)
        `)
        .order("updated_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      return data;
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["admin-notification-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outgoing_notifications")
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

  const filteredConfigs = configs?.filter((c) => {
    const tenant = c.tenants as any;
    const match =
      configSearch === "" ||
      tenant?.name?.toLowerCase().includes(configSearch.toLowerCase()) ||
      tenant?.business_code?.toLowerCase().includes(configSearch.toLowerCase()) ||
      c.provider?.toLowerCase().includes(configSearch.toLowerCase());
    return match;
  });

  const filteredLogs = logs?.filter((l) => {
    const tenant = l.tenants as any;
    const matchSearch =
      logSearch === "" ||
      l.recipient?.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.channel?.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.subject?.toLowerCase().includes(logSearch.toLowerCase()) ||
      tenant?.name?.toLowerCase().includes(logSearch.toLowerCase());
    const matchChannel = channelFilter === "all" || l.channel === channelFilter;
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchChannel && matchStatus;
  });

  const failedLogs = logs?.filter((l) => l.status === "failed").length || 0;
  const sentLogs = logs?.filter((l) => l.status === "sent").length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="h-6 w-6" />
          {t.navigation.adminSidebarItems.notifications}
        </h1>
        <p className="text-muted-foreground">Monitor notification configurations and outgoing logs across all schools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Schools Configured</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{configs?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{sentLogs}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold">{failedLogs}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{logs?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="configs">
        <TabsList>
          <TabsTrigger value="configs">Provider Configurations</TabsTrigger>
          <TabsTrigger value="logs">Outgoing Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="configs" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search schools or providers..."
              value={configSearch}
              onChange={(e) => setConfigSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>SMS</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Sender ID</TableHead>
                    <TableHead>WhatsApp Number</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConfigs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No configurations found</TableCell>
                    </TableRow>
                  ) : (
                    filteredConfigs?.map((c) => {
                      const tenant = c.tenants as any;
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{tenant?.name || "Unknown"}</TableCell>
                          <TableCell className="capitalize">{c.provider}</TableCell>
                          <TableCell>
                            {c.sms_enabled ? (
                              <Badge variant="default" className="bg-green-500">Enabled</Badge>
                            ) : (
                              <Badge variant="outline">Disabled</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {c.whatsapp_enabled ? (
                              <Badge variant="default" className="bg-green-500">Enabled</Badge>
                            ) : (
                              <Badge variant="outline">Disabled</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {c.email_enabled ? (
                              <Badge variant="default" className="bg-green-500">Enabled</Badge>
                            ) : (
                              <Badge variant="outline">Disabled</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-mono">{c.sender_id || "-"}</TableCell>
                          <TableCell className="text-sm font-mono">{c.whatsapp_number || "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(c.updated_at), "MMM d, yyyy")}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4 mt-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>School</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No logs found</TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs?.map((l) => {
                      const tenant = l.tenants as any;
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">{tenant?.name || "Unknown"}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              {l.channel === "sms" && <Phone className="h-3.5 w-3.5" />}
                              {l.channel === "whatsapp" && <MessageSquare className="h-3.5 w-3.5" />}
                              {l.channel === "email" && <Mail className="h-3.5 w-3.5" />}
                              <span className="capitalize">{l.channel}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-mono">{l.recipient}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{l.subject || "-"}</TableCell>
                          <TableCell>
                            {l.status === "sent" ? (
                              <Badge variant="default" className="bg-green-500">Sent</Badge>
                            ) : l.status === "failed" ? (
                              <Badge variant="destructive" title={l.error_message || ""}>Failed</Badge>
                            ) : (
                              <Badge variant="outline">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {l.sent_at ? format(new Date(l.sent_at), "MMM d, h:mm a") : "-"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
