import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { TennaHubLogo } from "@/components/TennaHubLogo";
import { useToast } from "@/hooks/use-toast";
import { getStudentSession } from "./StudentLogin";

export default function StudentAuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from URL hash
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session) {
          toast({ variant: "destructive", title: "Authentication failed" });
          navigate("/student/login", { replace: true });
          return;
        }

        // Get student record
        const tenantId = sessionStorage.getItem("studentTenantId");
        if (!tenantId) {
          toast({ variant: "destructive", title: "School not verified" });
          navigate("/student/login", { replace: true });
          return;
        }

        const { data: student, error: studentError } = await supabase
          .from("students")
          .select("id, full_name, admission_number, school_classes(name)")
          .eq("user_id", data.session.user.id)
          .eq("tenant_id", tenantId)
          .single();

        if (studentError || !student) {
          await supabase.auth.signOut();
          toast({ variant: "destructive", title: "Student record not found" });
          navigate("/student/login", { replace: true });
          return;
        }

        // Create session
        const session = {
          studentId: student.id,
          tenantId: tenantId,
          fullName: student.full_name,
          admissionNumber: student.admission_number,
          className: (student as any).school_classes?.name || "",
          schoolName: sessionStorage.getItem("studentSchoolName") || "",
        };

        sessionStorage.setItem("studentSession", JSON.stringify(session));
        navigate("/student/dashboard", { replace: true });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: error.message });
        navigate("/student/login", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
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
