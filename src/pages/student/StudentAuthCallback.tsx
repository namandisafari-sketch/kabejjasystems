import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { TennaHubLogo } from "@/components/TennaHubLogo";
import { useToast } from "@/hooks/use-toast";
import DisciplineBlocked from "./DisciplineBlocked";
import { getStudentSession } from "../StudentLogin";

interface ActiveDisciplineCase {
  id: string;
  case_number: string;
  offense_type: string;
  severity: string;
  description: string;
  incident_date: string;
  status: string;
  student_id: string;
}

export default function StudentAuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [blockedCase, setBlockedCase] = useState<ActiveDisciplineCase | null>(null);
  const [schoolName, setSchoolName] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get tenant ID and school name from URL query params (these persist through email link)
        const urlParams = new URLSearchParams(window.location.search);
        let tenantId = urlParams.get('tenant') || sessionStorage.getItem("studentTenantId");
        let schoolName = urlParams.get('school') || sessionStorage.getItem("studentSchoolName") || "";

        console.log("URL params:", { tenant: urlParams.get('tenant'), school: urlParams.get('school') });
        console.log("Session storage:", { tenantId: sessionStorage.getItem("studentTenantId"), schoolName: sessionStorage.getItem("studentSchoolName") });

        if (!tenantId) {
          console.error("No tenant ID found in URL or sessionStorage");
          toast({ variant: "destructive", title: "School not verified", description: "Please start the login process again" });
          navigate("/student/login", { replace: true });
          return;
        }

        console.log("Tenant ID from URL:", tenantId);
        console.log("School name:", schoolName);
        setSchoolName(schoolName);

        // Wait for Supabase to process the OTP token from URL
        await new Promise(resolve => setTimeout(resolve, 1000));

        // First try to get the current user (works with OTP tokens in URL)
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        console.log("User check - user:", user?.id, "error:", userError);

        if (userError || !user) {
          console.error("Could not get user:", userError);
          
          // Try getting session as fallback
          const { data: { session } } = await supabase.auth.getSession();
          
          if (!session) {
            console.error("No session or user found");
            toast({ variant: "destructive", title: "Authentication failed", description: "Could not establish session" });
            navigate("/student/login", { replace: true });
            return;
          }
        }

        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser) {
          console.error("Could not retrieve user");
          toast({ variant: "destructive", title: "Authentication failed", description: "No user information available" });
          navigate("/student/login", { replace: true });
          return;
        }

        console.log("Current user ID:", currentUser.id);

        // Look up student by user_id and tenant_id
        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("id, full_name, admission_number, school_classes(name)")
          .eq("user_id", currentUser.id)
          .eq("tenant_id", tenantId)
          .single();

        if (studentError) {
          console.error("Student lookup error:", studentError);
          
          // Check if student exists with this user_id at all (maybe different tenant?)
          const { data: allStudents } = await supabase
            .from("students")
            .select("id, tenant_id, full_name")
            .eq("user_id", currentUser.id)
            .limit(5);
          
          console.log("Student records for this user:", allStudents);
          
          await supabase.auth.signOut();
          toast({ variant: "destructive", title: "Student record not found", description: "No student found for this account" });
          navigate("/student/login", { replace: true });
          return;
        }

        if (!student) {
          console.error("No student found for this user and tenant");
          await supabase.auth.signOut();
          toast({ variant: "destructive", title: "Student record not found" });
          navigate("/student/login", { replace: true });
          return;
        }

        console.log("Student found:", student.full_name);

        // CHECK FOR ACTIVE DISCIPLINE CASES THAT BLOCK PORTAL ACCESS
        const { data: disciplineCases, error: disciplineError } = await supabase
          .from("student_discipline_cases")
          .select("*")
          .eq("student_id", student.id)
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .in("severity", ["high", "critical"]);

        if (disciplineError) {
          console.error("Error checking discipline cases:", disciplineError);
        }

        // Check if any discipline rules block portal access for these cases
        if (disciplineCases && disciplineCases.length > 0) {
          for (const disciplineCase of disciplineCases) {
            const { data: rules } = await supabase
              .from("school_discipline_rules")
              .select("blocks_portal_login")
              .eq("tenant_id", tenantId)
              .eq("severity", disciplineCase.severity)
              .eq("blocks_portal_login", true)
              .maybeSingle();

            if (rules) {
              // Student has an active blocking discipline case
              console.log("Student has blocking discipline case");
              setBlockedCase(disciplineCase);
              setLoading(false);
              return;
            }
          }
        }

        // Create session - no blocking cases found
        const sessionData = {
          studentId: student.id,
          tenantId: tenantId,
          fullName: student.full_name,
          admissionNumber: student.admission_number,
          className: (student as any).school_classes?.name || "",
          schoolName: schoolName,
        };

        console.log("Creating student session:", sessionData);
        sessionStorage.setItem("studentSession", JSON.stringify(sessionData));
        navigate("/student/dashboard", { replace: true });
      } catch (error: any) {
        console.error("Callback error:", error);
        toast({ variant: "destructive", title: "Error", description: error.message });
        navigate("/student/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-3 pb-4">
            <div className="flex justify-center">
              <TennaHubLogo width={120} height={36} />
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <div className="text-center">
              <p className="font-semibold">Logging you in...</p>
              <p className="text-sm text-muted-foreground">Please wait</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show discipline blocked page if case exists
  if (blockedCase) {
    return (
      <DisciplineBlocked
        caseData={{
          caseId: blockedCase.id,
          caseNumber: blockedCase.case_number,
          offenseType: blockedCase.offense_type,
          severity: blockedCase.severity,
          description: blockedCase.description,
          incidentDate: blockedCase.incident_date,
          status: blockedCase.status,
          studentId: blockedCase.student_id,
          schoolName: schoolName,
        }}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="flex justify-center">
            <TennaHubLogo width={120} height={36} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-4 py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <div className="text-center">
            <p className="font-semibold">Setting up your session...</p>
            <p className="text-sm text-muted-foreground">Please wait</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
