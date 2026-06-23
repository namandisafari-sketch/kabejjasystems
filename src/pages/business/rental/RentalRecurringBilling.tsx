import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Bell, DollarSign, AlertTriangle, Send, Loader2, Calendar } from "lucide-react";
import { format, startOfMonth, getDate, parseISO } from "date-fns";

export default function RentalRecurringBilling() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    lease_id: "",
    due_day: "1",
    amount: "",
    reminder_type: "auto" as "auto" | "manual",
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const { data: reminders = [], isLoading: remindersLoading } = useQuery({
    queryKey: ["payment-reminders", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_reminders")
        .select("*, rental_tenants(name, phone), leases(rent_amount, unit_id, rental_units(unit_number, rental_properties(name)))")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: activeLeases = [] } = useQuery({
    queryKey: ["leases-active", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leases")
        .select("*, rental_tenants(name, phone), rental_units(unit_number, rental_properties(name))")
        .eq("tenant_id", tenantId!)
        .eq("status", "active");
      if (error) throw error;
      return data;
    },
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["rental-payments-current-month", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const monthStart = startOfMonth(new Date());
      const { data, error } = await supabase
        .from("rental_payments")
        .select("*, leases!inner(rental_tenants!inner(name))")
        .eq("tenant_id", tenantId!)
        .gte("payment_date", monthStart.toISOString().split("T")[0]);
      if (error) throw error;
      return data;
    },
  });

  const activeCount = useMemo(
    () => reminders.filter((r: any) => r.is_active).length,
    [reminders]
  );

  const monthlyRecurring = useMemo(
    () =>
      reminders
        .filter((r: any) => r.is_active)
        .reduce((sum: number, r: any) => sum + Number(r.amount), 0),
    [reminders]
  );

  const overdueCount = useMemo(() => {
    const today = new Date();
    const currentDay = getDate(today);
    const paidTenantIds = new Set(
      payments.map((p: any) => p.lease_id)
    );
    return reminders.filter((r: any) => {
      if (!r.is_active) return false;
      if (r.due_day >= currentDay) return false;
      return !paidTenantIds.has(r.lease_id);
    }).length;
  }, [reminders, payments]);

  const leaseOptions = useMemo(
    () => activeLeases.filter((l: any) => !reminders.some((r: any) => r.lease_id === l.id)),
    [activeLeases, reminders]
  );

  const handleLeaseChange = (leaseId: string) => {
    const lease = activeLeases.find((l: any) => l.id === leaseId);
    setFormData({
      ...formData,
      lease_id: leaseId,
      amount: lease ? String(lease.rent_amount || lease.monthly_rent || 0) : "",
      due_day: lease ? String(lease.payment_due_day || 1) : "1",
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const lease = activeLeases.find((l: any) => l.id === data.lease_id);
      if (!lease) throw new Error("Lease not found");
      const { data: inserted, error } = await supabase
        .from("payment_reminders")
        .insert({
          tenant_id: tenantId,
          lease_id: data.lease_id,
          rental_tenant_id: lease.rental_tenant_id,
          due_day: parseInt(data.due_day),
          amount: parseFloat(data.amount),
          reminder_type: data.reminder_type,
          is_active: true,
          next_reminder_date: format(new Date(), "yyyy-MM-dd"),
        })
        .select("*, rental_tenants(name, phone), leases(rent_amount, unit_id, rental_units(unit_number, rental_properties(name)))")
        .single();
      if (error) throw error;
      return inserted;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-reminders"] });
      setCreateOpen(false);
      setFormData({ lease_id: "", due_day: "1", amount: "", reminder_type: "auto" });
      toast({ title: "Reminder created successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to create reminder", description: err.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      setTogglingId(id);
      const { error } = await supabase
        .from("payment_reminders")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-reminders"] });
      toast({ title: "Reminder status updated" });
    },
    onError: (err) => {
      toast({ title: "Failed to update reminder", description: err.message, variant: "destructive" });
    },
    onSettled: () => {
      setTogglingId(null);
    },
  });

  const sendNowMutation = useMutation({
    mutationFn: async (id: string) => {
      setSendingId(id);
      const now = new Date().toISOString();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      nextMonth.setDate(1);
      const { error } = await supabase
        .from("payment_reminders")
        .update({
          last_reminder_sent: now,
          next_reminder_date: format(nextMonth, "yyyy-MM-dd"),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-reminders"] });
      toast({ title: "Reminder sent successfully" });
    },
    onError: (err) => {
      toast({ title: "Failed to send reminder", description: err.message, variant: "destructive" });
    },
    onSettled: () => {
      setSendingId(null);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recurring Billing</h1>
          <p className="text-muted-foreground">Automated rent reminders & recurring billing</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              New Reminder
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Payment Reminder</DialogTitle>
              <DialogDescription>
                Set up automated recurring billing for a tenant
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Active Lease</Label>
                <Select
                  value={formData.lease_id}
                  onValueChange={handleLeaseChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lease" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaseOptions.length === 0 && (
                      <SelectItem value="__none__" disabled>
                        No available leases
                      </SelectItem>
                    )}
                    {leaseOptions.map((lease: any) => (
                      <SelectItem key={lease.id} value={lease.id}>
                        {lease.rental_tenants?.name || "Unknown"} — {lease.rental_units?.unit_number} ({lease.rental_units?.rental_properties?.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Day (1-31)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={formData.due_day}
                    onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount (UGX)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="100"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reminder Type</Label>
                <Select
                  value={formData.reminder_type}
                  onValueChange={(v: "auto" | "manual") => setFormData({ ...formData, reminder_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (automatic schedule)</SelectItem>
                    <SelectItem value="manual">Manual (send on demand)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate(formData)}
                disabled={!formData.lease_id || !formData.amount || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Reminder
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Reminders</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground">
              {reminders.length - activeCount} paused
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Monthly Recurring</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlyRecurring)}</div>
            <p className="text-xs text-muted-foreground">Total active recurring amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Overdue Payments</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overdueCount > 0 ? "text-destructive" : ""}`}>
              {overdueCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {overdueCount === 0 ? "No overdue payments" : "Payments past due this month"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Reminders</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {remindersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No payment reminders set up</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create your first reminder to automate billing
              </p>
            </div>
          ) : (
            <>
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tenant / Unit</TableHead>
                      <TableHead>Due Day</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Sent</TableHead>
                      <TableHead>Next Reminder</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reminders.map((reminder: any) => (
                      <TableRow key={reminder.id}>
                        <TableCell>
                          <div className="font-medium">{reminder.rental_tenants?.name || "—"}</div>
                          <div className="text-xs text-muted-foreground">
                            {reminder.leases?.rental_units?.unit_number} &middot; {reminder.leases?.rental_units?.rental_properties?.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Day {reminder.due_day}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(reminder.amount))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={reminder.is_active ? "default" : "secondary"}>
                            {reminder.is_active ? "Active" : "Paused"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {reminder.last_reminder_sent
                            ? format(parseISO(reminder.last_reminder_sent), "MMM d, HH:mm")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {reminder.next_reminder_date
                            ? format(parseISO(reminder.next_reminder_date), "MMM d, yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendNowMutation.mutate(reminder.id)}
                              disabled={sendingId === reminder.id}
                            >
                              {sendingId === reminder.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5" />
                              )}
                              <span className="hidden lg:inline ml-1">Send Now</span>
                            </Button>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={reminder.is_active}
                                onCheckedChange={(checked) =>
                                  toggleMutation.mutate({ id: reminder.id, is_active: checked })
                                }
                                disabled={togglingId === reminder.id}
                              />
                              <span className="text-xs text-muted-foreground hidden sm:inline">
                                {reminder.is_active ? "On" : "Off"}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="block sm:hidden divide-y">
                {reminders.map((reminder: any) => (
                  <div key={reminder.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">{reminder.rental_tenants?.name || "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {reminder.leases?.rental_units?.unit_number} &middot; {reminder.leases?.rental_units?.rental_properties?.name}
                        </div>
                      </div>
                      <Badge variant={reminder.is_active ? "default" : "secondary"}>
                        {reminder.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground text-xs">Due Day</span>
                        <div className="font-medium">Day {reminder.due_day}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Amount</span>
                        <div className="font-medium">{formatCurrency(Number(reminder.amount))}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Last Sent</span>
                        <div className="font-medium text-xs">
                          {reminder.last_reminder_sent
                            ? format(parseISO(reminder.last_reminder_sent), "MMM d, HH:mm")
                            : "—"}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs">Next</span>
                        <div className="font-medium text-xs">
                          {reminder.next_reminder_date
                            ? format(parseISO(reminder.next_reminder_date), "MMM d, yyyy")
                            : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={reminder.is_active}
                          onCheckedChange={(checked) =>
                            toggleMutation.mutate({ id: reminder.id, is_active: checked })
                          }
                          disabled={togglingId === reminder.id}
                        />
                        <span className="text-xs text-muted-foreground">
                          {reminder.is_active ? "On" : "Off"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => sendNowMutation.mutate(reminder.id)}
                        disabled={sendingId === reminder.id}
                      >
                        {sendingId === reminder.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5 mr-1" />
                        )}
                        Send
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
