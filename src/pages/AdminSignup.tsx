import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Shield, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AdminSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string>("");
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    inviteToken: searchParams.get('token') || "",
  });

  // Validate invite token on mount
  useEffect(() => {
    const validateToken = async () => {
      setValidating(true);
      try {
        const token = searchParams.get('token');
        
        // Check if signup is enabled
        const signupEnabled = import.meta.env.VITE_ADMIN_SIGNUP_ENABLED === 'true';
        
        if (!signupEnabled && !token) {
          setError("Platform admin signup is currently disabled. Please use an invitation link.");
          setIsAuthorized(false);
          return;
        }
        
        if (token) {
          // Validate token with backend
          const { data, error } = await supabase
            .from('admin_invitations')
            .select('*')
            .eq('token', token)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single();
          
          if (error || !data) {
            setError("Invalid, expired, or already-used invitation token.");
            setIsAuthorized(false);
            return;
          }
          
          setFormData(prev => ({
            ...prev,
            email: data.email || "",
          }));
          setIsAuthorized(true);
        } else if (signupEnabled) {
          // Signup is enabled without token
          setIsAuthorized(true);
        } else {
          setError("Admin signup requires a valid invitation token.");
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error('Token validation error:', err);
        setError("Error validating invitation. Please try again.");
        setIsAuthorized(false);
      } finally {
        setValidating(false);
      }
    };
    
    validateToken();
  }, [searchParams]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthorized) {
      toast({
        title: "Unauthorized",
        description: "You are not authorized to create an admin account.",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password.length < 8) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 8 characters",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const token = searchParams.get('token');
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.fullName,
          },
        },
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error("User creation failed");
      
      // Create profile as superadmin with no tenant
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          tenant_id: null,
          role: 'superadmin',
          full_name: formData.fullName,
        });
      
      if (profileError) throw profileError;

      // Add superadmin role to user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'superadmin',
        });
      
      if (roleError) throw roleError;
      
      // Mark invitation as used if token exists
      if (token) {
        await supabase
          .from('admin_invitations')
          .update({ used: true, used_by: authData.user.id, used_at: new Date().toISOString() })
          .eq('token', token);
      }
      
      toast({
        title: "Admin Account Created!",
        description: "You can now log in as a platform administrator",
      });
      
      navigate("/login");
      
    } catch (error: any) {
      console.error('Admin signup error:', error);
      toast({
        title: "Signup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while validating
  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Validating Invitation...</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Please wait while we verify your access...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show error if not authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to home
          </Link>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">Access Denied</CardTitle>
            </CardHeader>
            
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error || "You are not authorized to access this page."}</AlertDescription>
              </Alert>
              
              <p className="text-sm text-muted-foreground mt-4 mb-4">
                Admin account creation is restricted. If you believe you should have access, please contact the platform administrator with your invitation token.
              </p>
              
              <Button onClick={() => navigate("/")} className="w-full">
                Return Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to home
        </Link>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-6 w-6 text-accent" />
              <CardTitle className="text-3xl">Platform Admin</CardTitle>
            </div>
            <CardDescription>Create a platform administrator account</CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  placeholder="Admin Name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Re-enter password"
                  required
                />
              </div>
              
              <Button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent/90">
                {loading ? "Creating..." : "Create Admin Account"}
              </Button>
              
              <p className="text-sm text-muted-foreground text-center">
                Business owner?{" "}
                <Link to="/signup" className="text-accent hover:underline">
                  Sign up here
                </Link>
              </p>
              
              <p className="text-sm text-muted-foreground text-center">
                Already have an account?{" "}
                <Link to="/login" className="text-accent hover:underline">
                  Login
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSignup;
