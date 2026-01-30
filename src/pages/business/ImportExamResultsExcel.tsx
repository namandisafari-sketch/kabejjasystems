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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload,
  AlertCircle,
  CheckCircle,
  Trash2,
  Plus,
  Download,
  ArrowRight,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ExcelImportHelper,
  ColumnMappingUI,
  ValidationResultsUI,
  DataPreviewUI,
  type ColumnMapping,
  type ValidationError,
  type ParsedRow,
} from "./ExcelImportHelper";

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

const SYSTEM_FIELDS = [
  "indexNumber",
  "studentName",
  "englishLanguage",
  "mathematics",
  "physics",
  "chemistry",
  "biology",
  "aggregateGrade",
];

const REQUIRED_FIELDS = [
  "indexNumber",
  "studentName",
  "englishLanguage",
  "mathematics",
  "physics",
  "chemistry",
  "biology",
  "aggregateGrade",
];

export const ImportExamResultsExcel = () => {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // Excel import state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<string[][]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    []
  );

  // UI state
  const [importTab, setImportTab] = useState<"manual" | "excel">("excel");
  const [excelStep, setExcelStep] = useState<1 | 2 | 3 | 4>(1); // 1=Upload, 2=Map, 3=Validate, 4=Review
  const [isTenant, setIsTenant] = useState(false);

  // Manual entry state
  const [manualStudents, setManualStudents] = useState<StudentResult[]>([
    {
      id: "1",
      indexNumber: "",
      studentName: "",
      englishLanguage: "",
      mathematics: "",
      physics: "",
      chemistry: "",
      biology: "",
      aggregateGrade: "",
    },
  ]);

  // Check authorization
  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("role, tenant_id, permissions")
          .eq("id", session.user.id)
          .single();

        if (!profile) return;

        const hasAccess =
          profile.role === "tenant_owner" ||
          profile.permissions?.exam_import_access;

        setIsTenant(hasAccess);
        if (!hasAccess) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to import exam results",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };

    checkAccess();
  }, []);

  // Load exam sessions
  useEffect(() => {
    const loadSessions = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("exam_sessions")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        setSessions(data || []);
      } catch (error) {
        console.error("Error loading sessions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, []);

  // Handle Excel file upload
  const handleExcelUpload = async (file: File) => {
    try {
      setExcelFile(file);
      const { headers, rows } = await ExcelImportHelper.readExcelFile(file);

      setExcelHeaders(headers);
      setExcelRows(rows);
      setExcelStep(2);

      toast({
        title: "Success",
        description: `Loaded ${rows.length} rows from Excel file`,
      });
    } catch (error) {
      toast({
        title: "Error Reading File",
        description: String(error),
        variant: "destructive",
      });
    }
  };

  // Handle column mapping
  const handleMappingChange = (mapping: ColumnMapping) => {
    setColumnMapping(mapping);
  };

  // Validate and proceed to review
  const handleValidateExcel = () => {
    if (Object.keys(columnMapping).length === 0) {
      toast({
        title: "Missing Mapping",
        description: "Please map at least one column",
        variant: "destructive",
      });
      return;
    }

    const { parsed, errors, validCount } = ExcelImportHelper.parseRows(
      excelRows,
      columnMapping,
      REQUIRED_FIELDS
    );

    setParsedRows(parsed);
    setValidationErrors(errors);

    if (validCount === 0) {
      toast({
        title: "No Valid Rows",
        description: "All rows have errors. Please check the data.",
        variant: "destructive",
      });
      return;
    }

    setExcelStep(3);
  };

  // Import valid rows
  const handleImportExcel = async () => {
    if (!selectedSession) {
      toast({
        title: "Select Session",
        description: "Please select an exam session first",
        variant: "destructive",
      });
      return;
    }

    const validRows = parsedRows.filter((r) => r._isValid);

    if (validRows.length === 0) {
      toast({
        title: "No Valid Data",
        description: "No valid rows to import",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    try {
      // Transform parsed rows to exam results
      const examResults = validRows.map((row) => ({
        exam_session_id: selectedSession,
        index_number: row.indexNumber,
        student_name: row.studentName,
        school_name: "", // Could be added to mapping
        school_id: "", // Could be from tenant
        subjects: {
          "English Language": row.englishLanguage,
          Mathematics: row.mathematics,
          Physics: row.physics,
          Chemistry: row.chemistry,
          Biology: row.biology,
        },
        aggregate_grade: row.aggregateGrade,
        result_status: "published",
        created_at: new Date().toISOString(),
      }));

      // Batch insert
      const { error } = await supabase
        .from("exam_results")
        .insert(examResults);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: `Imported ${validRows.length} exam results`,
      });

      // Reset
      setExcelStep(1);
      setExcelFile(null);
      setExcelHeaders([]);
      setExcelRows([]);
      setColumnMapping({});
      setParsedRows([]);
      setValidationErrors([]);
    } catch (error) {
      toast({
        title: "Import Failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  // Download template
  const handleDownloadTemplate = () => {
    try {
      const template = ExcelImportHelper.generateTemplate(SYSTEM_FIELDS);
      const blob = new Blob([template], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "exam-results-template.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate template",
        variant: "destructive",
      });
    }
  };

  // Manual entry handlers
  const addManualRow = () => {
    setManualStudents([
      ...manualStudents,
      {
        id: String(Date.now()),
        indexNumber: "",
        studentName: "",
        englishLanguage: "",
        mathematics: "",
        physics: "",
        chemistry: "",
        biology: "",
        aggregateGrade: "",
      },
    ]);
  };

  const deleteManualRow = (id: string) => {
    setManualStudents(manualStudents.filter((s) => s.id !== id));
  };

  const updateManualStudent = (
    id: string,
    field: keyof StudentResult,
    value: string
  ) => {
    setManualStudents(
      manualStudents.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      )
    );
  };

  if (!isTenant) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          You don't have permission to import exam results
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Import Exam Results</h1>
        <p className="text-gray-600">
          Upload exam results from Excel or enter them manually
        </p>
      </div>

      {/* Session selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Exam Session</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="session">Exam Session</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger id="session">
                  <SelectValue placeholder="Choose session..." />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.session_name} ({s.year}) - {s.level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import method tabs */}
      <Tabs value={importTab} onValueChange={(v) => setImportTab(v as any)}>
        <TabsList>
          <TabsTrigger value="excel">📊 Excel Import</TabsTrigger>
          <TabsTrigger value="manual">✏️ Manual Entry</TabsTrigger>
        </TabsList>

        {/* Excel Import Tab */}
        <TabsContent value="excel" className="space-y-6">
          {excelStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Excel File</CardTitle>
                <CardDescription>
                  Import exam results from an Excel spreadsheet. Supports different column
                  layouts and organizations.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <label className="mt-4 block cursor-pointer">
                    <span className="text-sm font-medium">
                      Click to select file or drag and drop
                    </span>
                    <Input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          handleExcelUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>

                <Button onClick={handleDownloadTemplate} variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Different schools can organize data differently. Our system will detect and
                    handle various column layouts automatically.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {excelStep === 2 && excelHeaders.length > 0 && (
            <div className="space-y-4">
              <ColumnMappingUI
                excelHeaders={excelHeaders}
                systemFields={SYSTEM_FIELDS}
                onMappingChange={handleMappingChange}
                onAutoDetect={() =>
                  toast({
                    title: "Auto-Detected",
                    description: "Columns detected automatically",
                  })
                }
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setExcelStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleValidateExcel}
                  className="flex-1"
                  disabled={Object.keys(columnMapping).length === 0}
                >
                  Validate Data <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {excelStep === 3 && parsedRows.length > 0 && (
            <div className="space-y-4">
              <ValidationResultsUI
                errors={validationErrors}
                validCount={parsedRows.filter((r) => r._isValid).length}
                totalCount={parsedRows.length}
                onRetry={() => setExcelStep(2)}
              />

              <DataPreviewUI
                parsedRows={parsedRows}
                systemFields={SYSTEM_FIELDS}
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setExcelStep(2)}
                  className="flex-1"
                  disabled={importing}
                >
                  Back
                </Button>
                <Button
                  onClick={handleImportExcel}
                  className="flex-1"
                  disabled={importing}
                  loading={importing}
                >
                  {importing ? "Importing..." : "Import Valid Rows"}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manual Data Entry</CardTitle>
              <CardDescription>
                Enter exam results row by row
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Index #</TableHead>
                      <TableHead>Name</TableHead>
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
                    {manualStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Input
                            value={student.indexNumber}
                            onChange={(e) =>
                              updateManualStudent(
                                student.id,
                                "indexNumber",
                                e.target.value
                              )
                            }
                            placeholder="U0000/001"
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={student.studentName}
                            onChange={(e) =>
                              updateManualStudent(
                                student.id,
                                "studentName",
                                e.target.value
                              )
                            }
                            placeholder="Name"
                            className="w-32"
                          />
                        </TableCell>
                        {[
                          "englishLanguage",
                          "mathematics",
                          "physics",
                          "chemistry",
                          "biology",
                        ].map((field) => (
                          <TableCell key={field}>
                            <Select
                              value={
                                student[field as keyof StudentResult] || ""
                              }
                              onValueChange={(value) =>
                                updateManualStudent(
                                  student.id,
                                  field as keyof StudentResult,
                                  value
                                )
                              }
                            >
                              <SelectTrigger className="w-16">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["A", "B", "C", "D", "E"].map((g) => (
                                  <SelectItem key={g} value={g}>
                                    {g}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        ))}
                        <TableCell>
                          <Select
                            value={student.aggregateGrade || ""}
                            onValueChange={(value) =>
                              updateManualStudent(
                                student.id,
                                "aggregateGrade",
                                value
                              )
                            }
                          >
                            <SelectTrigger className="w-16">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {["1", "2", "3", "4"].map((g) => (
                                <SelectItem key={g} value={g}>
                                  {g}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteManualRow(student.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button onClick={addManualRow} variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Row
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImportExamResultsExcel;
