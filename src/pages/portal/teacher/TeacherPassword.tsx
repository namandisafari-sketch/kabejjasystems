import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, Lock, Eye, EyeOff } from "lucide-react";

const TeacherPassword = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ current: "", newPw: "", confirm: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setError("");
    setSuccess(false);
    if (!form.current || !form.newPw || !form.confirm) { setError("All fields are required."); return; }
    if (form.newPw.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.newPw !== form.confirm) { setError("Passwords do not match."); return; }

    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password: form.newPw });
    if (err) { setError(err.message); setSaving(false); return; }
    setSuccess(true);
    setSaving(false);
    setForm({ current: "", newPw: "", confirm: "" });
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Change Password</h1>
          <p className="text-sm text-muted-foreground">Update your account password</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Lock className="h-5 w-5" /> Password Settings</CardTitle>
          <CardDescription>Choose a strong, unique password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">{error}</div>}
          {success && <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-sm text-green-600 dark:text-green-400">Password updated successfully!</div>}

          <div className="space-y-2">
            <Label htmlFor="current">Current Password</Label>
            <Input id="current" type="password" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPw">New Password</Label>
            <div className="relative">
              <Input id="newPw" type={showPw ? "text" : "password"} value={form.newPw} onChange={e => setForm(f => ({ ...f, newPw: e.target.value }))} />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm New Password</Label>
            <Input id="confirm" type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />{saving ? "Updating..." : "Update Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherPassword;
