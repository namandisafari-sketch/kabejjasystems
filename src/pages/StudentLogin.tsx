import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TennaHubLogo } from "@/components/TennaHubLogo";
import { GraduationCap, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [step, setStep] = useState<"school" | "login">("school");
  const [schoolCode, setSchoolCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [schoolName, setSchoolName] = useState("");

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
      toast({ variant: "destructive", title: "Invalid school code" });
      setLoading(false);
      return;
    }
    setSchoolName(data.name);
    sessionStorage.setItem("studentTenantId", data.id);
    sessionStorage.setItem("studentSchoolName", data.name);
    setStep("login");
    setLoading(false);
  };

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true);
    const tenantId = sessionStorage.getItem("studentTenantId");

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !authData.user) {
      toast({ variant: "destructive", title: "Invalid email or password" });
      setLoading(false);
      return;
    }

    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, full_name, admission_number, school_classes!inner(name)")
      .eq("user_id", authData.user.id)
      .eq("tenant_id", tenantId)
      .single();

    if (studentError || !student) {
      await supabase.auth.signOut();
      toast({ variant: "destructive", title: "No student record found for this account" });
      setLoading(false);
      return;
    }

    const session: StudentSession = {
      studentId: student.id,
      tenantId: tenantId!,
      fullName: student.full_name,
      admissionNumber: student.admission_number,
      className: (student as any).school_classes?.name || "",
      schoolName: sessionStorage.getItem("studentSchoolName") || "",
    };
    sessionStorage.setItem("studentSession", JSON.stringify(session));
    setLoading(false);
    navigate("/student/dashboard", { replace: true });
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
            <span className="text-sm font-medium">Student Portal</span>
          </div>
          {step === "school" ? (
            <>
              <CardTitle className="text-xl">Welcome</CardTitle>
              <CardDescription>Enter your school code to continue</CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-xl">{schoolName}</CardTitle>
              <CardDescription>Sign in with your student account</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "school" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="code">School Code</Label>
                <Input
                  id="code"
                  placeholder="e.g. KAB001"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="text-center text-lg tracking-widest uppercase"
                  onKeyDown={(e) => e.key === "Enter" && handleSchoolCode()}
                />
              </div>
              <Button className="w-full" onClick={handleSchoolCode} disabled={loading || !schoolCode.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="px-0" onClick={() => setStep("school")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Change school
              </Button>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
              <Button className="w-full" onClick={handleLogin} disabled={loading || !email || !password}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
