import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Mail, ArrowRight, ShieldCheck, ChevronRight } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";

const Signup = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Staff & Teacher Sign-Up"
      subtitle="School accounts are created by your administrator. Staff and teachers are invited via email."
      backTo={{ label: "Back to home", to: "/" }}
    >
      <Card className="border-0 shadow-none bg-transparent">
        <CardHeader className="text-center pb-3 sm:pb-4 pt-0 px-0">
          <CardTitle className="text-xl sm:text-2xl">Join Your School</CardTitle>
          <CardDescription className="text-sm sm:text-base">
            Choose how you&apos;d like to get started
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0 pb-0 space-y-3 sm:space-y-4">
          <div className="grid gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={() => navigate("/accept-invitation")}
              className="h-auto w-full p-4 sm:p-6 flex items-start gap-3 sm:gap-4 text-left touch-target"
            >
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-medium text-sm sm:text-base">I have an invitation link</p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-snug sm:leading-normal">
                  If your school administrator sent you an invitation email, click here to accept it and create your account.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 mt-1" />
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate("/login")}
              className="h-auto w-full p-4 sm:p-6 flex items-start gap-3 sm:gap-4 text-left touch-target"
            >
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-medium text-sm sm:text-base">I already have an account</p>
                <p className="text-xs sm:text-sm text-muted-foreground leading-snug sm:leading-normal">
                  Sign in to access your school dashboard, manage students, and more.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0 mt-1" />
            </Button>
          </div>

          <div className="relative my-4 sm:my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">For administrators</span>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/50 p-3 sm:p-5 space-y-2 sm:space-y-3">
            <div className="flex items-start gap-2 sm:gap-3">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-xs sm:text-sm">Create a school account</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 leading-snug">
                  If you are a school owner or administrator, you can register your school directly.
                </p>
                <Button
                  variant="link"
                  className="h-auto p-0 text-xs sm:text-sm mt-1 font-medium"
                  onClick={() => navigate("/admin-signup")}
                >
                  Register your school here
                </Button>
              </div>
            </div>
          </div>

          <p className="text-center text-xs sm:text-sm text-muted-foreground mt-4 sm:mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline whitespace-nowrap">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthLayout>
  );
};

export default Signup;
