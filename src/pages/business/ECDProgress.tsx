import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, FileText, Eye, Printer, Search, Star, BookOpen, Download } from 'lucide-react';
import ECDReportCardEditor from '@/components/ecd/ECDReportCardEditor';
import ECDReportCardPreview from '@/components/ecd/ECDReportCardPreview';
import { BatchExportDialog } from '@/components/report-cards/BatchExportDialog';

const ECDProgress = () => {
  const tenantQuery = useTenant();
  const tenantId = tenantQuery.data?.tenantId;
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [editingReportCard, setEditingReportCard] = useState<string | null>(null);
  const [viewingReportCard, setViewingReportCard] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isBatchExportOpen, setIsBatchExportOpen] = useState(false);

  // Fetch academic terms
  const { data: terms = [] } = useQuery({
    queryKey: ['academic-terms', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('year', { ascending: false })
        .order('term_number', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Set current term as default
  useState(() => {
    const currentTerm = terms.find(t => t.is_current);
    if (currentTerm && !selectedTerm) {
      setSelectedTerm(currentTerm.id);
    }
  });

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ['school-classes', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_classes')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch students
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students', tenantId, selectedClass],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('*, school_classes!class_id(name, section)')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      
      if (selectedClass && selectedClass !== 'all') {
        query = query.eq('class_id', selectedClass);
      }
      
      const { data, error } = await query.order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch existing report cards
  const { data: reportCards = [], isLoading: reportCardsLoading } = useQuery({
    queryKey: ['ecd-report-cards', tenantId, selectedTerm],
    queryFn: async () => {
      if (!selectedTerm) return [];
      const { data, error } = await supabase
        .from('ecd_report_cards')
        .select(`
          *,
          students(full_name, admission_number, photo_url),
          school_classes!class_id(name, section),
          academic_terms(name, year, term_number)
        `)
        .eq('tenant_id', tenantId)
        .eq('term_id', selectedTerm);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId && !!selectedTerm,
  });

  // Create report card mutation
  const createReportCardMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const student = students.find(s => s.id === studentId);
      const { data, error } = await supabase
        .from('ecd_report_cards')
        .insert({
          tenant_id: tenantId,
          student_id: studentId,
          term_id: selectedTerm,
          class_id: student?.class_id,
          status: 'draft',
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ecd-report-cards'] });
      setCreateDialogOpen(false);
      setEditingReportCard(data.id);
      toast.success('Report card created');
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('Report card already exists for this student and term');
      } else {
        toast.error('Failed to create report card');
      }
    },
  });

  // Filter students without report cards
  const studentsWithoutReportCards = students.filter(
    student => !reportCards.some(rc => rc.student_id === student.id)
  );

  // Filter report cards by search
  const filteredReportCards = reportCards.filter(rc => 
    rc.students?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rc.students?.admission_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500">Published</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (editingReportCard) {
    return (
      <ECDReportCardEditor 
        reportCardId={editingReportCard} 
        onClose={() => setEditingReportCard(null)} 
      />
    );
  }

  if (viewingReportCard) {
    return (
      <ECDReportCardPreview 
        reportCardId={viewingReportCard} 
        onClose={() => setViewingReportCard(null)} 
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Star className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />
            ECD Progress Reports
          </h1>
          <p className="text-sm text-muted-foreground">
            Competency-based progress tracking for early childhood learners
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsBatchExportOpen(true)}
            disabled={filteredReportCards.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Batch Export</span>
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={!selectedTerm}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Create Report Card</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Progress Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Learner</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a learner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {studentsWithoutReportCards.map(student => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.full_name} - {student.school_classes?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {studentsWithoutReportCards.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    All learners have report cards for this term
                  </p>
                )}
              </div>
              <Button 
                className="w-full" 
                onClick={() => createReportCardMutation.mutate(selectedStudentId)}
                disabled={!selectedStudentId || createReportCardMutation.isPending}
              >
                {createReportCardMutation.isPending ? 'Creating...' : 'Create Report Card'}
              </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search learners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedTerm} onValueChange={setSelectedTerm}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Select term" />
          </SelectTrigger>
          <SelectContent>
            {terms.map(term => (
              <SelectItem key={term.id} value={term.id}>
                {term.name} {term.year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map(cls => (
              <SelectItem key={cls.id} value={cls.id}>
                {cls.name} {cls.section && `- ${cls.section}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Report Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Progress Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reportCardsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredReportCards.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Star className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No progress reports found</p>
              <p className="text-sm">Create a report card to get started</p>
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="space-y-3 sm:hidden">
                {filteredReportCards.map(rc => (
                  <Card key={rc.id} className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium">{rc.students?.full_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {rc.students?.admission_number}
                        </p>
                      </div>
                      {getStatusBadge(rc.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {rc.school_classes?.name} {rc.school_classes?.section && `- ${rc.school_classes.section}`}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => setViewingReportCard(rc.id)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                      <Button size="sm" className="flex-1" onClick={() => setEditingReportCard(rc.id)}>
                        <FileText className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Learner</TableHead>
                      <TableHead>Admission No.</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReportCards.map(rc => (
                      <TableRow key={rc.id}>
                        <TableCell className="font-medium">
                          {rc.students?.full_name}
                        </TableCell>
                        <TableCell>{rc.students?.admission_number}</TableCell>
                        <TableCell>
                          {rc.school_classes?.name} {rc.school_classes?.section && `(${rc.school_classes.section})`}
                        </TableCell>
                        <TableCell>{getStatusBadge(rc.status)}</TableCell>
                        <TableCell>
                          {rc.days_present}/{rc.total_school_days} days
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => setViewingReportCard(rc.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingReportCard(rc.id)}>
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <BatchExportDialog
        open={isBatchExportOpen}
        onOpenChange={setIsBatchExportOpen}
        reportCards={filteredReportCards.map(rc => ({
          id: rc.id,
          studentName: rc.students?.full_name || 'Unknown',
          className: rc.school_classes?.name || 'Unknown',
        }))}
        tenantData={tenantQuery.data}
        termName={terms.find(t => t.id === selectedTerm)?.name || 'Reports'}
        type="ecd"
      />
    </div>
  );
};

export default ECDProgress;
