import { useState, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, AlertCircle, CheckCircle, Trash2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ExamSession {
  id: string;
  year: number;
  level: string;
  session_name: string;
}

interface StudentResult {
  id: string;
  indexNumber: string;
  studentName: string;
  englishLanguage: string;
  mathematics: string;
  physics: string;
  chemistry: string;
  biology: string;
  aggregateGrade: string;
}

const UNEB_SUBJECTS = [
  "English Language",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Geography",
  "Christian Religious Education",
  "Luganda",
  "Art & Design",
  "Agriculture",
  "Political Education",
];

const ImportExamResults = () => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [students, setStudents] = useState<StudentResult[]>([
    { id: "1", indexNumber: "", studentName: "", englishLanguage: "", mathematics: "", physics: "", chemistry: "", biology: "", aggregateGrade: "" }
  ]);
  const [isTenant, setIsTenant] = useState(false);

  // Check authorization
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Session error:', sessionError);
          toast({
            title: "Authentication Error",
            description: "Failed to get session: " + sessionError.message,
            variant: "destructive",
          });
          return;
        }

        if (!session) {
          toast({
            title: "Unauthorized",
            description: "You must be logged in",
            variant: "destructive",
          });
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, tenant_id, permissions')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          toast({
            title: "Database Error",
            description: "Failed to load profile: " + profileError.message + ". Please try refreshing the page.",
            variant: "destructive",
          });
          return;
        }

        if (!profile) {
          console.error('Profile not found for user:', session.user.id);
          toast({
            title: "Profile Not Found",
            description: "Your profile does not exist. Please contact support.",
            variant: "destructive",
          });
          return;
        }

        console.log('User profile loaded:', { role: profile.role, hasPermission: profile.permissions?.exam_import_access });

        // Allow if: tenant_owner, superadmin, or granted exam_import permission
        const canImport = 
          profile.role === 'tenant_owner' || 
          profile.role === 'superadmin' ||
          (profile.permissions && profile.permissions.exam_import_access === true);

        if (!canImport) {
          toast({
            title: "Unauthorized",
            description: "Only the school owner or authorized staff can import results. Ask your school owner to grant you access.",
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
        toast({
          title: "Error",
          description: "Could not load exam sessions",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [toast]);

  const addStudent = () => {
    const newId = Math.max(...students.map(s => parseInt(s.id)), 0) + 1;
    setStudents([...students, { 
      id: newId.toString(), 
      indexNumber: "", 
      studentName: "", 
      englishLanguage: "", 
      mathematics: "", 
      physics: "", 
      chemistry: "", 
      biology: "", 
      aggregateGrade: "" 
    }]);
  };

  const removeStudent = (id: string) => {
    if (students.length === 1) {
      toast({
        title: "Cannot remove",
        description: "You must have at least one student",
        variant: "destructive",
      });
      return;
    }
    setStudents(students.filter(s => s.id !== id));
  };

  const updateStudent = (id: string, field: keyof StudentResult, value: string) => {
    setStudents(students.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleImport = async () => {
    // Validate
    const emptyFields = students.filter(s => !s.indexNumber || !s.studentName);
    if (emptyFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in Index Number and Student Name for all students`,
        variant: "destructive",
      });
      return;
    }

    if (!selectedSession) {
      toast({
        title: "Required",
        description: "Please select an exam session",
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
      const resultsToInsert = students.map((result) => {
        // Build subjects array with entered grades
        const subjectsArray = [];
        if (result.englishLanguage) {
          subjectsArray.push({ name: "English Language", grade: result.englishLanguage });
        }
        if (result.mathematics) {
          subjectsArray.push({ name: "Mathematics", grade: result.mathematics });
        }
        if (result.physics) {
          subjectsArray.push({ name: "Physics", grade: result.physics });
        }
        if (result.chemistry) {
          subjectsArray.push({ name: "Chemistry", grade: result.chemistry });
        }
        if (result.biology) {
          subjectsArray.push({ name: "Biology", grade: result.biology });
        }

        return {
          index_number: result.indexNumber.toUpperCase(),
          exam_session_id: selectedSession,
          student_name: result.studentName,
          school_name: result.studentName, // Using student name as placeholder
          school_id: profile.tenant_id,
          subjects: subjectsArray,
          total_points: subjectsArray.length,
          aggregate_grade: result.aggregateGrade || "Ungraded",
          result_status: 'published',
        };
      });

      // Insert results
      const { data, error } = await supabase
        .from('exam_results')
        .insert(resultsToInsert)
        .select();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Imported ${data?.length || 0} exam results`,
      });

      // Clear form and reset to step 1
      setStudents([{ id: "1", indexNumber: "", studentName: "", englishLanguage: "", mathematics: "", physics: "", chemistry: "", biology: "", aggregateGrade: "" }]);
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
            <p className="text-gray-600">
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
        <h1 className="text-3xl font-bold text-gray-900">Import Exam Results</h1>
        <p className="text-gray-600 mt-2">
          Add student exam results easily using our simple table form
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-4 mb-8">
        <div className={`flex-1 p-4 rounded-lg text-center font-semibold ${currentStep === 1 ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-600"}`}>
          Step 1: Select Session
        </div>
        <div className={`flex-1 p-4 rounded-lg text-center font-semibold ${currentStep === 2 ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-600"}`}>
          Step 2: Enter Results
        </div>
        <div className={`flex-1 p-4 rounded-lg text-center font-semibold ${currentStep === 3 ? "bg-blue-100 text-blue-900" : "bg-gray-100 text-gray-600"}`}>
          Step 3: Review & Import
        </div>
      </div>

      {/* Step 1: Select Session */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Select Exam Session</CardTitle>
            <CardDescription>
              Choose which exam session these results belong to
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
              {sessions.length === 0 && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No exam sessions available. Superadmin needs to create sessions first.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Button 
              onClick={() => selectedSession && setCurrentStep(2)}
              disabled={!selectedSession}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              Continue to Results Entry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Enter Results */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Enter Student Results</CardTitle>
            <CardDescription>
              Fill in the exam results for your students. You can add more rows as needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Index Number*</TableHead>
                    <TableHead>Student Name*</TableHead>
                    <TableHead>English</TableHead>
                    <TableHead>Math</TableHead>
                    <TableHead>Physics</TableHead>
                    <TableHead>Chemistry</TableHead>
                    <TableHead>Biology</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <Input
                          placeholder="e.g., U0000/001"
                          value={student.indexNumber}
                          onChange={(e) => updateStudent(student.id, "indexNumber", e.target.value)}
                          className="text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="e.g., John Doe"
                          value={student.studentName}
                          onChange={(e) => updateStudent(student.id, "studentName", e.target.value)}
                          className="text-xs"
                        />
                      </TableCell>
                      <TableCell>
                        <Select value={student.englishLanguage} onValueChange={(v) => updateStudent(student.id, "englishLanguage", v)}>
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Grade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                            <SelectItem value="E">E</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={student.mathematics} onValueChange={(v) => updateStudent(student.id, "mathematics", v)}>
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Grade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                            <SelectItem value="E">E</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={student.physics} onValueChange={(v) => updateStudent(student.id, "physics", v)}>
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Grade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                            <SelectItem value="E">E</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={student.chemistry} onValueChange={(v) => updateStudent(student.id, "chemistry", v)}>
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Grade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                            <SelectItem value="E">E</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={student.biology} onValueChange={(v) => updateStudent(student.id, "biology", v)}>
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Grade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                            <SelectItem value="E">E</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={student.aggregateGrade} onValueChange={(v) => updateStudent(student.id, "aggregateGrade", v)}>
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Grade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                            <SelectItem value="E">E</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeStudent(student.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Button
              onClick={addStudent}
              variant="outline"
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Student
            </Button>

            <div className="flex gap-4 pt-4">
              <Button 
                onClick={() => setCurrentStep(1)}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={() => setCurrentStep(3)}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Review & Import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Import */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Review Results</CardTitle>
              <CardDescription>
                Review the data before importing. Make sure all information is correct.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Index Number</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>English</TableHead>
                      <TableHead>Math</TableHead>
                      <TableHead>Physics</TableHead>
                      <TableHead>Chemistry</TableHead>
                      <TableHead>Biology</TableHead>
                      <TableHead>Aggregate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-semibold">{student.indexNumber}</TableCell>
                        <TableCell>{student.studentName}</TableCell>
                        <TableCell>{student.englishLanguage || "-"}</TableCell>
                        <TableCell>{student.mathematics || "-"}</TableCell>
                        <TableCell>{student.physics || "-"}</TableCell>
                        <TableCell>{student.chemistry || "-"}</TableCell>
                        <TableCell>{student.biology || "-"}</TableCell>
                        <TableCell>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                            {student.aggregateGrade || "-"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="bg-green-50 border border-green-200 rounded p-4 mb-6">
                <div className="flex gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900">Ready to import</p>
                    <p className="text-sm text-green-700">
                      {students.length} student(s) will be imported to the {sessions.find(s => s.id === selectedSession)?.year} {sessions.find(s => s.id === selectedSession)?.level} exam session
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button 
                  onClick={() => setCurrentStep(2)}
                  variant="outline"
                  className="flex-1"
                >
                  Back to Edit
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={importing}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {importing ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import Results
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ImportExamResults;
