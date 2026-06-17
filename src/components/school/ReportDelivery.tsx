import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Send, Plus, Edit, History } from "lucide-react";
import type { ReportDeliveryConfig, ReportDeliveryLog } from "@/types/school-admin";

interface Props { tenantId: string | null; }

export function ReportDelivery({ tenantId }: Props) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReportDeliveryConfig | null>(null);
  const [showLog, setShowLog] = useState(false);

  const { data: configs } = useQuery({
    queryKey: ["delivery-configs", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase.from("report_delivery_config").select("*").eq("tenant_id", tenantId!).order("name");
      return data as ReportDeliveryConfig[];
    },
  });

  const { data: logs } = useQuery({
    queryKey: ["delivery-logs", tenantId],
    enabled: !!tenantId && showLog,
    queryFn: async () => {
      const { data } = await supabase.from("report_delivery_log").select("*").eq("tenant_id", tenantId!).order("created_at", { ascending: false }).limit(50);
      return data as ReportDeliveryLog[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      if (editing) return supabase.from("report_delivery_config").update(values).eq("id", editing.id);
      return supabase.from("report_delivery_config").insert({ ...values, tenant_id: tenantId });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["delivery-configs"] }); setDialogOpen(false); setEditing(null); toast.success("Delivery config saved"); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Send className="h-5 w-5" />Report Delivery</h2>
          <p className="text-sm text-muted-foreground">Automated email/SMS delivery of report cards to parents with conditions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowLog(!showLog)}><History className="h-4 w-4 mr-2" />{showLog ? "Hide" : "Show"} Logs</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}><Plus className="h-4 w-4 mr-2" />New Config</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing ? "Edit" : "New"} Delivery Configuration</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); saveMutation.mutate({ name: fd.get("name"), delivery_method: fd.get("delivery_method"), format: fd.get("format"), schedule: fd.get("schedule"), send_to_parents: fd.get("send_to_parents") === "on", send_to_guardians: fd.get("send_to_guardians") === "on", allow_preflight: fd.get("allow_preflight") === "on", conditions: [], cc_staff_emails: (fd.get("cc_emails") as string || "").split(",").map((s: string) => s.trim()).filter(Boolean) }); }} className="space-y-4">
                <div className="space-y-2"><Label>Configuration Name</Label><Input name="name" defaultValue={editing?.name} placeholder="e.g. Termly Report to Parents" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Delivery Method</Label><Select name="delivery_method" defaultValue={editing?.delivery_method || "email"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="sms">SMS</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Format</Label><Select name="format" defaultValue={editing?.format || "pdf"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pdf">PDF</SelectItem><SelectItem value="csv">CSV</SelectItem><SelectItem value="both">Both</SelectItem></SelectContent></Select></div>
                </div>
                <div className="space-y-2"><Label>Schedule</Label><Select name="schedule" defaultValue={editing?.schedule || "manual"}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Manual (trigger only)</SelectItem><SelectItem value="on_publish">Auto on publish</SelectItem><SelectItem value="scheduled">Scheduled (cron)</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>CC Staff Emails (comma separated)</Label><Input name="cc_emails" defaultValue={(editing?.cc_staff_emails || []).join(", ")} placeholder="admin@school.ug, dos@school.ug" /></div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><Label>Send to Parents</Label><Switch name="send_to_parents" defaultChecked={editing?.send_to_parents ?? true} /></div>
                  <div className="flex items-center justify-between"><Label>Send to Guardians</Label><Switch name="send_to_guardians" defaultChecked={editing?.send_to_guardians ?? false} /></div>
                  <div className="flex items-center justify-between"><Label>Show pre-flight review</Label><Switch name="allow_preflight" defaultChecked={editing?.allow_preflight ?? true} /></div>
                </div>
                <Button type="submit" disabled={saveMutation.isPending} className="w-full">{saveMutation.isPending ? "Saving..." : "Save Configuration"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {configs?.map((cfg) => (
          <Card key={cfg.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">{cfg.name}<Badge variant={cfg.is_active ? "default" : "secondary"}>{cfg.is_active ? "Active" : "Inactive"}</Badge></CardTitle>
                  <CardDescription>{cfg.delivery_method} &middot; {cfg.format} &middot; {cfg.schedule}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditing(cfg); setDialogOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>Send to: {cfg.send_to_parents ? "Parents" : ""}{cfg.send_to_guardians ? " + Guardians" : ""}</p>
              {cfg.cc_staff_emails?.length > 0 && <p>CC: {cfg.cc_staff_emails.join(", ")}</p>}
              <p>Pre-flight: {cfg.allow_preflight ? "Yes" : "No"}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {(!configs || configs.length === 0) && (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No delivery configurations yet.</CardContent></Card>
      )}

      {showLog && (
        <Card>
          <CardHeader><CardTitle className="text-base">Delivery Log</CardTitle></CardHeader>
          <CardContent>
            {logs && logs.length > 0 ? (
              <div className="space-y-1 text-sm">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-1 border-b last:border-0">
                    <span>{log.student_name || "—"} <span className="text-muted-foreground">({log.recipient_email || log.recipient_phone})</span></span>
                    <Badge variant={log.status === "sent" ? "default" : log.status === "failed" ? "destructive" : "secondary"}>{log.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No delivery logs yet.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
