import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Search, Award } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ExamSession {
  id: string;
  year: number;
  level: string;
  session_name: string;
  results_released_date: string;
}

const ExamResultsLookup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  
  const [formData, setFormData] = useState({
    indexNumber: "",
    examSessionId: "",
  });

  // Fetch available exam sessions on mount
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data, error } = await supabase
          .from('exam_sessions')
          .select('*')
          .eq('is_active', true)
          .order('year', { ascending: false })
          .order('session_name', { ascending: false });

        if (error) throw error;
        setExamSessions(data || []);
      } catch (error) {
        console.error('Error fetching exam sessions:', error);
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.indexNumber.trim()) {
      toast({
        title: "Required",
        description: "Please enter your index number",
        variant: "destructive",
      });
      return;
    }

    if (!formData.examSessionId) {
      toast({
        title: "Required",
        description: "Please select an exam year/session",
        variant: "destructive",
      });
      return;
    }

    setSearching(true);

    try {
      // Check if result exists
      const { data: result, error } = await supabase
        .from('exam_results')
        .select('id')
        .eq('index_number', formData.indexNumber.toUpperCase())
        .eq('exam_session_id', formData.examSessionId)
        .eq('result_status', 'published')
        .single();

      if (error || !result) {
        toast({
          title: "Not Found",
          description: "No exam results found for this index number and year",
          variant: "destructive",
        });
        setSearching(false);
        return;
      }

      // Log access
      await supabase
        .from('exam_access_logs')
        .insert({
          index_number: formData.indexNumber.toUpperCase(),
          exam_session_id: formData.examSessionId,
          access_status: 'success',
          ip_address: 'client', // Would be obtained from backend in production
          user_agent: navigator.userAgent,
        });

      // Navigate to results page
      navigate(`/exam-results/${result.id}`, {
        state: {
          indexNumber: formData.indexNumber.toUpperCase(),
          sessionId: formData.examSessionId,
        },
      });
    } catch (error: any) {
      console.error('Search error:', error);
      toast({
        title: "Error",
        description: "An error occurred while searching for results",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please wait while we load exam sessions...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Award className="h-12 w-12 text-indigo-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            UNEB Exam Results
          </h1>
          <p className="text-gray-600">
            Check your exam performance from the Uganda National Examinations Board
          </p>
        </div>

        {/* Info Alert */}
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            Enter your index number and select the exam year to view your results
          </AlertDescription>
        </Alert>

        {/* Legal Disclaimer */}
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-amber-900 text-xs">
            <strong>Legal Notice:</strong> This portal is a school management system, NOT an official UNEB service. 
            UNEB retains all intellectual property rights to exam results and grading systems. 
            Schools are responsible for data accuracy and student privacy. This system operates on behalf of schools, 
            not as part of UNEB. It is not a scam—it's a legitimate educational technology tool used by authorized schools.
          </AlertDescription>
        </Alert>

        {/* Search Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Search Your Results</CardTitle>
            <CardDescription>
              Available exams: {examSessions.length}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSearch} className="space-y-6">
              {/* Index Number */}
              <div className="space-y-2">
                <Label htmlFor="indexNumber" className="text-base font-medium">
                  Index Number *
                </Label>
                <Input
                  id="indexNumber"
                  placeholder="e.g., S001234"
                  value={formData.indexNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      indexNumber: e.target.value.toUpperCase(),
                    })
                  }
                  className="text-lg h-11"
                  disabled={searching}
                />
                <p className="text-xs text-muted-foreground">
                  Your UNEB index number from your admission letter
                </p>
              </div>

              {/* Exam Session */}
              <div className="space-y-2">
                <Label htmlFor="session" className="text-base font-medium">
                  Exam Year & Level *
                </Label>
                <Select
                  value={formData.examSessionId}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      examSessionId: value,
                    })
                  }
                  disabled={searching}
                >
                  <SelectTrigger id="session" className="h-11 text-base">
                    <SelectValue placeholder="Select an exam session..." />
                  </SelectTrigger>
                  <SelectContent>
                    {examSessions.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No exam sessions available
                      </SelectItem>
                    ) : (
                      examSessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.year} {session.level} - {session.session_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={searching || examSessions.length === 0}
                className="w-full h-11 text-base bg-indigo-600 hover:bg-indigo-700"
              >
                {searching ? (
                  <>
                    <Search className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search Results
                  </>
                )}
              </Button>
            </form>

            {/* Info Section */}
            <div className="mt-8 pt-8 border-t space-y-4">
              <h3 className="font-semibold text-gray-900">Need Help?</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="mr-3 text-indigo-600 font-bold">•</span>
                  <span>
                    Your index number is printed on your UNEB admission letter
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 text-indigo-600 font-bold">•</span>
                  <span>
                    Results are released on official UNEB announcement dates
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-3 text-indigo-600 font-bold">•</span>
                  <span>
                    Contact your school if you cannot find your results
                  </span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            <strong>Note:</strong> This is <em>not</em> an official UNEB portal. It is a school 
            management service by TennaHub that displays results uploaded by your school.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExamResultsLookup;
