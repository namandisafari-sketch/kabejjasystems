import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TennaHubLogo } from "@/components/TennaHubLogo";
import { GraduationCap, Loader2, Eye, EyeOff } from "lucide-react";
import { getStudentSession } from "./StudentLogin";
import { useLanguage } from "@/i18n";

export default function StudentSetPassword() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  useEffect(() => {
    const session = getStudentSession();
    if (!session) {
      navigate("/student/login", { replace: true });
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate("/student/login", { replace: true });
      } else {
        setStudentEmail(data.user.email || "");
      }
    });
  }, [navigate]);

  const handleSubmit = async () => {
    setError("");
    if (!newPassword || !confirmPassword) { setError(t.pages.studentSetPassword.allFieldsRequired); return; }
    if (newPassword.length < 6) { setError(t.pages.studentSetPassword.passwordTooShort); return; }
    if (newPassword !== confirmPassword) { setError(t.pages.studentSetPassword.passwordsDoNotMatch); return; }

    setLoading(true);
    const { error: pwErr } = await supabase.auth.updateUser({
      password: newPassword,
      data: { must_reset_password: false },
    });

    if (pwErr) { setError(pwErr.message); setLoading(false); return; }

    setLoading(false);
    navigate("/student/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-3 pb-4">
          <div className="flex justify-center">
            <TennaHubLogo width={120} height={36} />
          </div>
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <GraduationCap className="h-5 w-5" />
            <span className="text-sm font-medium">{t.pages.studentSetPassword.studentPortal}</span>
          </div>
          <CardTitle className="text-xl">Profile & Password</CardTitle>
          <CardDescription>
            {studentEmail && <span className="block text-xs mb-1">Logged in as: {studentEmail}</span>}
            Set a password so you can login without email magic links.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="new-password">{t.pages.studentSetPassword.newPasswordLabel}</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPw ? "text" : "password"}
                placeholder={t.pages.studentSetPassword.newPasswordPlaceholder}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPw(!showPw)}
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">{t.pages.studentSetPassword.confirmPasswordLabel}</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder={t.pages.studentSetPassword.confirmPasswordPlaceholder}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={loading || !newPassword || !confirmPassword}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
