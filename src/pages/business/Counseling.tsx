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
import { Plus, Search, Heart, Clock, CheckCircle, AlertTriangle, Eye, Calendar, User } from "lucide-react";
import { format } from "date-fns";

interface CounselingSession {
  id: string;
  session_number: string;
  student_id: string;
  counselor_name: string;
  session_date: string;
  session_type: string;
  issue_category: string;
  issue_description: string;
  notes: string | null;
  action_plan: string | null;
  status: string;
  referred_to: string | null;
  parent_involvement: string;
  confidentiality: string;
  follow_up_date: string | null;
  follow_up_notes: string | null;
  outcome: string | null;
  created_at: string;
  students?: {
    id: string;
    full_name: string;
    admission_number: string | null;
    school_classes?: { name: string } | null;
  } | null;
}

const sessionTypes = [
  { value: 'individual', label: 'Individual' },
  { value: 'group', label: 'Group' },
  { value: 'family', label: 'Family' },
];

const issueCategories = [
  { value: 'academic', label: 'Academic Performance' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'emotional', label: 'Emotional' },
  { value: 'social', label: 'Social' },
  { value: 'career', label: 'Career Guidance' },
  { value: 'family', label: 'Family Issues' },
  { value: 'bullying', label: 'Bullying' },
  { value: 'trauma', label: 'Trauma' },
  { value: 'substance_abuse', label: 'Substance Abuse' },
  { value: 'other', label: 'Other' },
];

const statusColors: Record<string, string> = {
  open: 'bg-yellow-500',
  in_progress: 'bg-blue-500',
  resolved: 'bg-green-500',
  closed: 'bg-muted',
  referred: 'bg-purple-500',
};

const parentInvolvementOptions = [
  { value: 'informed', label: 'Informed' },
  { value: 'involved', label: 'Involved' },
  { value: 'not_involved', label: 'Not Involved' },
];

const confidentialityOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'confidential', label: 'Confidential' },
  { value: 'restricted', label: 'Restricted' },
];

export default function Counseling() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<CounselingSession | null>(null);
  const [formData, setFormData] = useState({
    student_id: "",
    counselor_name: "",
    session_date: format(new Date(), "yyyy-MM-dd"),
    session_type: "individual",
    issue_category: "",
    issue_description: "",
    notes: "",
    action_plan: "",
    status: "open",
    referred_to: "",
    parent_involvement: "not_involved",
    confidentiality: "normal",
    follow_up_date: "",
    outcome: "",
  });

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

  const { data: students = [] } = useQuery<Array<{ id: string; full_name: string; admission_number: string | null }>>({
    queryKey: ['students-for-counseling', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, admission_number')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; full_name: string; admission_number: string | null }>;
    },
    enabled: !!tenantId,
  });

  const { data: sessions = [], isLoading } = useQuery<CounselingSession[]>({
    queryKey: ['counseling-sessions', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('counseling_sessions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }) as { data: unknown[] | null; error: unknown };
      if (error) throw error;

      const sessionData = (data || []) as Array<{ student_id: string; [key: string]: unknown }>;
      const studentIds = [...new Set(sessionData.map(s => s.student_id))];

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

      return sessionData.map(s => ({
        ...s,
        students: studentMap[s.student_id] || null
      })) as CounselingSession[];
    },
    enabled: !!tenantId,
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('counseling_sessions').insert({
        tenant_id: tenantId!,
        student_id: data.student_id,
        session_number: '',
        counselor_name: data.counselor_name,
        session_date: data.session_date,
        session_type: data.session_type,
        issue_category: data.issue_category,
        issue_description: data.issue_description,
        notes: data.notes || null,
        action_plan: data.action_plan || null,
        status: data.status,
        referred_to: data.referred_to || null,
        parent_involvement: data.parent_involvement,
        confidentiality: data.confidentiality,
        follow_up_date: data.follow_up_date || null,
        outcome: data.outcome || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counseling-sessions'] });
      toast.success("Counseling session created successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, outcome }: { id: string; status: string; outcome?: string }) => {
      const updates: Record<string, unknown> = { status };
      if (outcome) updates.outcome = outcome;
      const { error } = await supabase
        .from('counseling_sessions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counseling-sessions'] });
      toast.success("Session status updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetForm = () => {
    setFormData({
      student_id: "",
      counselor_name: "",
      session_date: format(new Date(), "yyyy-MM-dd"),
      session_type: "individual",
      issue_category: "",
      issue_description: "",
      notes: "",
      action_plan: "",
      status: "open",
      referred_to: "",
      parent_involvement: "not_involved",
      confidentiality: "normal",
      follow_up_date: "",
      outcome: "",
    });
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch =
      s.session_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.students?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.issue_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.counselor_name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    switch (selectedTab) {
      case 'open':
        return s.status === 'open' || s.status === 'in_progress';
      case 'resolved':
        return s.status === 'resolved' || s.status === 'closed';
      case 'referred':
        return s.status === 'referred';
      default:
        return true;
    }
  });

  const stats = {
    total: sessions.length,
    active: sessions.filter(s => s.status === 'open' || s.status === 'in_progress').length,
    resolved: sessions.filter(s => s.status === 'resolved' || s.status === 'closed').length,
    referred: sessions.filter(s => s.status === 'referred').length,
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Guidance & Counseling</h1>
          <p className="text-muted-foreground">Manage student counseling sessions and welfare cases</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Counseling Session</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createSessionMutation.mutate(formData); }} className="space-y-4">
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
                  <Label>Session Date *</Label>
                  <Input
                    type="date"
                    value={formData.session_date}
                    onChange={(e) => setFormData({...formData, session_date: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Counselor Name *</Label>
                  <Input
                    value={formData.counselor_name}
                    onChange={(e) => setFormData({...formData, counselor_name: e.target.value})}
                    placeholder="e.g., Sr. Grace Nakato"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Session Type *</Label>
                  <Select value={formData.session_type} onValueChange={(v) => setFormData({...formData, session_type: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessionTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Issue Category *</Label>
                  <Select value={formData.issue_category} onValueChange={(v) => setFormData({...formData, issue_category: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {issueCategories.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Confidentiality</Label>
                  <Select value={formData.confidentiality} onValueChange={(v) => setFormData({...formData, confidentiality: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {confidentialityOptions.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Issue Description *</Label>
                <Textarea
                  value={formData.issue_description}
                  onChange={(e) => setFormData({...formData, issue_description: e.target.value})}
                  placeholder="Describe the issue or concern..."
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Notes / Observations</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Counselor's observations and notes..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Action Plan</Label>
                <Textarea
                  value={formData.action_plan}
                  onChange={(e) => setFormData({...formData, action_plan: e.target.value})}
                  placeholder="Proposed action plan and recommendations..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parent Involvement</Label>
                  <Select value={formData.parent_involvement} onValueChange={(v) => setFormData({...formData, parent_involvement: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {parentInvolvementOptions.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Follow-up Date</Label>
                  <Input
                    type="date"
                    value={formData.follow_up_date}
                    onChange={(e) => setFormData({...formData, follow_up_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Referred To</Label>
                  <Input
                    value={formData.referred_to}
                    onChange={(e) => setFormData({...formData, referred_to: e.target.value})}
                    placeholder="e.g., Psychologist, Social Worker"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createSessionMutation.isPending}>
                  {createSessionMutation.isPending ? "Creating..." : "Create Session"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Heart className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active Cases</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.resolved}</p>
                <p className="text-sm text-muted-foreground">Resolved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.referred}</p>
                <p className="text-sm text-muted-foreground">Referred</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="all">All Sessions</TabsTrigger>
          <TabsTrigger value="open">Active</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="referred">Referred</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session #</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Counselor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
                    </TableRow>
                  ) : filteredSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No counseling sessions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSessions.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm">{s.session_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{s.students?.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.students?.school_classes?.name || 'No class'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="outline" className="text-xs">
                              {issueCategories.find(t => t.value === s.issue_category)?.label || s.issue_category}
                            </Badge>
                            <div className="flex gap-1 mt-1">
                              <Badge variant="secondary" className="text-[10px]">
                                {sessionTypes.find(t => t.value === s.session_type)?.label || s.session_type}
                              </Badge>
                              {s.confidentiality !== 'normal' && (
                                <Badge variant="secondary" className="text-[10px] bg-amber-100">
                                  {s.confidentiality}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{s.counselor_name}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[s.status] || 'bg-muted'}>
                            {s.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(s.session_date), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedSession(s)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {s.status === 'open' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateStatusMutation.mutate({ id: s.id, status: 'in_progress' })}
                              >
                                Start
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

      <Dialog open={!!selectedSession} onOpenChange={() => setSelectedSession(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Session Details: {selectedSession?.session_number}</DialogTitle>
          </DialogHeader>
          {selectedSession && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Student</Label>
                  <p className="font-medium">{selectedSession.students?.full_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Class</Label>
                  <p>{selectedSession.students?.school_classes?.name || 'Not assigned'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Session Date</Label>
                  <p>{format(new Date(selectedSession.session_date), 'MMMM d, yyyy')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Counselor</Label>
                  <p>{selectedSession.counselor_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Session Type</Label>
                  <Badge variant="outline">
                    {sessionTypes.find(t => t.value === selectedSession.session_type)?.label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Issue Category</Label>
                  <div>
                    <Badge variant="outline">
                      {issueCategories.find(t => t.value === selectedSession.issue_category)?.label}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Issue Description</Label>
                <p className="mt-1 p-3 bg-muted rounded-lg">{selectedSession.issue_description}</p>
              </div>

              {selectedSession.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes / Observations</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg">{selectedSession.notes}</p>
                </div>
              )}

              {selectedSession.action_plan && (
                <div>
                  <Label className="text-muted-foreground">Action Plan</Label>
                  <p className="mt-1 p-3 bg-muted rounded-lg">{selectedSession.action_plan}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <Badge className={statusColors[selectedSession.status]}>
                    {selectedSession.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Confidentiality</Label>
                  <Badge variant="secondary">
                    {selectedSession.confidentiality}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Parent Involvement</Label>
                  <p className="capitalize">{selectedSession.parent_involvement.replace('_', ' ')}</p>
                </div>
                {selectedSession.referred_to && (
                  <div>
                    <Label className="text-muted-foreground">Referred To</Label>
                    <p>{selectedSession.referred_to}</p>
                  </div>
                )}
                {selectedSession.follow_up_date && (
                  <div>
                    <Label className="text-muted-foreground">Follow-up Date</Label>
                    <p>{format(new Date(selectedSession.follow_up_date), 'MMM d, yyyy')}</p>
                  </div>
                )}
                {selectedSession.outcome && (
                  <div>
                    <Label className="text-muted-foreground">Outcome</Label>
                    <p>{selectedSession.outcome}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                {selectedSession.status === 'open' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        updateStatusMutation.mutate({ id: selectedSession.id, status: 'in_progress' });
                        setSelectedSession(null);
                      }}
                    >
                      Start Session
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        updateStatusMutation.mutate({ id: selectedSession.id, status: 'referred' });
                        setSelectedSession(null);
                      }}
                    >
                      Refer Case
                    </Button>
                  </>
                )}
                {(selectedSession.status === 'open' || selectedSession.status === 'in_progress') && (
                  <Button
                    onClick={() => {
                      const outcome = prompt('Enter session outcome:');
                      if (outcome) {
                        updateStatusMutation.mutate({ id: selectedSession.id, status: 'resolved', outcome });
                        setSelectedSession(null);
                      }
                    }}
                  >
                    Resolve Session
                  </Button>
                )}
                {selectedSession.status === 'resolved' && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateStatusMutation.mutate({ id: selectedSession.id, status: 'closed' });
                      setSelectedSession(null);
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
