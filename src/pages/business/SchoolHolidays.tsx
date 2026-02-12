import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface Holiday {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  holiday_type: string;
}

export default function SchoolHolidays() {
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
  const [form, setForm] = useState({
    name: "",
    start_date: "",
    end_date: "",
    holiday_type: "general",
  });

  // Fetch holidays
  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ["school-holidays", tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_holidays")
        .select("*")
        .eq("tenant_id", tenantData!.tenantId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Save holiday
  const saveMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload = {
        tenant_id: tenantData!.tenantId,
        name: data.name,
        start_date: data.start_date,
        end_date: data.end_date,
        holiday_type: data.holiday_type,
      };

      if (selectedHoliday) {
        const { error } = await supabase
          .from("school_holidays")
          .update(payload)
          .eq("id", selectedHoliday.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("school_holidays")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-holidays"] });
      setDialogOpen(false);
      setSelectedHoliday(null);
      resetForm();
      toast({ title: "Holiday saved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete holiday
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("school_holidays")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school-holidays"] });
      toast({ title: "Holiday deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setForm({
      name: "",
      start_date: "",
      end_date: "",
      holiday_type: "general",
    });
  };

  const openEdit = (holiday: Holiday) => {
    setSelectedHoliday(holiday);
    setForm({
      name: holiday.name,
      start_date: holiday.start_date,
      end_date: holiday.end_date,
      holiday_type: holiday.holiday_type,
    });
    setDialogOpen(true);
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "term_break": return "default";
      case "public_holiday": return "secondary";
      case "special": return "outline";
      default: return "secondary";
    }
  };

  // Calculate total holiday days this year
  const currentYear = new Date().getFullYear();
  const totalHolidayDays = holidays
    .filter(h => new Date(h.start_date).getFullYear() === currentYear)
    .reduce((acc, h) => acc + differenceInDays(new Date(h.end_date), new Date(h.start_date)) + 1, 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">School Holidays</h1>
          <p className="text-muted-foreground">
            Manage holidays to exclude from absence calculations
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setSelectedHoliday(null);
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Holiday
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Holidays</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{holidays.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Days This Year</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalHolidayDays}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Term Breaks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {holidays.filter(h => h.holiday_type === "term_break").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Holiday Calendar</CardTitle>
          <CardDescription>
            These dates will be excluded when calculating student absence
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : holidays.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No holidays configured yet. Add holidays to exclude them from absence tracking.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((holiday) => {
                  const duration = differenceInDays(
                    new Date(holiday.end_date),
                    new Date(holiday.start_date)
                  ) + 1;
                  
                  return (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-medium">{holiday.name}</TableCell>
                      <TableCell>{format(new Date(holiday.start_date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{format(new Date(holiday.end_date), "MMM d, yyyy")}</TableCell>
                      <TableCell>{duration} day{duration > 1 ? "s" : ""}</TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(holiday.holiday_type)}>
                          {holiday.holiday_type.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(holiday)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(holiday.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedHoliday ? "Edit Holiday" : "Add Holiday"}</DialogTitle>
            <DialogDescription>
              Add a holiday period to exclude from absence calculations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Holiday Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Term 1 Break, Independence Day"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm(p => ({ ...p, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm(p => ({ ...p, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Holiday Type</Label>
              <Select
                value={form.holiday_type}
                onValueChange={(v) => setForm(p => ({ ...p, holiday_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="term_break">Term Break</SelectItem>
                  <SelectItem value="public_holiday">Public Holiday</SelectItem>
                  <SelectItem value="special">Special</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.name || !form.start_date || !form.end_date}
            >
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}