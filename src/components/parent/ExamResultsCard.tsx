import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, CheckCircle2, XCircle, AlertCircle, Loader } from "lucide-react";
import { toast } from "sonner";

interface ExamResult {
  id: string;
  index_number: string;
  student_name: string;
  exam_session_id: string;
  subjects: Record<string, string>;
  aggregate_grade: string;
  result_status: string;
  created_at: string;
  exam_sessions?: {
    session_name: string;
    year: number;
    level: string;
  };
}

interface ExamResultsCardProps {
  studentAdmissionNumber?: string;
  studentName?: string;
  indexNumber?: string;
}

/**
 * Exam Results Card Component
 * Displays exam results in an easy-to-read card format
 * Can be used in parent portal or student dashboard
 */
export const ExamResultsCard = ({
  studentAdmissionNumber,
  studentName,
  indexNumber,
}: ExamResultsCardProps) => {
  const [examResults, setExamResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);

  useEffect(() => {
    const loadExamResults = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from("exam_results")
          .select("*, exam_sessions(session_name, year, level)")
          .eq("result_status", "published");

        // Filter by index number if provided
        if (indexNumber) {
          query = query.eq("index_number", indexNumber);
        }

        // Filter by student name if provided
        if (studentName) {
          query = query.eq("student_name", studentName);
        }

        const { data, error: fetchError } = await query.order("created_at", {
          ascending: false,
        });

        if (fetchError) {
          throw fetchError;
        }

        // Cast data to handle Json type from Supabase
        const results = (data || []).map((item: any) => ({
          id: item.id,
          index_number: item.index_number,
          student_name: item.student_name,
          exam_session_id: item.exam_session_id,
          subjects: typeof item.subjects === 'string' ? JSON.parse(item.subjects) : (item.subjects || {}),
          aggregate_grade: item.aggregate_grade,
          result_status: item.result_status,
          created_at: item.created_at,
          exam_sessions: item.exam_sessions,
        })) as ExamResult[];

        setExamResults(results);

        if (!data || data.length === 0) {
          setError("No exam results available yet");
        }
      } catch (err) {
        console.error("Error loading exam results:", err);
        setError("Failed to load exam results");
      } finally {
        setLoading(false);
      }
    };

    loadExamResults();
  }, [indexNumber, studentName]);

  // Determine grade color
  const getGradeColor = (grade: string): string => {
    switch (grade?.toUpperCase()) {
      case "A":
        return "bg-green-100 text-green-800";
      case "B":
        return "bg-blue-100 text-blue-800";
      case "C":
        return "bg-yellow-100 text-yellow-800";
      case "D":
        return "bg-orange-100 text-orange-800";
      case "E":
        return "bg-red-100 text-red-800";
      case "O":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Determine aggregate division color
  const getDivisionColor = (division: string): string => {
    switch (division) {
      case "1":
        return "bg-green-50 border-green-200 text-green-800";
      case "2":
        return "bg-blue-50 border-blue-200 text-blue-800";
      case "3":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "4":
        return "bg-red-50 border-red-200 text-red-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Exam Results
          </CardTitle>
          <CardDescription>Loading exam results...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && examResults.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Exam Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle>Exam Results</CardTitle>
              <CardDescription>
                {examResults.length} result{examResults.length !== 1 ? "s" : ""} available
              </CardDescription>
            </div>
          </div>
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {examResults.map((result) => (
            <div
              key={result.id}
              className={`p-4 border rounded-lg cursor-pointer transition hover:bg-gray-50 ${getDivisionColor(
                result.aggregate_grade
              )}`}
              onClick={() =>
                setSelectedResult(selectedResult?.id === result.id ? null : result)
              }
            >
              {/* Header Row */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold">
                    {result.exam_sessions?.session_name || "Exam Session"}
                  </h3>
                  <p className="text-sm opacity-75">
                    {result.exam_sessions?.year} • {result.exam_sessions?.level}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold">Overall Grade</div>
                  <Badge className={`${getGradeColor(result.aggregate_grade)} text-lg px-3 py-1`}>
                    Division {result.aggregate_grade}
                  </Badge>
                </div>
              </div>

              {/* Index Number */}
              <div className="text-sm mb-2 pb-2 border-b">
                <span className="opacity-75">Index Number:</span>{" "}
                <span className="font-mono font-semibold">{result.index_number}</span>
              </div>

              {/* Expanded View - Subject Grades */}
              {selectedResult?.id === result.id && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-semibold mb-3 text-sm">Subject Results</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(result.subjects || {}).map(([subject, grade]) => (
                      <div
                        key={subject}
                        className="p-3 bg-white rounded border text-center"
                      >
                        <p className="text-xs opacity-75 mb-1 truncate">{subject}</p>
                        <Badge className={`${getGradeColor(grade)} text-base px-2 py-1`}>
                          {grade}
                        </Badge>
                      </div>
                    ))}
                  </div>

                  {/* Additional Info */}
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="opacity-75">Status</span>
                      <Badge variant="outline">
                        {result.result_status === "published" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />
                            Published
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {result.result_status}
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="opacity-75">Released</span>
                      <span>
                        {new Date(result.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                    onClick={() =>
                      window.open(`/exam-results/${result.id}`, "_blank")
                    }
                  >
                    View Full Certificate
                  </Button>
                </div>
              )}

              {/* Collapsed Summary */}
              {selectedResult?.id !== result.id && (
                <div className="text-xs opacity-75">
                  Click to view all {Object.keys(result.subjects || {}).length} subjects
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Info Banner */}
        {examResults.length > 0 && (
          <Alert className="mt-4 bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Click on any result to view detailed subject grades and certificates
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default ExamResultsCard;
