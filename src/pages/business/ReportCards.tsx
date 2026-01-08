import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Search, Eye, Edit, Printer, Download } from "lucide-react";
import { ReportCardEditor } from "@/components/report-cards/ReportCardEditor";
import { ReportCardPreview } from "@/components/report-cards/ReportCardPreview";
import { ALevelReportCardEditor } from "@/components/report-cards/ALevelReportCardEditor";
import { ALevelReportCardPreview } from "@/components/report-cards/ALevelReportCardPreview";
import { SubjectsManager } from "@/components/report-cards/SubjectsManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BatchExportDialog } from "@/components/report-cards/BatchExportDialog";

// Helper to check if class is A-Level
const isALevel = (className?: string, level?: string) => {
  if (!className && !level) return false;
  const combined = `${className || ''} ${level || ''}`.toLowerCase();
  return combined.includes('a-level') || combined.includes('s5') || combined.includes('s6') || 
         combined.includes('senior 5') || combined.includes('senior 6');
};

export default function ReportCards() {
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [editingReportCard, setEditingReportCard] = useState<any>(null);
  const [viewingReportCard, setViewingReportCard] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [isBatchExportOpen, setIsBatchExportOpen] = useState(false);

  // Fetch academic terms
  const { data: terms = [] } = useQuery({
    queryKey: ['academic-terms', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('tenant_id', tenantData!.tenantId)
        .order('year', { ascending: false })
        .order('term_number', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Set default term to current term
  const currentTerm = terms.find(t => t.is_current);
  if (currentTerm && !selectedTerm) {
    setSelectedTerm(currentTerm.id);
  }

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ['school-classes', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_classes')
        .select('*')
        .eq('tenant_id', tenantData!.tenantId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch students
  const { data: students = [] } = useQuery({
    queryKey: ['students', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, school_classes(id, name)')
        .eq('tenant_id', tenantData!.tenantId)
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch report cards
  const { data: reportCards = [], isLoading } = useQuery({
    queryKey: ['report-cards', tenantData?.tenantId, selectedTerm, selectedClass],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      let query = supabase
        .from('student_report_cards')
        .select(`
          *,
          students(id, full_name, admission_number, school_classes(id, name)),
          academic_terms(id, name, term_number, year)
        `)
        .eq('tenant_id', tenantData!.tenantId)
        .order('created_at', { ascending: false });

      if (selectedTerm) {
        query = query.eq('term_id', selectedTerm);
      }

      if (selectedClass && selectedClass !== 'all') {
        query = query.eq('class_id', selectedClass);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Create report card mutation
  const createReportCardMutation = useMutation({
    mutationFn: async (studentId: string) => {
      if (!tenantData?.tenantId || !selectedTerm) {
        throw new Error("Please select a term first");
      }

      const student = students.find(s => s.id === studentId);
      if (!student) throw new Error("Student not found");

      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('student_report_cards')
        .insert({
          tenant_id: tenantData.tenantId,
          student_id: studentId,
          term_id: selectedTerm,
          class_id: student.class_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['report-cards'] });
      setIsCreateDialogOpen(false);
      setEditingReportCard(data);
      toast({ title: "Report card created", description: "You can now enter scores and remarks" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Filter students who don't have report cards for the selected term
  const studentsWithoutReportCards = students.filter(
    student => !reportCards.some(rc => rc.student_id === student.id)
  );

  // Filter report cards by search
  const filteredReportCards = reportCards.filter(rc => {
    const studentName = rc.students?.full_name?.toLowerCase() || "";
    const admissionNo = rc.students?.admission_number?.toLowerCase() || "";
    const search = searchQuery.toLowerCase();
    return studentName.includes(search) || admissionNo.includes(search);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500">Published</Badge>;
      case 'draft':
      default:
        return <Badge variant="secondary">Draft</Badge>;
    }
  };

  if (editingReportCard) {
    const studentClass = editingReportCard.students?.school_classes;
    const useALevel = isALevel(studentClass?.name, studentClass?.level);
    
    if (useALevel) {
      return (
        <ALevelReportCardEditor
          reportCard={editingReportCard}
          onClose={() => {
            setEditingReportCard(null);
            queryClient.invalidateQueries({ queryKey: ['report-cards'] });
          }}
        />
      );
    }
    
    return (
      <ReportCardEditor
        reportCard={editingReportCard}
        onClose={() => {
          setEditingReportCard(null);
          queryClient.invalidateQueries({ queryKey: ['report-cards'] });
        }}
      />
    );
  }

  if (viewingReportCard) {
    const studentClass = viewingReportCard.students?.school_classes;
    const useALevel = isALevel(studentClass?.name, studentClass?.level);
    
    if (useALevel) {
      return (
        <ALevelReportCardPreview
          reportCardId={viewingReportCard.id}
          onClose={() => setViewingReportCard(null)}
        />
      );
    }
    
    return (
      <ReportCardPreview
        reportCardId={viewingReportCard.id}
        onClose={() => setViewingReportCard(null)}
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Tabs defaultValue="report-cards" className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Report Cards</h1>
            <p className="text-muted-foreground">Manage student report cards and academic records</p>
          </div>
          <TabsList>
            <TabsTrigger value="report-cards">Report Cards</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="report-cards" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.map((term) => (
                      <SelectItem key={term.id} value={term.id}>
                        {term.name} {term.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="All classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setIsBatchExportOpen(true)}
                  disabled={filteredReportCards.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Batch Export
                </Button>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button disabled={!selectedTerm}>
                      <Plus className="h-4 w-4 mr-2" />
                      New Report Card
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Report Card</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Select Student</Label>
                        <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a student" />
                          </SelectTrigger>
                          <SelectContent>
                            {studentsWithoutReportCards.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.full_name} - {student.admission_number}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => createReportCardMutation.mutate(selectedStudentId)}
                        disabled={!selectedStudentId || createReportCardMutation.isPending}
                      >
                        {createReportCardMutation.isPending ? "Creating..." : "Create Report Card"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Report Cards Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Report Cards ({filteredReportCards.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredReportCards.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No report cards found</p>
                  <p className="text-sm">Select a term and create report cards for students</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Rank</TableHead>
                      <TableHead>Average</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReportCards.map((rc) => (
                      <TableRow key={rc.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{rc.students?.full_name}</p>
                            <p className="text-sm text-muted-foreground">{rc.students?.admission_number}</p>
                          </div>
                        </TableCell>
                        <TableCell>{rc.students?.school_classes?.name || '-'}</TableCell>
                        <TableCell>
                          {rc.academic_terms?.name} {rc.academic_terms?.year}
                        </TableCell>
                        <TableCell>
                          {rc.class_rank ? (
                            <span className="font-medium">
                              {rc.class_rank}/{rc.total_students_in_class || '-'}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {rc.average_score ? `${rc.average_score.toFixed(1)}%` : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(rc.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingReportCard(rc)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingReportCard(rc)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewingReportCard(rc)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects">
          <SubjectsManager />
        </TabsContent>
      </Tabs>

      <BatchExportDialog
        open={isBatchExportOpen}
        onOpenChange={setIsBatchExportOpen}
        reportCards={filteredReportCards.map(rc => ({
          id: rc.id,
          studentName: rc.students?.full_name || 'Unknown',
          className: rc.students?.school_classes?.name || 'Unknown',
        }))}
        tenantData={tenantData}
        termName={terms.find(t => t.id === selectedTerm)?.name || 'Reports'}
        type="regular"
      />
    </div>
  );
}
