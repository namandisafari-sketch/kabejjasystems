import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TennaHubLogo } from "@/components/TennaHubLogo";
import { GraduationCap, ArrowLeft, Loader2, CheckCircle, Lock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n";

interface StudentSession {
  studentId: string;
  tenantId: string;
  fullName: string;
  admissionNumber: string;
  className: string;
  schoolName: string;
}

export function getStudentSession(): StudentSession | null {
  const raw = sessionStorage.getItem("studentSession");
  return raw ? JSON.parse(raw) : null;
}

export function clearStudentSession() {
  sessionStorage.removeItem("studentSession");
}

export default function StudentLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [step, setStep] = useState<"school" | "login" | "success">("school");
  const [schoolCode, setSchoolCode] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    const existing = getStudentSession();
    if (existing) navigate("/student/dashboard", { replace: true });
  }, [navigate]);

  const handleSchoolCode = async () => {
    if (!schoolCode.trim()) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tenants")
      .select("id, name")
      .eq("business_code", schoolCode.trim().toUpperCase())
      .eq("status", "active")
      .single();

    if (error || !data) {
      toast({ variant: "destructive", title: t.pages.studentLogin.invalidSchoolCode });
      setLoading(false);
      return;
    }
    setSchoolName(data.name);
    setTenantId(data.id);
    sessionStorage.setItem("studentTenantId", data.id);
    sessionStorage.setItem("studentSchoolName", data.name);
    setStep("login");
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!admissionNumber.trim()) return;
    if (!password.trim()) return;
    setLoading(true);

    try {
      // Look up student by admission number
      const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, full_name, admission_number, user_id")
        .eq("admission_number", admissionNumber.trim())
        .eq("tenant_id", tenantId)
        .single();

      if (studentError || !student) {
        toast({
          variant: "destructive",
          title: "Student not found",
          description: `No student with admission number ${admissionNumber.trim()} found at ${schoolName}`,
        });
        setLoading(false);
        return;
      }

      setStudentName(student.full_name);

      // CHECK FOR ACTIVE DISCIPLINE CASES THAT BLOCK PORTAL ACCESS
      const { data: disciplineCases, error: disciplineError } = await supabase
        .from("student_discipline_cases")
        .select("id, case_number, offense_type, severity, description, incident_date, status")
        .eq("student_id", student.id)
        .eq("tenant_id", tenantId)
        .eq("is_active", true)
        .in("severity", ["high", "critical"]);

      if (!disciplineError && disciplineCases && disciplineCases.length > 0) {
        for (const dc of disciplineCases) {
          const { data: rule } = await supabase
            .from("school_discipline_rules")
            .select("blocks_portal_login")
            .eq("tenant_id", tenantId)
            .eq("severity", dc.severity)
            .eq("blocks_portal_login", true)
            .maybeSingle();
          if (rule) {
            setLoading(false);
            navigate(`/appeal-discipline/${dc.id}`, {
              state: {
                caseNumber: dc.case_number,
                studentId: student.id,
                blocked: true,
                schoolName,
              },
              replace: true,
            });
            return;
          }
        }
      }

      const virtualEmail = `${student.admission_number}@ttl.student`;

      // Ensure auth user exists for this virtual email
      const { error: createError } = await supabase.functions.invoke("create-student-auth", {
        body: {
          admissionNumber: student.admission_number,
          tenantId: tenantId,
          fullName: student.full_name,
          studentId: student.id,
        },
      });

      if (createError) {
        console.warn("Auth user creation warning:", createError);
      }

      // Sign in with virtual email
      const { data, error } = await supabase.auth.signInWithPassword({
        email: virtualEmail,
        password: password.trim(),
      });

      if (error) {
        if (error.message === "Invalid login credentials") {
          toast({
            variant: "destructive",
            title: "Wrong password",
            description: "Default password is: alwaystry!",
          });
        } else {
          toast({ variant: "destructive", title: "Login failed", description: error.message });
        }
        setLoading(false);
        return;
      }

      // Get student record with class info
      const { data: studentRecord, error: lookupError } = await supabase
        .from("students")
        .select("id, full_name, admission_number, school_classes(name)")
        .eq("user_id", data.user.id)
        .eq("tenant_id", tenantId)
        .single();

      if (lookupError || !studentRecord) {
        toast({ variant: "destructive", title: "Student record not found" });
        setLoading(false);
        return;
      }

      const sessionData: StudentSession = {
        studentId: studentRecord.id,
        tenantId: tenantId,
        fullName: studentRecord.full_name,
        admissionNumber: studentRecord.admission_number,
        className: (studentRecord as any).school_classes?.name || "",
        schoolName: schoolName,
      };

      sessionStorage.setItem("studentSession", JSON.stringify(sessionData));
      setStep("success");
      setLoading(false);
      setTimeout(() => navigate("/student/dashboard", { replace: true }), 1000);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="flex justify-center">
            <TennaHubLogo width={120} height={36} />
          </div>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <GraduationCap className="h-5 w-5" />
            <span className="text-sm font-medium">{t.pages.studentLogin.studentPortal}</span>
          </div>
          {step === "school" ? (
            <>
              <CardTitle className="text-xl">{t.pages.studentLogin.welcome}</CardTitle>
              <CardDescription>{t.pages.studentLogin.enterSchoolCode}</CardDescription>
            </>
          ) : step === "success" ? (
            <>
              <CardTitle className="text-xl text-green-600">Welcome back!</CardTitle>
              <CardDescription>Redirecting to dashboard...</CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-xl">{schoolName}</CardTitle>
              <CardDescription>Enter your admission number and password to login</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "school" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="code">{t.pages.studentLogin.schoolCodeLabel}</Label>
                <Input
                  id="code"
                  placeholder={t.pages.studentLogin.schoolCodePlaceholder}
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="text-center text-lg tracking-widest uppercase"
                  onKeyDown={(e) => e.key === "Enter" && handleSchoolCode()}
                />
              </div>
              <Button className="w-full" onClick={handleSchoolCode} disabled={loading || !schoolCode.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t.pages.studentLogin.continue}
              </Button>
            </>
          ) : step === "success" ? (
            <div className="text-center py-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="px-0" onClick={() => setStep("school")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> {t.pages.studentLogin.changeSchool}
              </Button>

              <div className="space-y-2">
                <Label htmlFor="admission">Admission Number</Label>
                <Input
                  id="admission"
                  placeholder="e.g., 670033"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>

              <Button className="w-full" onClick={handleLogin} disabled={loading || !admissionNumber || !password}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4 mr-2" />}
                {loading ? "Logging in..." : "Login"}
              </Button>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300">
                <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
                First time? Your default password is: <code className="font-mono font-bold">alwaystry!</code>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
