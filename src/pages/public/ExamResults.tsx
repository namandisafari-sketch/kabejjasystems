import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, AlertCircle, Download, Share2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Subject {
  subject: string;
  grade: string;
  points: number;
}

interface ExamResult {
  id: string;
  index_number: string;
  student_name: string;
  school_name: string;
  subjects: Subject[];
  total_points: number;
  aggregate_grade: string;
  result_status: string;
  created_at: string;
}

const ExamResults = () => {
  const { resultId } = useParams<{ resultId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      if (!resultId) return;

      try {
        // Fetch result
        const { data: examResult, error } = await supabase
          .from('exam_results')
          .select('*')
          .eq('id', resultId)
          .eq('result_status', 'published')
          .single();

        if (error || !examResult) {
          toast({
            title: "Not Found",
            description: "Exam results not found",
            variant: "destructive",
          });
          navigate("/exam-results");
          return;
        }

        // Check if result is blocked by school
        const { data: blockData } = await supabase
          .from('exam_result_blocks')
          .select('*')
          .eq('exam_result_id', resultId)
          .or(
            `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`
          )
          .single();

        if (blockData) {
          setBlocked(true);
          setBlockReason(
            blockData.reason || "Access to this result has been restricted"
          );
          setResult({
            ...examResult,
            subjects: (examResult.subjects || []) as unknown as Subject[],
          });
          return;
        }

        setResult({
          ...examResult,
          subjects: (examResult.subjects || []) as unknown as Subject[],
        });
      } catch (error) {
        console.error('Error fetching results:', error);
        toast({
          title: "Error",
          description: "Could not load exam results",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [resultId, navigate, toast]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!result) return;

    const text = `Check out my UNEB exam results: ${result.student_name} - Aggregate: ${result.aggregate_grade}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My UNEB Exam Results",
          text,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Copied",
        description: "Link copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading Results...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please wait while we load your exam results...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/exam-results")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search
        </Button>
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Results Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              The exam results you're looking for could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (blocked) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/exam-results")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search
        </Button>

        <Card className="max-w-2xl mx-auto border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Access Restricted</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-2">Your exam results are currently blocked</p>
                <p className="text-sm">{blockReason}</p>
              </AlertDescription>
            </Alert>

            <div className="bg-white rounded-lg p-4 space-y-2">
              <p className="font-semibold text-gray-900">Student Information</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-600">Name:</p>
                  <p className="font-semibold">{result.student_name}</p>
                </div>
                <div>
                  <p className="text-gray-600">Index:</p>
                  <p className="font-semibold">{result.index_number}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-600">School:</p>
                  <p className="font-semibold">{result.school_name || "N/A"}</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Please contact your school for more information about this restriction.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const subjects = (result.subjects as Subject[]) || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <Button
          variant="ghost"
          onClick={() => navigate("/exam-results")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Search
        </Button>

        {/* Main Results Card */}
        <Card className="shadow-lg mb-6 print:shadow-none">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-t-lg">
            <CardTitle className="text-2xl">Exam Results</CardTitle>
            <CardDescription className="text-indigo-100">
              Official UNEB Examination Results
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            {/* Student Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 pb-8 border-b">
              <div>
                <p className="text-sm text-gray-600 font-semibold">Student Name</p>
                <p className="text-lg font-bold text-gray-900">{result.student_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">Index Number</p>
                <p className="text-lg font-bold text-gray-900">
                  {result.index_number}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 font-semibold">School</p>
                <p className="text-lg font-bold text-gray-900">
                  {result.school_name || "N/A"}
                </p>
              </div>
            </div>

            {/* Aggregate Result */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 mb-8">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600 font-semibold">
                    Aggregate Grade
                  </p>
                  <p className="text-4xl font-bold text-indigo-600">
                    {result.aggregate_grade}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 font-semibold">
                    Total Points
                  </p>
                  <p className="text-4xl font-bold text-gray-900">
                    {result.total_points}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600 font-semibold">
                    Subjects Taken
                  </p>
                  <p className="text-4xl font-bold text-blue-600">
                    {subjects.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Subjects Table */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Subject Results
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">
                        Subject
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        Grade
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        Points
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((subject, index) => (
                      <tr
                        key={index}
                        className={
                          index % 2 === 0 ? "bg-gray-50" : "bg-white"
                        }
                      >
                        <td className="py-3 px-4 text-gray-900 font-medium">
                          {subject.subject}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block bg-indigo-100 text-indigo-700 px-3 py-1 rounded font-semibold">
                            {subject.grade}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-gray-900 font-semibold">
                          {subject.points}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t print:hidden">
              <Button
                onClick={handlePrint}
                variant="outline"
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Print Results
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                className="flex-1"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="text-center text-sm text-gray-600 print:hidden space-y-3">
          <p>
            These are official UNEB examination results. For verification or
            clarification, contact the Uganda National Examinations Board.
          </p>
          <div className="text-xs bg-amber-50 border border-amber-200 rounded p-2 text-amber-900">
            <strong>Legal Disclaimer:</strong> This portal is a school management system, not an official UNEB service. 
            UNEB retains intellectual property rights over exam results and grading systems. 
            Schools are responsible for data accuracy, privacy, and compliance. 
            This system operates on behalf of schools only and is not affiliated with UNEB. 
            It is a legitimate educational technology tool, not a scam.
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamResults;
