import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedAdminRouteProps {
  children: ReactNode;
  requireSuperAdmin?: boolean;
}

/**
 * ProtectedAdminRoute: Restricts access to admin pages
 * - Checks if user is authenticated and has appropriate role
 * - Optionally restricts to superadmin only
 */
export const ProtectedAdminRoute = ({ 
  children, 
  requireSuperAdmin = false 
}: ProtectedAdminRouteProps) => {
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

        // Check user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (!profile) {
          setErrorMessage("User profile not found.");
          setIsAuthorized(false);
          return;
        }

        const adminRoles = requireSuperAdmin 
          ? ['superadmin'] 
          : ['admin', 'superadmin'];

        if (!adminRoles.includes(profile.role)) {
          setErrorMessage(`This page requires ${requireSuperAdmin ? 'superadmin' : 'admin'} access.`);
          setIsAuthorized(false);
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Route protection check failed:', error);
        setErrorMessage("Error checking authorization.");
        setIsAuthorized(false);
      }
    };

    checkAccess();
  }, [requireSuperAdmin]);

  // Loading state
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

  // Denied state
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

  // Authorized - render children
  return <>{children}</>;
};
