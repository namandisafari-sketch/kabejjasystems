import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Eye, EyeOff, Building2, AlertCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Alert, AlertDescription } from "@/components/ui/alert";
import kabejjaLogo from "@/assets/kabejja-logo.png";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessCode, setBusinessCode] = useState("");
  const [showBusinessCode, setShowBusinessCode] = useState(false);
  const [businessCodeError, setBusinessCodeError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setBusinessCodeError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Fetch user profile with tenant information
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      // Check if user is admin/superadmin - they don't need business code
      if (profile?.role === 'superadmin' || profile?.role === 'admin') {
        toast({
          title: "Welcome back!",
          description: "You've successfully logged in as admin",
        });
        navigate('/admin');
        return;
      }

      // Check if user is tenant owner - they don't need business code
      if (profile?.role === 'tenant_owner') {
        toast({
          title: "Welcome back!",
          description: "You've successfully logged in",
        });
        navigate('/dashboard');
        return;
      }

      // For staff members, verify business code
      if (profile?.tenant_id) {
        // Staff must provide business code
        if (!businessCode.trim()) {
          // Show business code field
          setShowBusinessCode(true);
          setBusinessCodeError("Staff members must enter their school/business code to login");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Verify business code matches the tenant
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('id, business_code, name')
          .eq('id', profile.tenant_id)
          .single();

        if (tenantError || !tenant) {
          throw new Error("Could not verify your organization");
        }

        // Check if business code matches
        if (tenant.business_code?.toLowerCase() !== businessCode.trim().toLowerCase()) {
          setBusinessCodeError(`Invalid school code. Please check with your administrator.`);
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Success - staff logged in with correct business code
        toast({
          title: "Welcome back!",
          description: `Logged in to ${tenant.name}`,
        });
        navigate('/dashboard');
        return;
      }

      // Fallback for users without tenant - redirect to dashboard
      toast({
        title: "Welcome back!",
        description: "You've successfully logged in",
      });
      navigate('/dashboard');

    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col safe-top safe-bottom">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors touch-target"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to home</span>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-up">
          <Card className="card-elevated border-0 shadow-elevated">
            <CardHeader className="text-center pb-4 pt-6">
              <div className="flex justify-center mb-4">
                <img src={kabejjaLogo} alt="Kabejja Systems" className="h-16 w-auto" />
              </div>
              <CardTitle className="text-2xl">Welcome Back</CardTitle>
              <CardDescription>Sign in to your account</CardDescription>
            </CardHeader>
            
            <CardContent className="pb-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    autoComplete="email"
                    className="h-12 touch-target"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="h-12 touch-target pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors touch-target"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                {/* Business/School Code Field - Only visible when staff mode enabled */}
                {showBusinessCode && (
                  <div className="space-y-2">
                    <Label htmlFor="businessCode" className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      School/Business Code
                    </Label>
                    <Input
                      id="businessCode"
                      type="text"
                      value={businessCode}
                      onChange={(e) => {
                        setBusinessCode(e.target.value.toUpperCase());
                        setBusinessCodeError("");
                      }}
                      placeholder="e.g. STMARYS or ABC123"
                      autoComplete="organization"
                      className={`h-12 touch-target uppercase ${businessCodeError ? 'border-destructive' : ''}`}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your school/business code to continue.
                    </p>
                  </div>
                )}

                {businessCodeError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {businessCodeError}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Staff login toggle - only show when not already in staff mode */}
                {!showBusinessCode && (
                  <button
                    type="button"
                    onClick={() => setShowBusinessCode(true)}
                    className="w-full text-sm text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-2"
                  >
                    <Building2 className="h-4 w-4" />
                    Staff Portal Login
                  </button>
                )}

                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full h-12 touch-target btn-press text-base font-medium"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-primary font-medium hover:underline">
                    Sign up
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Login;
