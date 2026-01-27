import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { 
  CalendarDays, Plus, Clock, Settings, Trash2, Edit, BookOpen, 
  User, Coffee, AlertCircle, Download, Printer
} from "lucide-react";
import { format } from "date-fns";

const DAYS_OF_WEEK = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
];

const PERIOD_TYPES = [
  { value: "lesson", label: "Lesson", color: "bg-blue-100 text-blue-800" },
  { value: "break", label: "Break", color: "bg-yellow-100 text-yellow-800" },
  { value: "lunch", label: "Lunch", color: "bg-orange-100 text-orange-800" },
  { value: "assembly", label: "Assembly", color: "bg-purple-100 text-purple-800" },
];

export default function Timetable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;

  const [selectedClass, setSelectedClass] = useState<string>("");
  const [isPeriodsDialogOpen, setIsPeriodsDialogOpen] = useState(false);
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<any>(null);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [periodForm, setPeriodForm] = useState({
    name: "",
    start_time: "08:00",
    end_time: "08:40",
    period_type: "lesson",
    display_order: 0,
  });
  const [entryForm, setEntryForm] = useState({
    class_id: "",
    subject_id: "",
    teacher_id: "",
    period_id: "",
    day_of_week: 1,
    room: "",
  });

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ["school-classes", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_classes")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch teachers (employees who are teachers)
  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch timetable periods
  const { data: periods = [] } = useQuery({
    queryKey: ["timetable-periods", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_periods")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch timetable entries for selected class
  const { data: entries = [] } = useQuery({
    queryKey: ["timetable-entries", tenantId, selectedClass],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("timetable_entries")
        .select(`
          *,
          subject:subjects(id, name, code),
          teacher:employees(id, full_name),
          period:timetable_periods(id, name, start_time, end_time, period_type)
        `)
        .eq("tenant_id", tenantId!)
        .eq("class_id", selectedClass)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!selectedClass,
  });

  // Add/Update period
  const savePeriodMutation = useMutation({
    mutationFn: async (formData: typeof periodForm) => {
      if (editingPeriod) {
        const { error } = await supabase
          .from("timetable_periods")
          .update(formData)
          .eq("id", editingPeriod.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("timetable_periods")
          .insert({ ...formData, tenant_id: tenantId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable-periods"] });
      setIsPeriodsDialogOpen(false);
      setEditingPeriod(null);
      setPeriodForm({ name: "", start_time: "08:00", end_time: "08:40", period_type: "lesson", display_order: 0 });
      toast({ title: editingPeriod ? "Period updated" : "Period added" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete period
  const deletePeriodMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("timetable_periods").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable-periods"] });
      toast({ title: "Period deleted" });
    },
  });

  // Add/Update entry
  const saveEntryMutation = useMutation({
    mutationFn: async (formData: typeof entryForm) => {
      const payload = {
        ...formData,
        class_id: selectedClass,
        subject_id: formData.subject_id || null,
        teacher_id: formData.teacher_id || null,
      };
      if (editingEntry) {
        const { error } = await supabase
          .from("timetable_entries")
          .update(payload)
          .eq("id", editingEntry.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("timetable_entries")
          .insert({ ...payload, tenant_id: tenantId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable-entries"] });
      setIsEntryDialogOpen(false);
      setEditingEntry(null);
      setEntryForm({ class_id: "", subject_id: "", teacher_id: "", period_id: "", day_of_week: 1, room: "" });
      toast({ title: editingEntry ? "Entry updated" : "Entry added" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete entry
  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("timetable_entries").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timetable-entries"] });
      toast({ title: "Entry deleted" });
    },
  });

  const getEntryForCell = (periodId: string, dayOfWeek: number) => {
    return entries.find((e: any) => e.period_id === periodId && e.day_of_week === dayOfWeek);
  };

  const handleCellClick = (periodId: string, dayOfWeek: number) => {
    const existing = getEntryForCell(periodId, dayOfWeek);
    if (existing) {
      setEditingEntry(existing);
      setEntryForm({
        class_id: selectedClass,
        subject_id: existing.subject_id || "",
        teacher_id: existing.teacher_id || "",
        period_id: periodId,
        day_of_week: dayOfWeek,
        room: existing.room || "",
      });
    } else {
      setEditingEntry(null);
      setEntryForm({
        class_id: selectedClass,
        subject_id: "",
        teacher_id: "",
        period_id: periodId,
        day_of_week: dayOfWeek,
        room: "",
      });
    }
    setIsEntryDialogOpen(true);
  };

  const formatTime = (time: string) => {
    if (!time) return "";
    return time.slice(0, 5);
  };

  const getPeriodTypeColor = (type: string) => {
    const periodType = PERIOD_TYPES.find(pt => pt.value === type);
    return periodType?.color || "bg-gray-100 text-gray-800";
  };

  const selectedClassName = classes.find((c: any) => c.id === selectedClass)?.name || "";

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Class Timetable
          </h1>
          <p className="text-sm text-muted-foreground">Manage weekly class schedules</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isPeriodsDialogOpen} onOpenChange={setIsPeriodsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Manage Periods</span>
                <span className="sm:hidden">Periods</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Manage Time Periods</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Period Form */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-muted/50 rounded-lg">
                  <div className="col-span-2 md:col-span-1">
                    <Label>Name</Label>
                    <Input
                      placeholder="Period 1"
                      value={periodForm.name}
                      onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Start</Label>
                    <Input
                      type="time"
                      value={periodForm.start_time}
                      onChange={(e) => setPeriodForm({ ...periodForm, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>End</Label>
                    <Input
                      type="time"
                      value={periodForm.end_time}
                      onChange={(e) => setPeriodForm({ ...periodForm, end_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={periodForm.period_type}
                      onValueChange={(v) => setPeriodForm({ ...periodForm, period_type: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PERIOD_TYPES.map(pt => (
                          <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={() => savePeriodMutation.mutate(periodForm)} className="w-full">
                      {editingPeriod ? "Update" : "Add"}
                    </Button>
                  </div>
                </div>

                {/* Periods List */}
                <div className="space-y-2">
                  {periods.map((period: any, idx) => (
                    <div key={period.id} className="flex items-center justify-between p-3 bg-card border rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium w-6">{idx + 1}.</span>
                        <div>
                          <p className="font-medium">{period.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(period.start_time)} - {formatTime(period.end_time)}
                          </p>
                        </div>
                        <Badge className={getPeriodTypeColor(period.period_type)}>
                          {period.period_type}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingPeriod(period);
                            setPeriodForm({
                              name: period.name,
                              start_time: period.start_time,
                              end_time: period.end_time,
                              period_type: period.period_type,
                              display_order: period.display_order,
                            });
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deletePeriodMutation.mutate(period.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {periods.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No periods defined yet. Add your first period above.
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Class Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label>Select Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a class to view/edit timetable" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedClass && (
              <div className="flex items-end">
                <Badge variant="outline" className="text-sm">
                  Viewing: {selectedClassName}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Timetable Grid */}
      {selectedClass ? (
        periods.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Weekly Schedule - {selectedClassName}</CardTitle>
            </CardHeader>
            <CardContent className="p-2 md:p-4">
              <ScrollArea className="w-full">
                <div className="min-w-[700px]">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="border p-2 bg-muted text-left text-xs md:text-sm font-medium w-24 md:w-32">
                          <Clock className="h-4 w-4 inline mr-1" />
                          Period
                        </th>
                        {DAYS_OF_WEEK.slice(0, 5).map(day => (
                          <th key={day.value} className="border p-2 bg-muted text-center text-xs md:text-sm font-medium">
                            <span className="hidden md:inline">{day.label}</span>
                            <span className="md:hidden">{day.short}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {periods.map((period: any) => (
                        <tr key={period.id}>
                          <td className="border p-2 bg-muted/50">
                            <div className="text-xs md:text-sm font-medium">{period.name}</div>
                            <div className="text-[10px] md:text-xs text-muted-foreground">
                              {formatTime(period.start_time)} - {formatTime(period.end_time)}
                            </div>
                            {period.period_type !== "lesson" && (
                              <Badge variant="outline" className={`text-[10px] mt-1 ${getPeriodTypeColor(period.period_type)}`}>
                                {period.period_type}
                              </Badge>
                            )}
                          </td>
                          {DAYS_OF_WEEK.slice(0, 5).map(day => {
                            const entry = getEntryForCell(period.id, day.value);
                            const isBreak = period.period_type !== "lesson";
                            
                            return (
                              <td
                                key={day.value}
                                className={`border p-1 md:p-2 text-center cursor-pointer transition-colors hover:bg-muted/50 ${
                                  isBreak ? "bg-muted/30" : ""
                                }`}
                                onClick={() => !isBreak && handleCellClick(period.id, day.value)}
                              >
                                {isBreak ? (
                                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                    <Coffee className="h-3 w-3" />
                                    <span className="text-xs">{period.period_type}</span>
                                  </div>
                                ) : entry ? (
                                  <div className="text-xs md:text-sm space-y-1">
                                    <div className="font-medium text-primary flex items-center justify-center gap-1">
                                      <BookOpen className="h-3 w-3" />
                                      {entry.subject?.name || entry.subject?.code || "—"}
                                    </div>
                                    {entry.teacher && (
                                      <div className="text-[10px] md:text-xs text-muted-foreground flex items-center justify-center gap-1">
                                        <User className="h-3 w-3" />
                                        {entry.teacher.full_name}
                                      </div>
                                    )}
                                    {entry.room && (
                                      <Badge variant="outline" className="text-[10px]">{entry.room}</Badge>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-muted-foreground text-xs">
                                    <Plus className="h-4 w-4 mx-auto opacity-50" />
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Periods Defined</h3>
              <p className="text-muted-foreground mb-4">
                Set up time periods first before creating the timetable.
              </p>
              <Button onClick={() => setIsPeriodsDialogOpen(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Manage Periods
              </Button>
            </CardContent>
          </Card>
        )
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Select a Class</h3>
            <p className="text-muted-foreground">
              Choose a class from the dropdown above to view or edit its timetable.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Entry Dialog */}
      <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? "Edit Timetable Entry" : "Add Timetable Entry"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Subject</Label>
              <Select
                value={entryForm.subject_id}
                onValueChange={(v) => setEntryForm({ ...entryForm, subject_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Teacher</Label>
              <Select
                value={entryForm.teacher_id}
                onValueChange={(v) => setEntryForm({ ...entryForm, teacher_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Room/Venue</Label>
              <Input
                placeholder="e.g., Room 101"
                value={entryForm.room}
                onChange={(e) => setEntryForm({ ...entryForm, room: e.target.value })}
              />
            </div>
            <div className="flex gap-2 pt-4">
              {editingEntry && (
                <Button
                  variant="destructive"
                  onClick={() => {
                    deleteEntryMutation.mutate(editingEntry.id);
                    setIsEntryDialogOpen(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={() => saveEntryMutation.mutate(entryForm)}
                disabled={!entryForm.subject_id}
              >
                {editingEntry ? "Update Entry" : "Add Entry"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
