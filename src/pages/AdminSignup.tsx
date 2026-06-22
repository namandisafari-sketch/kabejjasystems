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
import { useLanguage } from "@/i18n";

const AdminSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
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
          setError(t.pages.adminSignup.disabledSignup);
          setIsAuthorized(false);
          return;
        }
        
        if (token) {
          // Validate token with backend
          const { data, error } = await (supabase
            .from('admin_invitations' as any)
            .select('*')
            .eq('token', token)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single() as any);
          
          if (error || !data) {
            setError(t.pages.adminSignup.invalidToken);
            setIsAuthorized(false);
            return;
          }
          
          setFormData(prev => ({
            ...prev,
            email: (data as any).email || "",
          }));
          setIsAuthorized(true);
        } else if (signupEnabled) {
          // Signup is enabled without token
          setIsAuthorized(true);
        } else {
          setError(t.pages.adminSignup.tokenRequired);
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error('Token validation error:', err);
        setError(t.pages.adminSignup.notAuthorized);
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
        title: t.pages.adminSignup.accessDenied,
        description: t.pages.adminSignup.notAuthorized,
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: t.messages.toastTitles[82],
        description: t.messages.toastDescriptions.passwordsDoNotMatch,
        variant: "destructive",
      });
      return;
    }
    
    if (formData.password.length < 8) {
      toast({
        title: t.messages.toastTitles[110],
        description: t.messages.toastTitles[110],
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
        await (supabase
          .from('admin_invitations' as any)
          .update({ used: true, used_by: authData.user.id, used_at: new Date().toISOString() })
          .eq('token', token) as any);
      }
      
      toast({
        title: t.messages.toastTitles[5],
        description: t.messages.toastDescriptions.youCanLogIn,
      });
      
      navigate("/login");
      
    } catch (error: any) {
      console.error('Admin signup error:', error);
      toast({
        title: t.messages.toastTitles[119],
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
              <CardTitle>{t.pages.adminSignup.validating}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t.pages.adminSignup.pleaseWait}</p>
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
            {t.pages.login.backToHome}
          </Link>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-3xl">{t.pages.adminSignup.accessDenied}</CardTitle>
            </CardHeader>
            
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error || t.pages.adminSignup.notAuthorized}</AlertDescription>
              </Alert>
              
              <p className="text-sm text-muted-foreground mt-4 mb-4">
                Admin account creation is restricted. If you believe you should have access, please contact the platform administrator with your invitation token.
              </p>
              
              <Button onClick={() => navigate("/")} className="w-full">
                {t.pages.adminSignup.returnHome}
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
          {t.pages.login.backToHome}
        </Link>
        
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-6 w-6 text-accent" />
              <CardTitle className="text-3xl">{t.pages.adminSignup.platformAdmin}</CardTitle>
            </div>
            <CardDescription>{t.pages.adminSignup.createAccount}</CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="fullName">{t.pages.adminSignup.fullNameLabel}</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  placeholder={t.pages.adminSignup.adminNamePlaceholder}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">{t.pages.adminSignup.emailLabel}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder={t.pages.adminSignup.emailPlaceholder}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password">{t.pages.adminSignup.passwordLabel}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder={t.pages.adminSignup.passwordPlaceholder}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">{t.pages.adminSignup.confirmPasswordLabel}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder={t.pages.adminSignup.confirmPlaceholder}
                  required
                />
              </div>
              
              <Button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent/90">
                {loading ? t.common.loading : t.pages.adminSignup.createButton}
              </Button>
              
              <p className="text-sm text-muted-foreground text-center">
                {t.pages.adminSignup.businessOwner}{" "}
                <Link to="/signup" className="text-accent hover:underline">
                  {t.pages.adminSignup.signUpHere}
                </Link>
              </p>
              
              <p className="text-sm text-muted-foreground text-center">
                {t.pages.adminSignup.alreadyHaveAccount}{" "}
                <Link to="/login" className="text-accent hover:underline">
                  {t.pages.adminSignup.login}
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
