import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, User } from "lucide-react";

const TeacherProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [form, setForm] = useState({ full_name: "", phone: "", email: "" });

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      setUserId(session.user.id);
      setForm(f => ({ ...f, email: session.user.email || "" }));

      const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", session.user.id).single();
      if (profile) setForm(f => ({ ...f, full_name: profile.full_name || "", phone: profile.phone || "" }));
      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleSave = async () => {
    setSaving(true);
    await supabase.from("profiles").update({ full_name: form.full_name, phone: form.phone }).eq("id", userId);
    setSaving(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="text-sm text-muted-foreground">Update your personal information</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"><User className="h-6 w-6 text-primary" /></div>
            <div><CardTitle className="text-lg">{form.full_name || "Staff Member"}</CardTitle><CardDescription>{form.email}</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+256..." />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={form.email} disabled className="bg-muted" />
            <p className="text-[10px] text-muted-foreground">Email cannot be changed. Contact admin for email changes.</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />{saving ? "Saving..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherProfile;
