import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/hooks/use-database";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Invitation {
  id: string;
  email: string;
  full_name: string;
  tenant_id: string;
  branch_id: string | null;
  allowed_modules: string[];
  status: string;
  expires_at: string;
  tenants?: { name: string };
  branches?: { name: string } | null;
}

const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_invitations')
        .select('*, tenants(name), branches(name)')
        .eq('token', token)
        .single();

      if (error) throw error;

      if (!data) {
        setError("Invitation not found");
        return;
      }

      if (data.status !== 'pending') {
        setError(`This invitation has already been ${data.status}`);
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError("This invitation has expired");
        return;
      }

      setInvitation(data);
    } catch (err: any) {
      setError(err.message || "Failed to load invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // 1. Sign up the user
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: invitation!.email,
        password,
        options: {
          data: {
            full_name: invitation!.full_name,
          },
        },
      });

      if (signupError) throw signupError;
      if (!authData.user) throw new Error("Failed to create account");

      // 2. Update the profile with tenant_id and role
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          tenant_id: invitation!.tenant_id,
          role: 'staff',
          full_name: invitation!.full_name,
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      // 3. Create staff permissions
      const { error: permError } = await supabase
        .from('staff_permissions')
        .insert({
          profile_id: authData.user.id,
          tenant_id: invitation!.tenant_id,
          branch_id: invitation!.branch_id,
          allowed_modules: invitation!.allowed_modules,
          is_active: true,
        });

      if (permError) throw permError;

      // 4. Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('staff_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation!.id);

      if (updateError) throw updateError;

      toast({
        title: "Account Created!",
        description: "You have successfully joined the team. Redirecting...",
      });

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/business');
      }, 1500);

    } catch (err: any) {
      console.error('Acceptance error:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to accept invitation",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
            <p className="text-muted-foreground text-center mb-6">{error}</p>
            <Button onClick={() => navigate('/login')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            You've been invited to join <strong>{invitation?.tenants?.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-4 bg-muted rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Your Name:</span>
              <span className="font-medium">{invitation?.full_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Email:</span>
              <span className="font-medium">{invitation?.email}</span>
            </div>
            {invitation?.branches?.name && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Branch:</span>
                <span className="font-medium">{invitation.branches.name}</span>
              </div>
            )}
            <div className="pt-2">
              <span className="text-sm text-muted-foreground block mb-2">Access to:</span>
              <div className="flex flex-wrap gap-1">
                {invitation?.allowed_modules.map((mod) => (
                  <Badge key={mod} variant="secondary" className="text-xs capitalize">
                    {mod}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={handleAccept} className="space-y-4">
            <div>
              <Label htmlFor="password">Create Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Accept & Create Account
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Already have an account?{" "}
            <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/login')}>
              Sign in instead
            </Button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvitation;
