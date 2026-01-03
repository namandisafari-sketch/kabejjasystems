import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/hooks/use-database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { GraduationCap, Eye, EyeOff, School, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VerifiedSchool {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function ParentPortal() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verifiedSchool, setVerifiedSchool] = useState<VerifiedSchool | null>(null);
  const [schoolCodeError, setSchoolCodeError] = useState("");
  
  // School code state
  const [schoolCode, setSchoolCode] = useState("");
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");

  // Check if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: parent } = await supabase
          .from("parents")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (parent) {
          navigate("/parent/dashboard");
        }
      }
    };
    checkAuth();
  }, [navigate]);

  const verifySchoolCode = async () => {
    if (!schoolCode.trim()) {
      setSchoolCodeError("Please enter your school code");
      return;
    }

    setIsVerifyingCode(true);
    setSchoolCodeError("");

    try {
      const { data, error } = await (supabase
        .from("tenants") as any)
        .select("id, name, logo_url")
        .eq("parent_login_code", schoolCode.toUpperCase().trim())
        .eq("status", "active")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setSchoolCodeError("Invalid school code. Please check with your school.");
        setVerifiedSchool(null);
        return;
      }

      setVerifiedSchool({ id: data.id, name: data.name, logo_url: data.logo_url });
      toast.success(`Connected to ${data.name}`);
    } catch (error: any) {
      setSchoolCodeError(error.message || "Failed to verify school code");
      setVerifiedSchool(null);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verifiedSchool) {
      toast.error("Please verify your school code first");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      // Check if user is a parent for THIS school
      const { data: parent, error: parentError } = await supabase
        .from("parents")
        .select("id, tenant_id")
        .eq("user_id", data.user.id)
        .eq("tenant_id", verifiedSchool.id)
        .maybeSingle();

      if (parentError) throw parentError;

      if (!parent) {
        await supabase.auth.signOut();
        throw new Error(`No parent account found for ${verifiedSchool.name}. Please contact the school or check your school code.`);
      }

      toast.success("Welcome back!");
      navigate("/parent/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!verifiedSchool) {
      toast.error("Please verify your school code first");
      return;
    }

    setIsLoading(true);

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/parent/dashboard`,
          data: {
            full_name: signupName,
            phone: signupPhone,
            role: "parent",
            tenant_id: verifiedSchool.id,
          },
        },
      });

      if (authError) throw authError;

      toast.success(
        `Account created for ${verifiedSchool.name}! Please contact the school to link your child(ren) to your account.`,
        { duration: 6000 }
      );
      
      // Reset form
      setSignupEmail("");
      setSignupPassword("");
      setSignupName("");
      setSignupPhone("");
    } catch (error: any) {
      toast.error(error.message || "Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  const resetSchoolCode = () => {
    setVerifiedSchool(null);
    setSchoolCode("");
    setSchoolCodeError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary rounded-full mb-3 sm:mb-4">
            <GraduationCap className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">Parent Portal</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Monitor your child's attendance and school activities
          </p>
        </div>

        {/* School Code Verification */}
        {!verifiedSchool ? (
          <Card>
            <CardHeader className="px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <School className="h-4 w-4 sm:h-5 sm:w-5" />
                Enter School Code
              </CardTitle>
              <CardDescription className="text-sm">
                Enter the unique code provided by your school to access the parent portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-4 sm:px-6">
              <div className="space-y-2">
                <Label htmlFor="school-code">School Code</Label>
                <Input
                  id="school-code"
                  type="text"
                  placeholder="Enter 6-character code (e.g., ABC123)"
                  value={schoolCode}
                  onChange={(e) => {
                    setSchoolCode(e.target.value.toUpperCase());
                    setSchoolCodeError("");
                  }}
                  maxLength={6}
                  className="text-center text-base sm:text-lg tracking-widest font-mono uppercase h-11 sm:h-12"
                />
                {schoolCodeError && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{schoolCodeError}</AlertDescription>
                  </Alert>
                )}
              </div>
              
              <Button 
                onClick={verifySchoolCode} 
                className="w-full h-11 sm:h-12" 
                disabled={isVerifyingCode || !schoolCode.trim()}
              >
                {isVerifyingCode ? "Verifying..." : "Verify School Code"}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Don't have a code? Contact your school administration.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* School Info Banner */}
            <Card className="mb-3 sm:mb-4 border-primary bg-primary/5">
              <CardContent className="py-3 sm:py-4 px-3 sm:px-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {verifiedSchool.logo_url ? (
                      <img 
                        src={verifiedSchool.logo_url} 
                        alt={verifiedSchool.name}
                        className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <School className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">{verifiedSchool.name}</p>
                      <p className="text-xs text-muted-foreground">School verified</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetSchoolCode} className="flex-shrink-0 text-xs sm:text-sm">
                    Change
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Login/Signup Tabs */}
            <Card>
              <Tabs defaultValue="login">
                <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
                  <TabsList className="grid w-full grid-cols-2 h-10 sm:h-11">
                    <TabsTrigger value="login" className="text-sm">Login</TabsTrigger>
                    <TabsTrigger value="signup" className="text-sm">Sign Up</TabsTrigger>
                  </TabsList>
                </CardHeader>

                <CardContent className="px-4 sm:px-6">
                  <TabsContent value="login" className="mt-0">
                    <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-sm">Email</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="parent@example.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          required
                          className="h-11 sm:h-12"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="text-sm">Password</Label>
                        <div className="relative">
                          <Input
                            id="login-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            required
                            className="h-11 sm:h-12"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <Button type="submit" className="w-full h-11 sm:h-12" disabled={isLoading}>
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="mt-0">
                    <form onSubmit={handleSignup} className="space-y-3 sm:space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="text-sm">Full Name</Label>
                        <Input
                          id="signup-name"
                          type="text"
                          placeholder="John Doe"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          required
                          className="h-11 sm:h-12"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="text-sm">Email</Label>
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="parent@example.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          required
                          className="h-11 sm:h-12"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-phone" className="text-sm">Phone Number</Label>
                        <Input
                          id="signup-phone"
                          type="tel"
                          placeholder="+256 700 000 000"
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value)}
                          required
                          className="h-11 sm:h-12"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="text-sm">Password</Label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            required
                            minLength={6}
                            className="h-11 sm:h-12"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      <Button type="submit" className="w-full h-11 sm:h-12" disabled={isLoading}>
                        {isLoading ? "Creating account..." : "Create Account"}
                      </Button>
                      
                      <p className="text-xs text-muted-foreground text-center">
                        After signup, contact the school to link your child(ren) to your account.
                      </p>
                    </form>
                  </TabsContent>
                </CardContent>
              </Tabs>
            </Card>
          </>
        )}

        <p className="text-center text-xs sm:text-sm text-muted-foreground mt-4 sm:mt-6">
          <a href="/" className="hover:text-primary">← Back to main site</a>
        </p>
      </div>
    </div>
  );
}
