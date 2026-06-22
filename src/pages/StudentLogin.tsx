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
import { sendStudentLoginEmail } from "@/lib/email-service";

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
   const [input, setInput] = useState(""); // Can be admission number or email
   const [loading, setLoading] = useState(false);
   const [schoolName, setSchoolName] = useState("");
   const [tenantId, setTenantId] = useState("");
   const [sentToEmail, setSentToEmail] = useState("");

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
      if (!input.trim()) return;
      setLoading(true);

      try {
        let emailToUse = input.trim();
        let studentName = "";
        
        // Check if input is an admission number (digits only) or email
        const isAdmissionNumber = /^\d+$/.test(input.trim());

         if (isAdmissionNumber) {
           // Look up student by admission number to get email
           const { data: student, error: studentError } = await supabase
             .from("students")
             .select("id, full_name, admission_number, notification_email, parent_email")
             .eq("admission_number", input.trim())
             .eq("tenant_id", tenantId)
             .single();

           if (studentError || !student) {
             toast({ 
               variant: "destructive", 
               title: "Student not found", 
               description: `No student with admission number ${input.trim()} found` 
             });
             setLoading(false);
             return;
           }

           studentName = student.full_name;

           // Prefer notification_email (student's personal email), fallback to parent_email
           if (student.notification_email) {
             emailToUse = student.notification_email;
           } else if (student.parent_email) {
             emailToUse = student.parent_email;
           } else {
             toast({ 
               variant: "destructive", 
               title: "No email on file", 
               description: `Student ${student.full_name} has no email address registered` 
             });
             setLoading(false);
             return;
           }
        } else if (!emailToUse.includes("@")) {
          toast({ 
            variant: "destructive", 
            title: "Invalid input", 
            description: "Enter either an admission number or a valid email address" 
          });
          setLoading(false);
          return;
        }

        // Send magic link via Supabase Auth
        // Include tenant as URL param so it persists through email click
         const { error } = await supabase.auth.signInWithOtp({
           email: emailToUse,
           options: {
             emailRedirectTo: `${window.location.origin}/student/auth-callback?tenant=${encodeURIComponent(tenantId)}&school=${encodeURIComponent(schoolName)}`,
             data: {
               tenantId: tenantId,
               schoolName: schoolName,
             }
           },
         });

        if (error) {
          toast({ variant: "destructive", title: "Failed to send login link", description: error.message });
          setLoading(false);
          return;
        }

        // Send branded email via Resend (fire and forget, don't block on this)
        if (studentName) {
          sendStudentLoginEmail(
            emailToUse,
            studentName,
            schoolName,
            `${window.location.origin}/student/auth-callback?tenant=${encodeURIComponent(tenantId)}&school=${encodeURIComponent(schoolName)}`
          ).catch((err) => {
            console.error("Failed to send branded email via Resend:", err);
            // Don't show error to user - OTP was already sent
          });
        }

        // Show success message
        setSentToEmail(emailToUse);
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
                   <p className="font-mono text-sm bg-muted px-3 py-2 rounded">{sentToEmail}</p>
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
                   setInput("");
                   setSentToEmail("");
                 }}
               >
                 <ArrowLeft className="h-4 w-4 mr-2" /> Try another account
               </Button>
             </>
           ) : (
             <>
               <Button variant="ghost" size="sm" className="px-0" onClick={() => setStep("school")}>
                 <ArrowLeft className="h-4 w-4 mr-1" /> {t.pages.studentLogin.changeSchool}
               </Button>
                <div className="space-y-2">
                  <Label htmlFor="input">Admission Number or Email</Label>
                  <Input
                    id="input"
                    placeholder="e.g., 670033 or namandisafari@gmail.com"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your admission number to get a magic link sent to your registered email
                  </p>
                </div>
               <Button className="w-full" onClick={handleLogin} disabled={loading || !input}>
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
