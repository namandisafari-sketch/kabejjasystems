import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TennaHubLogo } from "@/components/TennaHubLogo";
import { GraduationCap, ArrowLeft, Loader2, Mail, CheckCircle } from "lucide-react";
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
  const [step, setStep] = useState<"school" | "login" | "link-sent">("school");
  const [schoolCode, setSchoolCode] = useState("");
  const [email, setEmail] = useState("");
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
      toast({ variant: "destructive", title: t.pages.studentLogin.invalidSchoolCode });
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
    if (!email) return;
    setLoading(true);
    const tenantId = sessionStorage.getItem("studentTenantId");

    try {
      // Send magic link
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/student/auth-callback`,
        },
      });

      if (error) {
        toast({ variant: "destructive", title: "Failed to send login link", description: error.message });
        setLoading(false);
        return;
      }

      // Show success message
      setStep("link-sent");
      setLoading(false);
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
          ) : (
            <>
              <CardTitle className="text-xl">{schoolName}</CardTitle>
              <CardDescription>{t.pages.studentLogin.signInWithAccount}</CardDescription>
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
          ) : step === "link-sent" ? (
            <>
              <div className="text-center space-y-4">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Login link sent!</h3>
                  <p className="text-sm text-muted-foreground">
                    We've sent a secure login link to:
                  </p>
                  <p className="font-mono text-sm bg-muted px-3 py-2 rounded">{email}</p>
                  <p className="text-xs text-muted-foreground">
                    Check your email and click the link to login. The link expires in 24 hours.
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => {
                  setStep("login");
                  setEmail("");
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" /> Try another email
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="px-0" onClick={() => setStep("school")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> {t.pages.studentLogin.changeSchool}
              </Button>
              <div className="space-y-2">
                <Label htmlFor="email">{t.pages.studentLogin.emailLabel}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g., 670033@ttl.student"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your student email address to receive a secure login link
                </p>
              </div>
              <Button className="w-full" onClick={handleLogin} disabled={loading || !email}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                {loading ? "Sending..." : "Send Login Link"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
