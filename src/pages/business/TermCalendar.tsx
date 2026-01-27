import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { 
  Calendar, Plus, ChevronLeft, ChevronRight, Trash2, Edit, 
  Download, Printer, Eye, EyeOff, BookOpen, Trophy, Sun, 
  Users, Flag, AlertCircle, Clock
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";

const EVENT_TYPES = [
  { value: "general", label: "General", color: "#3B82F6", icon: Calendar },
  { value: "exam", label: "Exam", color: "#EF4444", icon: BookOpen },
  { value: "holiday", label: "Holiday", color: "#22C55E", icon: Sun },
  { value: "meeting", label: "Meeting", color: "#8B5CF6", icon: Users },
  { value: "sports", label: "Sports", color: "#F97316", icon: Trophy },
  { value: "cultural", label: "Cultural", color: "#EC4899", icon: Flag },
  { value: "deadline", label: "Deadline", color: "#EAB308", icon: AlertCircle },
];

export default function TermCalendar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);

  const [eventForm, setEventForm] = useState({
    term_id: "",
    title: "",
    description: "",
    event_type: "general",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    is_all_day: true,
    color: "#3B82F6",
    is_published: false,
  });

  // Fetch current term
  const { data: currentTerm } = useQuery({
    queryKey: ["current-term", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_terms")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_current", true)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch all terms
  const { data: terms = [] } = useQuery({
    queryKey: ["academic-terms", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("academic_terms")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("year", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch calendar events
  const { data: events = [] } = useQuery({
    queryKey: ["term-calendar-events", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("term_calendar_events")
        .select(`
          *,
          term:academic_terms(id, name, year)
        `)
        .eq("tenant_id", tenantId!)
        .order("start_date");
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Save event
  const saveEventMutation = useMutation({
    mutationFn: async (formData: typeof eventForm) => {
      const payload = {
        ...formData,
        term_id: formData.term_id || currentTerm?.id,
        start_time: formData.is_all_day ? null : formData.start_time || null,
        end_time: formData.is_all_day ? null : formData.end_time || null,
        end_date: formData.end_date || formData.start_date,
      };
      if (editingEvent) {
        const { error } = await supabase
          .from("term_calendar_events")
          .update(payload)
          .eq("id", editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("term_calendar_events")
          .insert({ ...payload, tenant_id: tenantId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["term-calendar-events"] });
      setIsEventDialogOpen(false);
      setEditingEvent(null);
      resetForm();
      toast({ title: editingEvent ? "Event updated" : "Event added" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete event
  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("term_calendar_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["term-calendar-events"] });
      toast({ title: "Event deleted" });
    },
  });

  // Toggle publish
  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase
        .from("term_calendar_events")
        .update({ is_published })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["term-calendar-events"] });
    },
  });

  const resetForm = () => {
    setEventForm({
      term_id: "",
      title: "",
      description: "",
      event_type: "general",
      start_date: "",
      end_date: "",
      start_time: "",
      end_time: "",
      is_all_day: true,
      color: "#3B82F6",
      is_published: false,
    });
  };

  // Calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    // Add padding days from previous month
    const startDay = start.getDay();
    const paddingDays = [];
    for (let i = startDay - 1; i >= 0; i--) {
      const d = new Date(start);
      d.setDate(d.getDate() - i - 1);
      paddingDays.push(d);
    }
    
    return [...paddingDays, ...days];
  }, [currentMonth]);

  // Events for a specific day
  const getEventsForDay = (date: Date) => {
    return events.filter((event: any) => {
      const startDate = parseISO(event.start_date);
      const endDate = event.end_date ? parseISO(event.end_date) : startDate;
      return date >= startDate && date <= endDate;
    });
  };

  // Events for selected day
  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    if (!isSameMonth(date, currentMonth)) {
      setCurrentMonth(date);
    }
  };

  const handleAddEvent = (date?: Date) => {
    resetForm();
    setEditingEvent(null);
    if (date) {
      setEventForm(prev => ({ ...prev, start_date: format(date, "yyyy-MM-dd") }));
    }
    setIsEventDialogOpen(true);
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setEventForm({
      term_id: event.term_id,
      title: event.title,
      description: event.description || "",
      event_type: event.event_type,
      start_date: event.start_date,
      end_date: event.end_date || "",
      start_time: event.start_time || "",
      end_time: event.end_time || "",
      is_all_day: event.is_all_day,
      color: event.color,
      is_published: event.is_published,
    });
    setIsEventDialogOpen(true);
  };

  const getEventTypeConfig = (type: string) => {
    return EVENT_TYPES.find(et => et.value === type) || EVENT_TYPES[0];
  };

  const publishedCount = events.filter((e: any) => e.is_published).length;
  const draftCount = events.filter((e: any) => !e.is_published).length;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            Term Calendar
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and publish school term calendars
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={isPreviewMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            {isPreviewMode ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {isPreviewMode ? "Edit Mode" : "Preview"}
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button onClick={() => handleAddEvent()}>
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Add Event</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Events</p>
                <p className="text-xl font-bold">{events.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Published</p>
                <p className="text-xl font-bold">{publishedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <EyeOff className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Draft</p>
                <p className="text-xl font-bold">{draftCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Current Term</p>
                <p className="text-sm font-bold truncate">{currentTerm?.name || "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{format(currentMonth, "MMMM yyyy")}</CardTitle>
              <div className="flex gap-1">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                
                return (
                  <div
                    key={idx}
                    onClick={() => handleDayClick(day)}
                    className={`
                      min-h-[80px] md:min-h-[100px] p-1 border rounded-lg cursor-pointer transition-colors
                      ${isCurrentMonth ? "bg-card" : "bg-muted/30 text-muted-foreground"}
                      ${isToday ? "border-primary" : "border-border"}
                      ${isSelected ? "ring-2 ring-primary" : ""}
                      hover:bg-muted/50
                    `}
                  >
                    <div className={`text-xs md:text-sm font-medium mb-1 ${isToday ? "text-primary" : ""}`}>
                      {format(day, "d")}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((event: any) => {
                        const typeConfig = getEventTypeConfig(event.event_type);
                        return (
                          <div
                            key={event.id}
                            className="text-[10px] md:text-xs truncate px-1 py-0.5 rounded"
                            style={{ backgroundColor: `${event.color}20`, color: event.color }}
                          >
                            {event.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Day Events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Select a Day"}
            </CardTitle>
            {selectedDate && !isPreviewMode && (
              <Button size="sm" onClick={() => handleAddEvent(selectedDate)}>
                <Plus className="h-4 w-4 mr-1" />
                Add Event
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {selectedDayEvents.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayEvents.map((event: any) => {
                    const typeConfig = getEventTypeConfig(event.event_type);
                    const TypeIcon = typeConfig.icon;
                    
                    return (
                      <div
                        key={event.id}
                        className="p-3 rounded-lg border"
                        style={{ borderLeftColor: event.color, borderLeftWidth: 4 }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <TypeIcon className="h-4 w-4 mt-0.5" style={{ color: event.color }} />
                            <div>
                              <h4 className="font-medium text-sm">{event.title}</h4>
                              {event.description && (
                                <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {typeConfig.label}
                                </Badge>
                                {event.is_published ? (
                                  <Badge className="text-xs bg-green-100 text-green-800">Published</Badge>
                                ) : (
                                  <Badge className="text-xs bg-yellow-100 text-yellow-800">Draft</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {!isPreviewMode && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditEvent(event)}>
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => deleteEventMutation.mutate(event.id)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedDate ? "No events on this day" : "Click a date to view events"}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Event Types Legend */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            {EVENT_TYPES.map(type => {
              const Icon = type.icon;
              return (
                <div key={type.value} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                  <Icon className="h-4 w-4" style={{ color: type.color }} />
                  <span className="text-sm">{type.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event Dialog */}
      <Dialog open={isEventDialogOpen} onOpenChange={setIsEventDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Edit Event" : "Add New Event"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Event Title *</Label>
              <Input
                placeholder="e.g., Mid-Term Exams Begin"
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Event Type</Label>
                <Select
                  value={eventForm.event_type}
                  onValueChange={(v) => {
                    const typeConfig = getEventTypeConfig(v);
                    setEventForm({ ...eventForm, event_type: v, color: typeConfig.color });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }} />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Term</Label>
                <Select
                  value={eventForm.term_id || currentTerm?.id}
                  onValueChange={(v) => setEventForm({ ...eventForm, term_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
                  <SelectContent>
                    {terms.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name} ({t.year})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={eventForm.start_date}
                  onChange={(e) => setEventForm({ ...eventForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={eventForm.end_date}
                  onChange={(e) => setEventForm({ ...eventForm, end_date: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={eventForm.is_all_day}
                onCheckedChange={(v) => setEventForm({ ...eventForm, is_all_day: v })}
              />
              <Label>All Day Event</Label>
            </div>
            {!eventForm.is_all_day && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={eventForm.start_time}
                    onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={eventForm.end_time}
                    onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                  />
                </div>
              </div>
            )}
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Optional details about the event..."
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {["#3B82F6", "#EF4444", "#22C55E", "#8B5CF6", "#F97316", "#EC4899", "#EAB308", "#6366F1"].map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      eventForm.color === color ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setEventForm({ ...eventForm, color })}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={eventForm.is_published}
                onCheckedChange={(v) => setEventForm({ ...eventForm, is_published: v })}
              />
              <Label>Publish to Parents</Label>
            </div>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsEventDialogOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={() => saveEventMutation.mutate(eventForm)}
              disabled={!eventForm.title || !eventForm.start_date}
              className="flex-1"
            >
              {editingEvent ? "Update Event" : "Add Event"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
