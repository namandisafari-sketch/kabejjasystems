import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight, Eye, EyeOff, School, Building2, Mail, CheckCircle2,
  Loader2, AlertCircle, Phone, User, KeyRound, MapPin, Gift,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthLayout } from "@/components/auth/AuthLayout";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type Step = "account" | "school" | "verify" | "success";

interface SignupData {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  schoolName: string;
  schoolAddress: string;
  referralCode: string;
}

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("account");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>();

  const [form, setForm] = useState<SignupData>({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    schoolName: "",
    schoolAddress: "",
    referralCode: "",
  });

  const [errors, setErrors] = useState<Partial<SignupData>>({});

  const updateField = (field: keyof SignupData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateAccount = useCallback((): boolean => {
    const e: Partial<SignupData> = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email format";
    if (!form.password) e.password = "Password is required";
    else if (form.password.length < 6) e.password = "Password must be at least 6 characters";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const validateSchool = useCallback((): boolean => {
    const e: Partial<SignupData> = {};
    if (!form.schoolName.trim()) e.schoolName = "School name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  const goToSchool = () => {
    if (validateAccount()) {
      setErrors({});
      setStep("school");
    }
  };

  const sendOTP = async () => {
    setLoading(true);
    setOtpError("");
    try {
      const { error } = await supabase.functions.invoke("send-signup-otp", {
        body: {
          email: form.email.toLowerCase().trim(),
          signupData: {
            fullName: form.fullName.trim(),
            schoolName: form.schoolName.trim(),
            phone: form.phone.trim(),
            schoolAddress: form.schoolAddress.trim() || null,
            businessType: "school",
            referralCode: form.referralCode.trim() || null,
          },
        },
      });

      if (error) {
        const msg = typeof error === "object" ? (error as any)?.error || error.message : error;
        setOtpError(msg);
        return;
      }

      setOtpSent(true);
      setStep("verify");
      startResendCooldown();
      toast({ title: "Code sent!", description: "Check your email for the verification code." });
    } catch (err: any) {
      setOtpError(err.message || "Failed to send verification code");
    } finally {
      setLoading(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    await sendOTP();
  };

  const verifyOTP = async () => {
    if (otpValue.length !== 6) {
      setOtpError("Please enter the complete 6-digit code");
      return;
    }
    setLoading(true);
    setOtpError("");
    try {
      const { data: signupResult, error } = await supabase.functions.invoke("verify-signup-otp", {
        body: {
          email: form.email.toLowerCase().trim(),
          otp: otpValue,
          password: form.password,
        },
      });

      if (error) {
        const msg = typeof error === "object" ? (error as any)?.error || error.message : error;
        setOtpError(msg);
        return;
      }

      setStep("success");
      toast({
        title: "Account created!",
        description: "Welcome to TennaHub. You can now sign in.",
      });
    } catch (err: any) {
      setOtpError(err.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderAccountStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="fullName"
            value={form.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            placeholder="e.g. John Mukasa"
            className="h-12 pl-10 touch-target"
            autoComplete="name"
          />
        </div>
        {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="you@school.com"
            className="h-12 pl-10 touch-target"
            autoComplete="email"
          />
        </div>
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
            placeholder="Min. 6 characters"
            className="h-12 pl-10 pr-12 touch-target"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={(e) => updateField("phone", e.target.value)}
            placeholder="e.g. +256 700 000000"
            className="h-12 pl-10 touch-target"
            autoComplete="tel"
          />
        </div>
        {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
      </div>

      <Button onClick={goToSchool} className="w-full h-12 btn-press text-base font-medium touch-target">
        Continue
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  const renderSchoolStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="schoolName">School Name</Label>
        <div className="relative">
          <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="schoolName"
            value={form.schoolName}
            onChange={(e) => updateField("schoolName", e.target.value)}
            placeholder="e.g. St. Mary's Secondary School"
            className="h-12 pl-10 touch-target"
          />
        </div>
        {errors.schoolName && <p className="text-xs text-destructive">{errors.schoolName}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="schoolAddress">School Address (optional)</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="schoolAddress"
            value={form.schoolAddress}
            onChange={(e) => updateField("schoolAddress", e.target.value)}
            placeholder="e.g. Kampala, Uganda"
            className="h-12 pl-10 touch-target"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="referralCode">Referral Code (optional)</Label>
        <div className="relative">
          <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="referralCode"
            value={form.referralCode}
            onChange={(e) => updateField("referralCode", e.target.value)}
            placeholder="Enter referral code if you have one"
            className="h-12 pl-10 touch-target"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep("account")}
          className="h-12 touch-target"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => {
            if (validateSchool()) {
              setErrors({});
              sendOTP();
            }
          }}
          disabled={loading}
          className="flex-1 h-12 btn-press text-base font-medium touch-target"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending code...
            </>
          ) : (
            <>
              Send Verification Code
              <Mail className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );

  const renderVerifyStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Mail className="h-12 w-12 text-primary mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to
        </p>
        <p className="font-medium text-foreground">{form.email}</p>
      </div>

      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={otpValue}
          onChange={(val) => {
            setOtpValue(val);
            setOtpError("");
          }}
          onComplete={() => verifyOTP()}
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      {otpError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">{otpError}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={verifyOTP}
        disabled={loading || otpValue.length !== 6}
        className="w-full h-12 btn-press text-base font-medium touch-target"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            Verify & Create Account
            <CheckCircle2 className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Didn't receive the code?
        </p>
        <Button
          variant="link"
          onClick={handleResend}
          disabled={resendCooldown > 0 || loading}
          className="h-auto p-0 text-sm"
        >
          {resendCooldown > 0
            ? `Resend in ${resendCooldown}s`
            : "Resend code"}
        </Button>
      </div>

      <div className="text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep("school")}
          className="text-xs text-muted-foreground"
        >
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back to school details
        </Button>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6 py-4">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
      </div>
      <div>
        <h3 className="text-xl font-semibold">School Registered!</h3>
        <p className="text-sm text-muted-foreground mt-2">
          <strong>{form.schoolName}</strong> has been created. You're on a 14-day free trial.
        </p>
      </div>
      <div className="bg-muted/50 rounded-lg p-4 text-left text-sm space-y-1">
        <p><span className="text-muted-foreground">Email:</span> {form.email}</p>
        <p><span className="text-muted-foreground">Name:</span> {form.fullName}</p>
        <p><span className="text-muted-foreground">School:</span> {form.schoolName}</p>
      </div>
      <Button
        onClick={() => navigate("/login")}
        className="w-full h-12 btn-press text-base font-medium touch-target"
      >
        Sign In to Your School
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );

  const wizardSteps = [
    { id: "account", label: "Account Details", icon: <User className="h-5 w-5" /> },
    { id: "school", label: "School Information", icon: <School className="h-5 w-5" /> },
    { id: "verify", label: "Email Verification", icon: <Mail className="h-5 w-5" /> },
    { id: "success", label: "Complete", icon: <CheckCircle2 className="h-5 w-5" /> },
  ];

  const stepTitles: Record<Step, string> = {
    account: "Create Your School",
    school: "School Details",
    verify: "Verify Email",
    success: "All Set!",
  };
  const stepSubtitles: Record<Step, string> = {
    account: "Register your school on TennaHub",
    school: "Tell us about your school",
    verify: "Enter the 6-digit code sent to your email",
    success: "Your school is ready to go",
  };

  return (
    <AuthLayout
      title="Get Started"
      subtitle="Create your school account in just a few steps."
      steps={wizardSteps}
      currentStep={step}
      backTo={{ label: "Back to home", to: "/" }}
    >
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="text-center pb-4 pt-0 px-0">
          <CardTitle className="text-2xl">{stepTitles[step]}</CardTitle>
          <CardDescription>{stepSubtitles[step]}</CardDescription>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          {step === "account" && renderAccountStep()}
          {step === "school" && renderSchoolStep()}
          {step === "verify" && renderVerifyStep()}
          {step === "success" && renderSuccessStep()}

          {step !== "success" && (
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
};

export default Signup;
