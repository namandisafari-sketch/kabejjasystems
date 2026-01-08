import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Search, AlertTriangle, Clock, CheckCircle, XCircle, Eye, Bell, Calendar } from "lucide-react";
import { format, isAfter, isBefore, parseISO } from "date-fns";

interface DisciplineCase {
  id: string;
  case_number: string;
  student_id: string;
  incident_date: string;
  incident_type: string;
  incident_description: string;
  location: string | null;
  witnesses: string | null;
  action_taken: string;
  action_details: string | null;
  suspension_start_date: string | null;
  suspension_end_date: string | null;
  expulsion_date: string | null;
  is_permanent_expulsion: boolean;
  parent_notified: boolean;
  parent_notified_at: string | null;
  parent_acknowledged: boolean;
  parent_response: string | null;
  status: string;
  resolution_notes: string | null;
  follow_up_required: boolean;
  follow_up_date: string | null;
  created_at: string;
  students?: {
    id: string;
    full_name: string;
    admission_number: string | null;
    school_classes?: { name: string } | null;
  } | null;
}

const incidentTypes = [
  { value: 'minor_offense', label: 'Minor Offense' },
  { value: 'major_offense', label: 'Major Offense' },
  { value: 'behavioral', label: 'Behavioral Issue' },
  { value: 'academic_dishonesty', label: 'Academic Dishonesty' },
  { value: 'bullying', label: 'Bullying' },
  { value: 'vandalism', label: 'Vandalism' },
  { value: 'other', label: 'Other' },
];

const actionTypes = [
  { value: 'warning', label: 'Warning' },
  { value: 'detention', label: 'Detention' },
  { value: 'suspension', label: 'Suspension' },
  { value: 'expulsion', label: 'Expulsion' },
  { value: 'counseling', label: 'Counseling' },
  { value: 'parent_meeting', label: 'Parent Meeting' },
  { value: 'community_service', label: 'Community Service' },
];

const statusColors: Record<string, string> = {
  open: 'bg-yellow-500',
  under_review: 'bg-blue-500',
  resolved: 'bg-green-500',
  appealed: 'bg-purple-500',
  closed: 'bg-muted',
};

export default function DisciplineCases() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<DisciplineCase | null>(null);
  const [formData, setFormData] = useState({
    student_id: "",
    incident_date: format(new Date(), "yyyy-MM-dd"),
    incident_type: "",
    incident_description: "",
    location: "",
    witnesses: "",
    action_taken: "",
    action_details: "",
    suspension_start_date: "",
    suspension_end_date: "",
    expulsion_date: "",
    is_permanent_expulsion: false,
  });

  // Get tenant ID from profile
  const { data: profile } = useQuery({
    queryKey: ['current-profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      return data;
    },
  });

  const tenantId = profile?.tenant_id;

  // Fetch students - using any to avoid TS2589 type recursion
  const { data: students = [] } = useQuery<Array<{ id: string; full_name: string; admission_number: string | null }>>({
    queryKey: ['students-for-discipline', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('students')
        .select('id, full_name, admission_number')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; full_name: string; admission_number: string | null }>;
    },
    enabled: !!tenantId,
  });

  // Fetch discipline cases
  const { data: cases = [], isLoading } = useQuery<DisciplineCase[]>({
    queryKey: ['discipline-cases', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('discipline_cases')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }) as { data: unknown[] | null; error: unknown };
      if (error) throw error;
      
      const caseData = (data || []) as Array<{ student_id: string; [key: string]: unknown }>;
      const studentIds = [...new Set(caseData.map(c => c.student_id))];
      
      type StudentInfo = { id: string; full_name: string; admission_number: string | null; school_classes?: { name: string } | null };
      let studentMap: Record<string, StudentInfo> = {};
      
      if (studentIds.length > 0) {
        const { data: studentsData } = await supabase
          .from('students')
          .select('id, full_name, admission_number, class_id')
          .in('id', studentIds) as { data: Array<{ id: string; full_name: string; admission_number: string | null; class_id: string | null }> | null };
        
        const classIds = [...new Set((studentsData || []).map(s => s.class_id).filter(Boolean))] as string[];
        let classMap: Record<string, string> = {};
        
        if (classIds.length > 0) {
          const { data: classesData } = await supabase
            .from('school_classes')
            .select('id, name')
            .in('id', classIds) as { data: Array<{ id: string; name: string }> | null };
          classMap = (classesData || []).reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {});
        }
        
        studentMap = (studentsData || []).reduce((acc, s) => ({
          ...acc,
          [s.id]: { id: s.id, full_name: s.full_name, admission_number: s.admission_number, school_classes: s.class_id ? { name: classMap[s.class_id] || 'Unknown' } : null }
        }), {});
      }
      
      return caseData.map(c => ({
        ...c,
        students: studentMap[c.student_id] || null
      })) as DisciplineCase[];
    },
    enabled: !!tenantId,
  });

  // Create case mutation
  const createCaseMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('discipline_cases').insert({
        tenant_id: tenantId!,
        student_id: data.student_id,
        case_number: '', // Auto-generated by trigger
        incident_date: data.incident_date,
        incident_type: data.incident_type,
        incident_description: data.incident_description,
        location: data.location || null,
        witnesses: data.witnesses || null,
        action_taken: data.action_taken,
        action_details: data.action_details || null,
        suspension_start_date: data.suspension_start_date || null,
        suspension_end_date: data.suspension_end_date || null,
        expulsion_date: data.expulsion_date || null,
        is_permanent_expulsion: data.is_permanent_expulsion,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discipline-cases'] });
      toast.success("Discipline case created successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update case status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, resolution_notes }: { id: string; status: string; resolution_notes?: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'resolved' || status === 'closed') {
        updates.resolved_at = new Date().toISOString();
        if (resolution_notes) updates.resolution_notes = resolution_notes;
      }
      const { error } = await supabase
        .from('discipline_cases')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discipline-cases'] });
      toast.success("Case status updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Notify parent mutation
  const notifyParentMutation = useMutation({
    mutationFn: async (caseId: string) => {
      const { error } = await supabase
        .from('discipline_cases')
        .update({
          parent_notified: true,
          parent_notified_at: new Date().toISOString(),
        })
        .eq('id', caseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discipline-cases'] });
      toast.success("Parent notification status updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      student_id: "",
      incident_date: format(new Date(), "yyyy-MM-dd"),
      incident_type: "",
      incident_description: "",
      location: "",
      witnesses: "",
      action_taken: "",
      action_details: "",
      suspension_start_date: "",
      suspension_end_date: "",
      expulsion_date: "",
      is_permanent_expulsion: false,
    });
  };

  // Filter cases based on tab and search
  const filteredCases = cases.filter(c => {
    const matchesSearch = 
      c.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.students?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.incident_description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (selectedTab) {
      case 'suspended':
        return c.action_taken === 'suspension' && c.suspension_end_date && isAfter(parseISO(c.suspension_end_date), new Date());
      case 'expelled':
        return c.action_taken === 'expulsion';
      case 'returning':
        return c.action_taken === 'suspension' && c.suspension_end_date && 
          isBefore(parseISO(c.suspension_end_date), new Date()) && c.status !== 'closed';
      case 'open':
        return c.status === 'open' || c.status === 'under_review';
      default:
        return true;
    }
  });

  // Stats
  const stats = {
    total: cases.length,
    open: cases.filter(c => c.status === 'open' || c.status === 'under_review').length,
    suspended: cases.filter(c => c.action_taken === 'suspension' && c.suspension_end_date && isAfter(parseISO(c.suspension_end_date), new Date())).length,
    expelled: cases.filter(c => c.action_taken === 'expulsion').length,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Discipline Case Management</h1>
          <p className="text-muted-foreground">Track and manage student discipline cases</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Case
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Discipline Case</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createCaseMutation.mutate(formData); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Student *</Label>
                  <Select value={formData.student_id} onValueChange={(v) => setFormData({...formData, student_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((s: { id: string; full_name: string; admission_number: string | null }) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.full_name} {s.admission_number ? `(${s.admission_number})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Incident Date *</Label>
                  <Input 
                    type="date" 
                    value={formData.incident_date}
                    onChange={(e) => setFormData({...formData, incident_date: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Incident Type *</Label>
                  <Select value={formData.incident_type} onValueChange={(v) => setFormData({...formData, incident_type: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {incidentTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input 
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    placeholder="e.g., Classroom, Playground"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Incident Description *</Label>
                <Textarea 
                  value={formData.incident_description}
                  onChange={(e) => setFormData({...formData, incident_description: e.target.value})}
                  placeholder="Describe what happened..."
                  rows={3}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Witnesses</Label>
                <Input 
                  value={formData.witnesses}
                  onChange={(e) => setFormData({...formData, witnesses: e.target.value})}
                  placeholder="Names of witnesses"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Action Taken *</Label>
                  <Select value={formData.action_taken} onValueChange={(v) => setFormData({...formData, action_taken: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select action" />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.action_taken === 'suspension' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-yellow-500/10 rounded-lg">
                  <div className="space-y-2">
                    <Label>Suspension Start Date</Label>
                    <Input 
                      type="date"
                      value={formData.suspension_start_date}
                      onChange={(e) => setFormData({...formData, suspension_start_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Suspension End Date (Return Date)</Label>
                    <Input 
                      type="date"
                      value={formData.suspension_end_date}
                      onChange={(e) => setFormData({...formData, suspension_end_date: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {formData.action_taken === 'expulsion' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-destructive/10 rounded-lg">
                  <div className="space-y-2">
                    <Label>Expulsion Date</Label>
                    <Input 
                      type="date"
                      value={formData.expulsion_date}
                      onChange={(e) => setFormData({...formData, expulsion_date: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-6">
                    <input 
                      type="checkbox"
                      id="permanent"
                      checked={formData.is_permanent_expulsion}
                      onChange={(e) => setFormData({...formData, is_permanent_expulsion: e.target.checked})}
                    />
                    <Label htmlFor="permanent">Permanent Expulsion</Label>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Action Details</Label>
                <Textarea 
                  value={formData.action_details}
                  onChange={(e) => setFormData({...formData, action_details: e.target.value})}
                  placeholder="Additional details about the action..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createCaseMutation.isPending}>
                  {createCaseMutation.isPending ? "Creating..." : "Create Case"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.open}</p>
                <p className="text-sm text-muted-foreground">Open Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.suspended}</p>
                <p className="text-sm text-muted-foreground">Suspended</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/20 rounded-lg">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expelled}</p>
                <p className="text-sm text-muted-foreground">Expelled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Tabs */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search cases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all">All Cases</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="suspended">Suspended</TabsTrigger>
          <TabsTrigger value="returning">Returning Soon</TabsTrigger>
          <TabsTrigger value="expelled">Expelled</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case #</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Incident</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : filteredCases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No cases found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCases.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-sm">{c.case_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{c.students?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.students?.school_classes?.name || 'No class'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {incidentTypes.find(t => t.value === c.incident_type)?.label || c.incident_type}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(parseISO(c.incident_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge className={c.action_taken === 'expulsion' ? 'bg-destructive' : c.action_taken === 'suspension' ? 'bg-orange-500' : 'bg-yellow-500'}>
                              {actionTypes.find(t => t.value === c.action_taken)?.label || c.action_taken}
                            </Badge>
                            {c.suspension_end_date && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Returns: {format(parseISO(c.suspension_end_date), 'MMM d, yyyy')}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[c.status]}>
                            {c.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {c.parent_notified ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-xs">
                                {c.parent_acknowledged ? 'Acknowledged' : 'Notified'}
                              </span>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => notifyParentMutation.mutate(c.id)}
                            >
                              <Bell className="h-3 w-3 mr-1" />
                              Notify
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setSelectedCase(c)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {c.status === 'open' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateStatusMutation.mutate({ id: c.id, status: 'resolved' })}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Case Details Dialog */}
      <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Case Details: {selectedCase?.case_number}</DialogTitle>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Student</Label>
                  <p className="font-medium">{selectedCase.students?.full_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Class</Label>
                  <p>{selectedCase.students?.school_classes?.name || 'Not assigned'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Incident Date</Label>
                  <p>{format(parseISO(selectedCase.incident_date), 'MMMM d, yyyy')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Incident Type</Label>
                  <Badge variant="outline">
                    {incidentTypes.find(t => t.value === selectedCase.incident_type)?.label}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1 p-3 bg-muted rounded-lg">{selectedCase.incident_description}</p>
              </div>

              {selectedCase.location && (
                <div>
                  <Label className="text-muted-foreground">Location</Label>
                  <p>{selectedCase.location}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Action Taken</Label>
                  <Badge className={selectedCase.action_taken === 'expulsion' ? 'bg-destructive' : selectedCase.action_taken === 'suspension' ? 'bg-orange-500' : ''}>
                    {actionTypes.find(t => t.value === selectedCase.action_taken)?.label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={statusColors[selectedCase.status]}>
                    {selectedCase.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              {selectedCase.suspension_start_date && (
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Label className="text-muted-foreground">Suspension Period</Label>
                  <p>
                    {format(parseISO(selectedCase.suspension_start_date), 'MMM d, yyyy')} - {' '}
                    {selectedCase.suspension_end_date ? format(parseISO(selectedCase.suspension_end_date), 'MMM d, yyyy') : 'TBD'}
                  </p>
                </div>
              )}

              {selectedCase.expulsion_date && (
                <div className="p-3 bg-destructive/10 rounded-lg">
                  <Label className="text-muted-foreground">Expulsion Date</Label>
                  <p>{format(parseISO(selectedCase.expulsion_date), 'MMMM d, yyyy')}</p>
                  {selectedCase.is_permanent_expulsion && (
                    <Badge variant="destructive" className="mt-1">Permanent</Badge>
                  )}
                </div>
              )}

              {selectedCase.parent_response && (
                <div>
                  <Label className="text-muted-foreground">Parent Response</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg">{selectedCase.parent_response}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                {selectedCase.status === 'open' && (
                  <>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        updateStatusMutation.mutate({ id: selectedCase.id, status: 'under_review' });
                        setSelectedCase(null);
                      }}
                    >
                      Mark Under Review
                    </Button>
                    <Button 
                      onClick={() => {
                        updateStatusMutation.mutate({ id: selectedCase.id, status: 'resolved' });
                        setSelectedCase(null);
                      }}
                    >
                      Resolve Case
                    </Button>
                  </>
                )}
                {selectedCase.status === 'resolved' && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedCase.id, status: 'closed' });
                      setSelectedCase(null);
                    }}
                  >
                    Close Case
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
