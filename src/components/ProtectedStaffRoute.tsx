import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { seedDefaultSubjects } from "@/lib/subjects-data";

interface ProtectedStaffRouteProps {
  children: ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export const ProtectedStaffRoute = ({
  children,
  allowedRoles,
  redirectTo = "/login",
}: ProtectedStaffRouteProps) => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setErrorMessage("You must be logged in to access this page.");
          setIsAuthorized(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, tenant_id')
          .eq('id', session.user.id)
          .single();

        if (!profile) {
          setErrorMessage("User profile not found.");
          setIsAuthorized(false);
          return;
        }

        if (!profile.tenant_id) {
          setErrorMessage("You are not associated with a school.");
          setIsAuthorized(false);
          return;
        }

        if (!allowedRoles.includes(profile.role)) {
          setErrorMessage("You do not have permission to access this page.");
          setIsAuthorized(false);
          return;
        }

        await seedDefaultSubjects(supabase, profile.tenant_id);

        setIsAuthorized(true);
      } catch (error) {
        console.error('Route protection check failed:', error);
        setErrorMessage("Error checking authorization.");
        setIsAuthorized(false);
      }
    };

    checkAccess();
  }, [allowedRoles, redirectTo]);

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Checking Authorization...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Please wait while we verify your access.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            <Button onClick={() => navigate("/")} className="w-full">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
