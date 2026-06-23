import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Wrench, AlertTriangle, CheckCircle, Edit, Play, Calendar } from "lucide-react";
import { format, isPast, startOfMonth, endOfMonth, addDays } from "date-fns";

const FREQUENCY_INTERVALS: Record<string, number> = {
  monthly: 30,
  quarterly: 90,
  "bi-annual": 180,
  annual: 365,
  "one-time": 0,
};

const CATEGORIES = [
  "plumbing", "electrical", "hvac", "appliance", "structural",
  "pest_control", "cleaning", "landscaping", "general",
];

const FREQUENCIES = ["monthly", "quarterly", "bi-annual", "annual", "one-time"];

export default function RentalPreventativeMaintenance() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [formData, setFormData] = useState({
    unit_id: "",
    title: "",
    description: "",
    category: "general",
    frequency: "monthly",
    interval_days: 30,
    next_due_date: "",
    assigned_to: "",
    estimated_cost: "",
    notes: "",
  });

  const { data: units = [] } = useQuery({
    queryKey: ["rental-units-all", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rental_units")
        .select("*, rental_properties(name)")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["maintenance-schedules", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_schedules")
        .select("*, rental_units(unit_number, rental_properties(name))")
        .eq("tenant_id", tenantId!)
        .order("next_due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("maintenance_schedules").insert({
        tenant_id: tenantId,
        unit_id: data.unit_id,
        title: data.title,
        description: data.description,
        category: data.category,
        frequency: data.frequency,
        interval_days: data.interval_days,
        next_due_date: data.next_due_date || null,
        assigned_to: data.assigned_to || null,
        estimated_cost: data.estimated_cost ? parseFloat(data.estimated_cost) : null,
        notes: data.notes || null,
        status: "active",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-schedules"] });
      setOpen(false);
      resetForm();
      toast({ title: "Maintenance schedule created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from("maintenance_schedules")
        .update({
          ...updateData,
          estimated_cost: updateData.estimated_cost ? parseFloat(updateData.estimated_cost) : null,
          next_due_date: updateData.next_due_date || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-schedules"] });
      setOpen(false);
      setEditingSchedule(null);
      resetForm();
      toast({ title: "Schedule updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (schedule: any) => {
      const today = new Date().toISOString().split("T")[0];
      let nextDueDate: string | null = null;
      if (schedule.interval_days && schedule.interval_days > 0) {
        const next = addDays(new Date(today), schedule.interval_days);
        nextDueDate = format(next, "yyyy-MM-dd");
      }
      const { error } = await supabase
        .from("maintenance_schedules")
        .update({
          status: "completed",
          last_performed_date: today,
          next_due_date: nextDueDate,
        })
        .eq("id", schedule.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-schedules"] });
      toast({ title: "Schedule marked as completed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      unit_id: "",
      title: "",
      description: "",
      category: "general",
      frequency: "monthly",
      interval_days: 30,
      next_due_date: "",
      assigned_to: "",
      estimated_cost: "",
      notes: "",
    });
  };

  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    setFormData({
      unit_id: schedule.unit_id,
      title: schedule.title,
      description: schedule.description || "",
      category: schedule.category,
      frequency: schedule.frequency,
      interval_days: schedule.interval_days || FREQUENCY_INTERVALS[schedule.frequency] || 0,
      next_due_date: schedule.next_due_date ? schedule.next_due_date.split("T")[0] : "",
      assigned_to: schedule.assigned_to || "",
      estimated_cost: schedule.estimated_cost?.toString() || "",
      notes: schedule.notes || "",
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSchedule) {
      updateMutation.mutate({ ...formData, id: editingSchedule.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getFrequencyBadge = (frequency: string) => {
    switch (frequency) {
      case "monthly":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Monthly</Badge>;
      case "quarterly":
        return <Badge className="bg-purple-500 hover:bg-purple-600">Quarterly</Badge>;
      case "bi-annual":
        return <Badge className="bg-orange-500 hover:bg-orange-600">Bi-Annual</Badge>;
      case "annual":
        return <Badge className="bg-green-600 hover:bg-green-700">Annual</Badge>;
      case "one-time":
        return <Badge variant="secondary">One-Time</Badge>;
      default:
        return <Badge variant="outline">{frequency}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>;
      case "completed":
        return <Badge className="bg-blue-500 hover:bg-blue-600">Completed</Badge>;
      case "paused":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Paused</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isOverdue = (schedule: any) => {
    if (schedule.status !== "active") return false;
    if (!schedule.next_due_date) return false;
    return isPast(new Date(schedule.next_due_date));
  };

  const activeSchedules = schedules.filter((s: any) => s.status === "active");
  const overdueSchedules = schedules.filter((s: any) => isOverdue(s));
  const now = new Date();
  const completedThisMonth = schedules.filter((s: any) => {
    if (s.status !== "completed" || !s.last_performed_date) return false;
    const d = new Date(s.last_performed_date);
    return d >= startOfMonth(now) && d <= endOfMonth(now);
  });

  const handleFrequencyChange = (frequency: string) => {
    setFormData({ ...formData, frequency, interval_days: FREQUENCY_INTERVALS[frequency] || 0 });
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Preventative Maintenance</h1>
          <p className="text-muted-foreground">Schedule and track recurring maintenance tasks</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingSchedule(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSchedule ? "Update Schedule" : "New Maintenance Schedule"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Unit</Label>
                  <Select value={formData.unit_id} onValueChange={v => setFormData({ ...formData, unit_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.rental_properties?.name} - {u.unit_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. HVAC filter replacement"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c} className="capitalize">
                          {c.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Frequency</Label>
                  <Select value={formData.frequency} onValueChange={handleFrequencyChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map(f => (
                        <SelectItem key={f} value={f} className="capitalize">
                          {f === "bi-annual" ? "Bi-Annual" : f.charAt(0).toUpperCase() + f.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.frequency !== "one-time" && (
                  <div>
                    <Label>Next Due Date</Label>
                    <Input
                      type="date"
                      value={formData.next_due_date}
                      onChange={e => setFormData({ ...formData, next_due_date: e.target.value })}
                    />
                  </div>
                )}
                <div>
                  <Label>Interval Days</Label>
                  <Input
                    type="number"
                    value={formData.interval_days}
                    onChange={e => setFormData({ ...formData, interval_days: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Auto-calculated from frequency</p>
                </div>
                <div>
                  <Label>Assigned To</Label>
                  <Input
                    value={formData.assigned_to}
                    onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                    placeholder="Vendor or staff name"
                  />
                </div>
                <div>
                  <Label>Estimated Cost (UGX)</Label>
                  <Input
                    type="number"
                    value={formData.estimated_cost}
                    onChange={e => setFormData({ ...formData, estimated_cost: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {editingSchedule ? "Update" : "Create"} Schedule
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Schedules</CardTitle>
            <Wrench className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSchedules.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueSchedules.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedThisMonth.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next Due</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule: any) => (
                <TableRow key={schedule.id}>
                  <TableCell>
                    <p className="font-medium">{schedule.title}</p>
                    {schedule.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{schedule.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{(schedule.rental_units as any)?.unit_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {(schedule.rental_units as any)?.rental_properties?.name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize">{schedule.category.replace("_", " ")}</TableCell>
                  <TableCell>{getFrequencyBadge(schedule.frequency)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        {schedule.next_due_date
                          ? format(new Date(schedule.next_due_date), "MMM d, yyyy")
                          : "—"}
                      </span>
                      {isOverdue(schedule) && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0">OVERDUE</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{schedule.assigned_to || "—"}</TableCell>
                  <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(schedule)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {schedule.status === "active" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => completeMutation.mutate(schedule)}
                          disabled={completeMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {schedules.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No maintenance schedules yet. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
