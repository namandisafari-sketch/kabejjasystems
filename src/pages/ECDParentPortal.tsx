import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, EyeOff, School, AlertCircle, Star, Heart, Sparkles, Sun, Cloud, Rainbow } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface VerifiedSchool {
  id: string;
  name: string;
  logo_url: string | null;
}

export default function ECDParentPortal() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verifiedSchool, setVerifiedSchool] = useState<VerifiedSchool | null>(null);
  const [schoolCodeError, setSchoolCodeError] = useState("");
  
  const [schoolCode, setSchoolCode] = useState("");
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");

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
          navigate("/ecd-parent/dashboard");
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
        .select("id, name, logo_url, business_type")
        .eq("parent_login_code", schoolCode.toUpperCase().trim())
        .eq("status", "active")
        .in("business_type", ["kindergarten", "ecd"])
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setSchoolCodeError("Invalid school code. Please check with your school.");
        setVerifiedSchool(null);
        return;
      }

      setVerifiedSchool({ id: data.id, name: data.name, logo_url: data.logo_url });
      toast.success(`Welcome to ${data.name}! 🎉`);
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

      toast.success("Welcome back! 🌟");
      navigate("/ecd-parent/dashboard");
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/ecd-parent/dashboard`,
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
        `Account created! 🎊 Please contact ${verifiedSchool.name} to link your little one to your account.`,
        { duration: 6000 }
      );
      
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-sky-50 relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <Sun className="absolute top-4 sm:top-8 right-6 sm:right-12 h-10 w-10 sm:h-16 sm:w-16 text-yellow-400 animate-pulse" />
        <Cloud className="absolute top-12 sm:top-20 left-8 sm:left-20 h-8 w-8 sm:h-12 sm:w-12 text-sky-300 opacity-70" />
        <Cloud className="absolute top-10 sm:top-16 left-1/3 h-6 w-6 sm:h-8 sm:w-8 text-sky-200 opacity-50" />
        <Star className="absolute top-20 sm:top-32 right-1/4 h-4 w-4 sm:h-6 sm:w-6 text-yellow-400 animate-pulse" />
        <Sparkles className="absolute bottom-28 sm:bottom-40 left-8 sm:left-16 h-6 w-6 sm:h-8 sm:w-8 text-pink-400 opacity-60" />
        <Heart className="absolute bottom-20 sm:bottom-32 right-10 sm:right-20 h-4 w-4 sm:h-6 sm:w-6 text-rose-400 opacity-50" />
        <Rainbow className="absolute -bottom-10 left-1/4 h-24 w-24 sm:h-32 sm:w-32 text-primary opacity-20 rotate-12" />
        
        {/* Colorful shapes */}
        <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 bg-gradient-to-tr from-pink-200/40 to-transparent rounded-full -translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-0 right-0 w-40 h-40 sm:w-64 sm:h-64 bg-gradient-to-bl from-sky-200/40 to-transparent rounded-full translate-x-1/2 -translate-y-1/2" />
        <div className="absolute top-1/2 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-r from-yellow-200/30 to-transparent rounded-full -translate-x-1/2" />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-3 sm:p-4">
        <div className="w-full max-w-md">
          {/* Header with playful design */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center relative">
              <div className="absolute -inset-3 sm:-inset-4 bg-gradient-to-r from-pink-400/20 via-yellow-400/20 to-sky-400/20 rounded-full blur-xl" />
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-pink-400 via-rose-400 to-orange-400 rounded-3xl shadow-lg flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <span className="text-3xl sm:text-4xl">👶</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-4 sm:mt-6 bg-gradient-to-r from-pink-600 via-rose-500 to-orange-500 bg-clip-text text-transparent">
              Little Ones Portal
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2 flex items-center justify-center gap-2">
              <Heart className="h-3 w-3 sm:h-4 sm:w-4 text-rose-400" />
              Track your child's learning journey
              <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400" />
            </p>
          </div>

          {/* School Code Verification */}
          {!verifiedSchool ? (
            <Card className="border-2 border-rose-100 shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center px-4 sm:px-6">
                <div className="mx-auto w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-sky-400 to-blue-500 rounded-2xl flex items-center justify-center mb-2 shadow-lg">
                  <School className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
                <CardTitle className="text-lg sm:text-xl">Enter School Code</CardTitle>
                <CardDescription className="text-sm">
                  Enter the special code from your child's school 🏫
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-4 sm:px-6">
                <div className="space-y-2">
                  <Label htmlFor="school-code" className="text-sm font-medium">School Code</Label>
                  <Input
                    id="school-code"
                    type="text"
                    placeholder="ABC123"
                    value={schoolCode}
                    onChange={(e) => {
                      setSchoolCode(e.target.value.toUpperCase());
                      setSchoolCodeError("");
                    }}
                    maxLength={6}
                    className="text-center text-lg sm:text-xl tracking-[0.3em] font-bold uppercase h-12 sm:h-14 border-2 border-rose-200 focus:border-rose-400 rounded-xl bg-rose-50/50"
                  />
                  {schoolCodeError && (
                    <Alert variant="destructive" className="mt-2 rounded-xl">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">{schoolCodeError}</AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <Button 
                  onClick={verifySchoolCode} 
                  className="w-full h-11 sm:h-12 text-base sm:text-lg rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg"
                  disabled={isVerifyingCode || !schoolCode.trim()}
                >
                  {isVerifyingCode ? (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                      Checking...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Let's Go! <Star className="h-4 w-4 sm:h-5 sm:w-5" />
                    </span>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Don't have a code? Ask your child's teacher! 👩‍🏫
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* School Info Banner */}
              <Card className="mb-3 sm:mb-4 border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
                <CardContent className="py-3 sm:py-4 px-3 sm:px-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      {verifiedSchool.logo_url ? (
                        <img 
                          src={verifiedSchool.logo_url} 
                          alt={verifiedSchool.name}
                          className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl object-cover shadow-md flex-shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md flex-shrink-0">
                          <span className="text-xl sm:text-2xl">🏫</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-sm sm:text-base text-green-800 truncate">{verifiedSchool.name}</p>
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Connected!
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetSchoolCode} className="text-green-700 hover:bg-green-100 flex-shrink-0 text-xs sm:text-sm">
                      Change
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Login/Signup Card */}
              <Card className="border-2 border-rose-100 shadow-xl bg-white/80 backdrop-blur-sm">
                <Tabs defaultValue="login">
                  <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
                    <TabsList className="grid w-full grid-cols-2 h-10 sm:h-12 rounded-xl bg-rose-100/50">
                      <TabsTrigger value="login" className="rounded-lg text-sm sm:text-base data-[state=active]:bg-white data-[state=active]:shadow-md">
                        Sign In 👋
                      </TabsTrigger>
                      <TabsTrigger value="signup" className="rounded-lg text-sm sm:text-base data-[state=active]:bg-white data-[state=active]:shadow-md">
                        Join Us ✨
                      </TabsTrigger>
                    </TabsList>
                  </CardHeader>

                  <CardContent className="px-4 sm:px-6">
                    <TabsContent value="login" className="mt-0">
                      <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email">Email</Label>
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="parent@email.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            required
                            className="h-12 rounded-xl border-2 border-rose-200 focus:border-rose-400"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="login-password">Password</Label>
                          <div className="relative">
                            <Input
                              id="login-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              required
                              className="h-12 rounded-xl border-2 border-rose-200 focus:border-rose-400"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full h-12 text-lg rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg" 
                          disabled={isLoading}
                        >
                          {isLoading ? "Signing in..." : "Sign In 🌟"}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="signup" className="mt-0">
                      <form onSubmit={handleSignup} className="space-y-3 sm:space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="signup-name" className="text-sm">Your Name</Label>
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="Mama Sarah / Dada John"
                            value={signupName}
                            onChange={(e) => setSignupName(e.target.value)}
                            required
                            className="h-11 sm:h-12 rounded-xl border-2 border-rose-200 focus:border-rose-400"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="signup-email" className="text-sm">Email</Label>
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="parent@email.com"
                            value={signupEmail}
                            onChange={(e) => setSignupEmail(e.target.value)}
                            required
                            className="h-11 sm:h-12 rounded-xl border-2 border-rose-200 focus:border-rose-400"
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
                            className="h-11 sm:h-12 rounded-xl border-2 border-rose-200 focus:border-rose-400"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="signup-password" className="text-sm">Create Password</Label>
                          <div className="relative">
                            <Input
                              id="signup-password"
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              value={signupPassword}
                              onChange={(e) => setSignupPassword(e.target.value)}
                              required
                              minLength={6}
                              className="h-11 sm:h-12 rounded-xl border-2 border-rose-200 focus:border-rose-400"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        <Button 
                          type="submit" 
                          className="w-full h-11 sm:h-12 text-base sm:text-lg rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg" 
                          disabled={isLoading}
                        >
                          {isLoading ? "Creating account..." : "Create Account 🎉"}
                        </Button>
                        
                        <p className="text-xs text-muted-foreground text-center">
                          After joining, tell the school to link your little one! 👶
                        </p>
                      </form>
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </>
          )}

          <p className="text-center text-xs sm:text-sm text-muted-foreground mt-4 sm:mt-6">
            <a href="/" className="hover:text-rose-500 transition-colors">← Back to main site</a>
          </p>
        </div>
      </div>
    </div>
  );
}
