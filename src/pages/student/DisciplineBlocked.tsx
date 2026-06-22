import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TennaHubLogo } from "@/components/TennaHubLogo";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DisciplineCaseProps {
  caseId: string;
  caseNumber: string;
  offenseType: string;
  severity: string;
  description: string;
  incidentDate: string;
  status: string;
  studentId: string;
  schoolName: string;
}

export default function DisciplineBlocked({ caseData }: { caseData: DisciplineCaseProps }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  const handleAppeal = () => {
    // Navigate to appeal page with case ID
    navigate(`/appeal-discipline/${caseData.caseId}`, {
      state: { caseNumber: caseData.caseNumber, studentId: caseData.studentId },
      replace: true,
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-50";
      case "high":
        return "text-orange-600 bg-orange-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      case "low":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const offenseTypeLabel = caseData.offenseType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl border-red-200">
        <CardHeader className="text-center space-y-3 pb-4 border-b-2 border-red-200">
          <div className="flex justify-center">
            <TennaHubLogo width={100} height={30} />
          </div>
          <div className="flex items-center justify-center gap-2 text-red-600">
            <AlertTriangle className="h-6 w-6" />
            <span className="text-lg font-semibold">Access Restricted</span>
          </div>
          <CardDescription className="text-base">
            {caseData.schoolName} Student Portal
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {/* Alert Box */}
          <Alert className="border-red-300 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Your account is currently unable to access the student portal due to an active discipline case.
            </AlertDescription>
          </Alert>

          {/* Case Details */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Case Number</p>
              <p className="font-mono font-semibold text-lg">{caseData.caseNumber}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Severity</p>
                <p className={`font-semibold px-2 py-1 rounded text-center ${getSeverityColor(caseData.severity)}`}>
                  {caseData.severity.toUpperCase()}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold capitalize text-center">{caseData.status}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Offense Type</p>
              <p className="font-semibold">{offenseTypeLabel}</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Incident Date</p>
              <p className="font-semibold">
                {new Date(caseData.incidentDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>

            {caseData.description && (
              <div className="space-y-2 border-t pt-3">
                <p className="text-sm text-muted-foreground">Details</p>
                <p className="text-sm leading-relaxed">{caseData.description}</p>
              </div>
            )}
          </div>

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg space-y-2">
            <p className="text-sm font-semibold text-blue-900">What happens now?</p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>You can submit an appeal to contest this decision</li>
              <li>Your appeal will be reviewed by school administration</li>
              <li>You'll be notified of the decision via email</li>
              <li>Portal access will be restored once your case is resolved</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            {caseData.status !== "appealed" && (
              <Button
                onClick={handleAppeal}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Submit an Appeal
              </Button>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/student/login", { replace: true })}
            >
              Back to Login
            </Button>
          </div>

          {/* Contact Information */}
          <div className="text-center text-xs text-muted-foreground pt-2 border-t">
            <p>If you believe this is an error or need assistance,</p>
            <p>please contact your school's disciplinary office.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
