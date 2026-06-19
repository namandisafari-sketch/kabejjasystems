import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, BookOpen, Users, Calendar } from "lucide-react";

const CreateAssignment = () => {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [totalMarks, setTotalMarks] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }
      const { data: profile } = await supabase.from("profiles").select("id, tenant_id").eq("id", session.user.id).single();
      if (!profile?.tenant_id) return;
      setTenantId(profile.tenant_id);

      const [{ data: cls }, { data: sub }] = await Promise.all([
        supabase.from("school_classes").select("id, name").eq("tenant_id", profile.tenant_id).eq("is_active", true),
        supabase.from("subjects").select("id, name").eq("tenant_id", profile.tenant_id).eq("is_active", true),
      ]);
      setClasses(cls || []);
      if (sub) {
        const { data: subAssignments } = await supabase
          .from("teacher_subject_assignments")
          .select("subject_id")
          .eq("teacher_id", profile.id)
          .eq("tenant_id", profile.tenant_id);
        if (subAssignments && subAssignments.length > 0) {
          const allowedIds = new Set(subAssignments.map(s => s.subject_id));
          setSubjects(sub.filter(s => allowedIds.has(s.id)));
        } else {
          setSubjects(sub);
        }
      }
    };
    init();
  }, [navigate]);

  const handleSave = async () => {
    if (!title || !classId || !subjectId || !dueDate) return;
    setSaving(true);
    await supabase.from("exam_types").insert({
      name: title,
      tenant_id: tenantId,
      description,
      class_id: classId,
      subject_id: subjectId,
      max_marks: totalMarks ? parseInt(totalMarks) : null,
      due_date: dueDate,
      is_active: true,
    });
    setSaving(false);
    navigate("/teacher/assignments/submissions");
  };

  if (!tenantId) {
    return <div className="flex items-center justify-center min-h-[40vh]"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Assignment</h1>
          <p className="text-sm text-muted-foreground">Set up a new assignment for your class</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Assignment Details</CardTitle>
          <CardDescription>Fill in the details below to create a new assignment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Assignment Title</Label>
            <Input id="title" placeholder="e.g. Mathematics Test 1" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subjectId} onValueChange={setSubjectId}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marks">Total Marks</Label>
              <Input id="marks" type="number" placeholder="e.g. 100" value={totalMarks} onChange={e => setTotalMarks(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Instructions (optional)</Label>
            <Textarea id="desc" placeholder="Provide instructions for students..." rows={3} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} disabled={!title || !classId || !subjectId || !dueDate || saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Create Assignment"}
            </Button>
            <Button variant="outline" onClick={() => navigate("/teacher/assignments/submissions")}>Cancel</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><BookOpen className="h-3 w-3" /> Classes</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{classes.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Subjects</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{subjects.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Due Date</CardTitle></CardHeader>
          <CardContent><p className="text-sm font-medium">{dueDate || "Not set"}</p></CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateAssignment;
