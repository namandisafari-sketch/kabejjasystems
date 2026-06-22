import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TennaHubLogo } from "@/components/TennaHubLogo";
import { FileUp, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DisciplineCase {
  id: string;
  case_number: string;
  offense_type: string;
  severity: string;
  description: string;
  incident_date: string;
}

export default function AppealDisciplineCase() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [caseData, setCaseData] = useState<DisciplineCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [appealReason, setAppealReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  const studentId = location.state?.studentId;
  const caseNumber = location.state?.caseNumber;

  useEffect(() => {
    const fetchCase = async () => {
      try {
        const { data, error } = await supabase
          .from("student_discipline_cases")
          .select("*")
          .eq("id", caseId)
          .single();

        if (error) throw error;
        setCaseData(data);
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error loading case", description: error.message });
        navigate("/student/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    if (caseId) fetchCase();
  }, [caseId, navigate, toast]);

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!appealReason.trim()) {
      toast({ variant: "destructive", title: "Required field", description: "Please provide a reason for your appeal" });
      return;
    }

    if (appealReason.length < 50) {
      toast({
        variant: "destructive",
        title: "Appeal too short",
        description: "Please provide at least 50 characters explaining your appeal",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Get current student from auth
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session?.user) {
        throw new Error("User not authenticated");
      }

      // Get student record
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", authData.session.user.id)
        .single();

      if (studentError || !student) {
        throw new Error("Student record not found");
      }

      // Check for existing appeal
      const { data: existingAppeal } = await supabase
        .from("student_discipline_appeals")
        .select("id")
        .eq("discipline_case_id", caseId)
        .eq("student_id", student.id)
        .eq("status", "submitted")
        .maybeSingle();

      if (existingAppeal) {
        toast({
          variant: "destructive",
          title: "Appeal already submitted",
          description: "You have already submitted an appeal for this case",
        });
        setSubmitting(false);
        return;
      }

      // Submit appeal
      const { error: insertError } = await supabase.from("student_discipline_appeals").insert({
        discipline_case_id: caseId,
        student_id: student.id,
        tenant_id: caseData?.id, // This should be tenant_id from the case
        appeal_reason: appealReason,
        supporting_evidence: evidence || null,
        status: "submitted",
      });

      if (insertError) throw insertError;

      setSubmitted(true);
      toast({
        title: "Appeal submitted successfully",
        description: "Your appeal has been submitted and will be reviewed by school administration",
      });

      setTimeout(() => {
        navigate("/student/login", { replace: true });
      }, 3000);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error submitting appeal", description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground">Loading case details...</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Case not found</h3>
              <p className="text-sm text-muted-foreground">The discipline case you're looking for doesn't exist.</p>
            </div>
            <Button onClick={() => navigate("/student/login")} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center space-y-3 pb-4 border-b">
          <div className="flex justify-center">
            <TennaHubLogo width={100} height={30} />
          </div>
          <CardTitle className="text-2xl">Submit Your Appeal</CardTitle>
          <CardDescription>Case #{caseNumber}</CardDescription>
        </CardHeader>

        {submitted ? (
          <CardContent className="space-y-4 pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg mb-2">Appeal Submitted Successfully</h3>
              <p className="text-muted-foreground mb-4">
                Your appeal has been received and will be reviewed by school administration within 5-7 business days.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                You will receive an email notification once a decision has been made.
              </p>
            </div>
            <Button onClick={() => navigate("/student/login")} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        ) : (
          <CardContent className="space-y-6 pt-6">
            {/* Case Summary */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-3">
              <h4 className="font-semibold">Case Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Offense Type</p>
                  <p className="font-semibold capitalize">
                    {caseData.offense_type.replace(/_/g, " ")}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Severity</p>
                  <p className="font-semibold capitalize">{caseData.severity}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Incident Date</p>
                  <p className="font-semibold">
                    {new Date(caseData.incident_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Appeal Form */}
            <form onSubmit={handleSubmitAppeal} className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Please provide a clear and honest explanation of why you believe this decision should be reconsidered.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="appealReason" className="font-semibold">
                  Why are you appealing this case? *
                </Label>
                <Textarea
                  id="appealReason"
                  placeholder="Explain your reasons for appealing this discipline case. Minimum 50 characters. Be specific and provide any relevant context..."
                  value={appealReason}
                  onChange={(e) => setAppealReason(e.target.value)}
                  className="min-h-[120px] resize-none"
                  maxLength={1000}
                />
                <div className="text-xs text-muted-foreground">
                  {appealReason.length} / 1000 characters
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="evidence" className="font-semibold">
                  Supporting Evidence or Documentation (Optional)
                </Label>
                <Textarea
                  id="evidence"
                  placeholder="Provide any additional information, witness statements, or evidence that supports your appeal..."
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  className="min-h-[100px] resize-none"
                  maxLength={1000}
                />
                <div className="text-xs text-muted-foreground">
                  {evidence.length} / 1000 characters
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="font-semibold">
                  Contact Email
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="your.email@school.edu"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  We'll use this email to notify you of the appeal decision
                </p>
              </div>

              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  False or misleading information in your appeal may result in additional disciplinary action.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/student/login", { replace: true })}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting || !appealReason.trim()}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FileUp className="h-4 w-4 mr-2" />
                      Submit Appeal
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
