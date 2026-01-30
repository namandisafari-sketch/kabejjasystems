import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

/**
 * Signup Page - Disabled
 * 
 * Self-signup is disabled. Only the platform administrator can create business accounts.
 * Users are redirected to the login page.
 */
const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    toast({
      title: "Signup Disabled",
      description: "Account creation is only available through the platform administrator. Please contact support.",
      variant: "destructive",
    });
    navigate('/login');
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
    </div>
  );
};

export default Signup;
