import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, AlertCircle, CheckCircle, Trash2, Search, Users, GraduationCap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/hooks/use-tenant";
import { useQuery } from "@tanstack/react-query";

interface ExamSession {
  id: string;
  year: number;
  level: string;
  session_name: string;
}

interface StudentCandidate {
  id: string;
  student_id: string;
  index_number: string | null;
  exam_type: 'UCE' | 'UACE';
  student: {
    id: string;
    full_name: string;
    admission_number: string;
    class: { name: string } | null;
  };
  selected?: boolean;
  grades: Record<string, string>;
}

const UNEB_SUBJECTS_UCE = [
  "English Language",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "CRE",
  "Agriculture",
];

const UNEB_SUBJECTS_UACE = [
  "General Paper",
  "Subsidiary ICT",
  "Subsidiary Math",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Geography",
  "History",
  "Entrepreneurship",
];

const ImportExamResults = () => {
  const { toast } = useToast();
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [importing, setImporting] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCandidates, setSelectedCandidates] = useState<StudentCandidate[]>([]);
  const [isTenant, setIsTenant] = useState(false);
  const [examType, setExamType] = useState<'UCE' | 'UACE'>('UCE');

  // Check authorization
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          toast({
            title: "Unauthorized",
            description: "You must be logged in",
            variant: "destructive",
          });
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, tenant_id, permissions')
          .eq('id', session.user.id)
          .single();

        if (!profile) return;

        const canImport = 
          profile.role === 'tenant_owner' || 
          profile.role === 'superadmin' ||
          (profile.permissions && (profile.permissions as any).exam_import_access === true);

        if (!canImport) {
          toast({
            title: "Unauthorized",
            description: "Only the school owner or authorized staff can import results.",
            variant: "destructive",
          });
          return;
        }

        setIsTenant(!!profile.tenant_id);
      } catch (error) {
        console.error('Error checking access:', error);
      }
    };

    checkAccess();
  }, [toast]);

  // Fetch exam sessions
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('exam_sessions')
          .select('*')
          .order('year', { ascending: false });

        if (error) throw error;
        setSessions(data || []);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
    };

    fetchSessions();
  }, []);

  // Fetch UNEB candidates (registered students)
  const { data: candidates = [], isLoading: loadingCandidates } = useQuery({
    queryKey: ['uneb-candidates-for-import', tenantId, examType],
    enabled: !!tenantId && currentStep >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uneb_candidate_registrations')
        .select(`
          id,
          student_id,
          index_number,
          exam_type,
          student:students(
            id,
            full_name,
            admission_number,
            class:school_classes!class_id(name)
          )
        `)
        .eq('tenant_id', tenantId!)
        .eq('exam_type', examType)
        .eq('registration_status', 'registered')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(c => ({
        ...c,
        selected: false,
        grades: {},
      })) as StudentCandidate[];
    },
  });

  // Filter candidates by search
  const filteredCandidates = useMemo(() => {
    if (!searchTerm) return candidates;
    const search = searchTerm.toLowerCase();
    return candidates.filter(c => 
      c.student?.full_name?.toLowerCase().includes(search) ||
      c.student?.admission_number?.toLowerCase().includes(search) ||
      c.index_number?.toLowerCase().includes(search)
    );
  }, [candidates, searchTerm]);

  const subjects = examType === 'UCE' ? UNEB_SUBJECTS_UCE : UNEB_SUBJECTS_UACE;

  const toggleCandidateSelection = (candidateId: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    const isCurrentlySelected = selectedCandidates.some(sc => sc.id === candidateId);
    
    if (isCurrentlySelected) {
      setSelectedCandidates(prev => prev.filter(sc => sc.id !== candidateId));
    } else {
      setSelectedCandidates(prev => [...prev, { ...candidate, grades: {} }]);
    }
  };

  const selectAllVisible = () => {
    const visibleIds = new Set(filteredCandidates.map(c => c.id));
    const newSelections = filteredCandidates.filter(
      c => !selectedCandidates.some(sc => sc.id === c.id)
    ).map(c => ({ ...c, grades: {} }));
    
    setSelectedCandidates(prev => [...prev, ...newSelections]);
  };

  const deselectAll = () => {
    setSelectedCandidates([]);
  };

  const updateGrade = (candidateId: string, subject: string, grade: string) => {
    setSelectedCandidates(prev => 
      prev.map(c => 
        c.id === candidateId 
          ? { ...c, grades: { ...c.grades, [subject]: grade } }
          : c
      )
    );
  };

  const handleImport = async () => {
    if (!selectedSession) {
      toast({
        title: "Required",
        description: "Please select an exam session",
        variant: "destructive",
      });
      return;
    }

    if (selectedCandidates.length === 0) {
      toast({
        title: "No Students Selected",
        description: "Please select at least one student to import results for",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single();

      if (!profile?.tenant_id) throw new Error("School not found");

      // Convert grades to subjects array format
      const resultsToInsert = selectedCandidates.map((candidate) => {
        const subjectsArray = Object.entries(candidate.grades)
          .filter(([_, grade]) => grade && grade !== '')
          .map(([name, grade]) => ({ name, grade }));

        return {
          index_number: candidate.index_number?.toUpperCase() || candidate.student?.admission_number?.toUpperCase(),
          exam_session_id: selectedSession,
          student_name: candidate.student?.full_name,
          school_name: candidate.student?.full_name,
          school_id: profile.tenant_id,
          subjects: subjectsArray,
          total_points: subjectsArray.length,
          aggregate_grade: 'Pending',
          result_status: 'published',
        };
      });

      const { data, error } = await supabase
        .from('exam_results')
        .insert(resultsToInsert)
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Imported ${data?.length || 0} exam results`,
      });

      // Reset form
      setSelectedCandidates([]);
      setSelectedSession("");
      setCurrentStep(1);
    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Could not import results",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  if (!isTenant) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Unauthorized</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You don't have permission to import exam results.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Import Exam Results</h1>
        <p className="text-muted-foreground mt-2">
          Add exam results for registered UNEB candidates from your school
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-4 mb-8">
        <div className={`flex-1 p-4 rounded-lg text-center font-semibold ${currentStep === 1 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          Step 1: Select Session
        </div>
        <div className={`flex-1 p-4 rounded-lg text-center font-semibold ${currentStep === 2 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          Step 2: Select Students
        </div>
        <div className={`flex-1 p-4 rounded-lg text-center font-semibold ${currentStep === 3 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          Step 3: Enter Results
        </div>
      </div>

      {/* Step 1: Select Session */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Exam Session & Type</CardTitle>
            <CardDescription>
              Choose which exam session and type these results belong to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="session">Exam Session *</Label>
                <Select value={selectedSession} onValueChange={setSelectedSession}>
                  <SelectTrigger id="session">
                    <SelectValue placeholder="Select exam session..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No exam sessions available
                      </SelectItem>
                    ) : (
                      sessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.year} {session.level} - {session.session_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Exam Type *</Label>
                <Select value={examType} onValueChange={(v) => setExamType(v as 'UCE' | 'UACE')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UCE">UCE (O-Level)</SelectItem>
                    <SelectItem value="UACE">UACE (A-Level)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {sessions.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No exam sessions available. Please create one in Exam Sessions first.
                </AlertDescription>
              </Alert>
            )}

            <Button 
              onClick={() => selectedSession && setCurrentStep(2)}
              disabled={!selectedSession}
              className="w-full"
            >
              Continue to Student Selection
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Students from UNEB Candidates */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Step 2: Select Students
            </CardTitle>
            <CardDescription>
              Select registered {examType} candidates to enter their results. 
              Only students who have been registered as UNEB candidates will appear here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and filters */}
            <div className="flex gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, admission no, or index no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="sm" onClick={selectAllVisible}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedCandidates.length} selected
              </Badge>
              <Badge variant="outline">
                {filteredCandidates.length} candidates found
              </Badge>
            </div>

            {loadingCandidates ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading registered candidates...
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center py-8">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No registered {examType} candidates found.</p>
                <p className="text-sm text-muted-foreground">
                  Students must be registered as UNEB candidates first.
                </p>
              </div>
            ) : (
              <div className="border rounded-lg max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Admission No.</TableHead>
                      <TableHead>Index No.</TableHead>
                      <TableHead>Class</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCandidates.map((candidate) => (
                      <TableRow 
                        key={candidate.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleCandidateSelection(candidate.id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedCandidates.some(sc => sc.id === candidate.id)}
                            onCheckedChange={() => toggleCandidateSelection(candidate.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {candidate.student?.full_name}
                        </TableCell>
                        <TableCell>{candidate.student?.admission_number}</TableCell>
                        <TableCell>
                          {candidate.index_number || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>{candidate.student?.class?.name || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex gap-2 justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                Back
              </Button>
              <Button 
                onClick={() => setCurrentStep(3)}
                disabled={selectedCandidates.length === 0}
              >
                Continue to Enter Results ({selectedCandidates.length} selected)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Enter Results */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Enter Results for Selected Students</CardTitle>
            <CardDescription>
              Enter grades for each subject. Scroll horizontally to see all subjects.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Student</TableHead>
                    <TableHead className="min-w-[100px]">Index No.</TableHead>
                    {subjects.map(subject => (
                      <TableHead key={subject} className="min-w-[100px] text-center">
                        {subject.length > 12 ? subject.substring(0, 12) + '...' : subject}
                      </TableHead>
                    ))}
                    <TableHead className="w-12">Remove</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCandidates.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell className="sticky left-0 bg-background z-10 font-medium">
                        {candidate.student?.full_name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {candidate.index_number || candidate.student?.admission_number}
                      </TableCell>
                      {subjects.map(subject => (
                        <TableCell key={subject}>
                          <Select 
                            value={candidate.grades[subject] || ''} 
                            onValueChange={(v) => updateGrade(candidate.id, subject, v)}
                          >
                            <SelectTrigger className="w-20">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="D1">D1</SelectItem>
                              <SelectItem value="D2">D2</SelectItem>
                              <SelectItem value="C3">C3</SelectItem>
                              <SelectItem value="C4">C4</SelectItem>
                              <SelectItem value="C5">C5</SelectItem>
                              <SelectItem value="C6">C6</SelectItem>
                              <SelectItem value="P7">P7</SelectItem>
                              <SelectItem value="P8">P8</SelectItem>
                              <SelectItem value="F9">F9</SelectItem>
                              <SelectItem value="X">X</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedCandidates(prev => 
                            prev.filter(c => c.id !== candidate.id)
                          )}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 justify-between pt-4">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                Back to Selection
              </Button>
              <Button 
                onClick={handleImport}
                disabled={importing || selectedCandidates.length === 0}
                className="min-w-[150px]"
              >
                {importing ? (
                  <>Importing...</>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import {selectedCandidates.length} Results
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImportExamResults;
