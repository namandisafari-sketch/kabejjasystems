import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, ChevronRight, BookOpen, Users, GraduationCap, ChevronDown } from "lucide-react";
import { detectSchoolLevels, seedDefaultSubjects, seedDefaultClasses } from "@/lib/subjects-data";
import { useLanguage } from "@/i18n";

const TeacherOnboarding = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [profileId, setProfileId] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [schoolLevels, setSchoolLevels] = useState<string[]>([]);
  const [teacherType, setTeacherType] = useState<"class" | "subject" | "">("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [pairings, setPairings] = useState<Record<string, string[]>>({});
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login"); return; }
    const { data: p } = await supabase.from("profiles").select("tenant_id, id").eq("id", session.user.id).single();
    if (!p?.tenant_id) { navigate("/login"); return; }
    setTenantId(p.tenant_id);
    setProfileId(p.id);

    await seedDefaultSubjects(supabase, p.tenant_id);
    await seedDefaultClasses(supabase, p.tenant_id);

    const [cls, subs] = await Promise.all([
      supabase.from("school_classes").select("*").eq("tenant_id", p.tenant_id).eq("is_active", true).order("name"),
      supabase.from("subjects").select("*").eq("tenant_id", p.tenant_id).order("name"),
    ]);

    const classData = cls.data || [];
    const subjectData = subs.data || [];
    setClasses(classData);
    setAllSubjects(subjectData);

    const levels = detectSchoolLevels(classData);
    setSchoolLevels(levels);

    const [classAssignments, subjectAssignments] = await Promise.all([
      supabase.from("teacher_class_assignments").select("id").eq("teacher_id", p.id).eq("tenant_id", p.tenant_id).limit(1),
      supabase.from("teacher_subject_assignments").select("id").eq("teacher_id", p.id).eq("tenant_id", p.tenant_id).limit(1),
    ]);
    const hasOnboarded =
      (classAssignments.data && classAssignments.data.length > 0) ||
      (subjectAssignments.data && subjectAssignments.data.length > 0);
    if (hasOnboarded) {
      navigate("/teacher");
      return;
    }

    setLoading(false);
  };

  useEffect(() => {
    if (step === 4 && selectedClasses.length > 0 && selectedSubjects.length > 0) {
      const initial: Record<string, string[]> = {};
      selectedClasses.forEach(cid => { initial[cid] = [...selectedSubjects]; });
      setPairings(initial);
      const open: Record<string, boolean> = {};
      selectedClasses.forEach(cid => { open[cid] = true; });
      setOpenSections(open);
    }
  }, [step]);

  const filteredSubjects = () => {
    if (schoolLevels.length === 0) return allSubjects;
    return allSubjects.filter(s => {
      const lv = s.level?.toLowerCase() || "";
      return schoolLevels.some(sl => {
        if (sl === "ecd") return lv === "kindergarten";
        if (sl === "primary") return lv === "primary";
        if (sl === "lower_secondary" || sl === "a_level") return lv === "secondary";
        return true;
      });
    });
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjects(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleClass = (id: string) => {
    setSelectedClasses(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const togglePairing = (classId: string, subjectId: string) => {
    setPairings(prev => {
      const current = prev[classId] || [];
      const updated = current.includes(subjectId)
        ? current.filter(s => s !== subjectId)
        : [...current, subjectId];
      return { ...prev, [classId]: updated };
    });
  };

  const getSubjectById = (id: string) => allSubjects.find(s => s.id === id);
  const getClassById = (id: string) => classes.find(c => c.id === id);

  const handleFinish = async () => {
    setSaving(true);

    await supabase.from("teacher_subject_assignments").delete().eq("teacher_id", profileId).eq("tenant_id", tenantId);
    await supabase.from("teacher_class_assignments").delete().eq("teacher_id", profileId).eq("tenant_id", tenantId);

    if (selectedClasses.length > 0) {
      const classAssignments = selectedClasses.map(cid => ({
        teacher_id: profileId,
        class_id: cid,
        tenant_id: tenantId,
        is_class_teacher: isClassTeacher && selectedClasses.indexOf(cid) === 0,
      }));
      await supabase.from("teacher_class_assignments").insert(classAssignments);
    }

    const subjectRows: any[] = [];
    const pairedSubjects = new Set<string>();
    selectedClasses.forEach(cid => {
      (pairings[cid] || []).forEach(sid => {
        subjectRows.push({ teacher_id: profileId, subject_id: sid, class_id: cid, tenant_id: tenantId });
        pairedSubjects.add(sid);
      });
    });

    selectedSubjects.forEach(sid => {
      if (!pairedSubjects.has(sid)) {
        subjectRows.push({ teacher_id: profileId, subject_id: sid, class_id: null, tenant_id: tenantId });
      }
    });

    if (subjectRows.length > 0) {
      await supabase.from("teacher_subject_assignments").insert(subjectRows);
    }

    setSaving(false);
    navigate("/teacher");
  };

  if (loading) return <div className="flex justify-center items-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const canContinue = () => {
    if (step === 1 && !teacherType) return false;
    if (step === 2 && selectedSubjects.length === 0) return false;
    if (step === 3 && selectedClasses.length === 0) return false;
    return true;
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-center gap-1 mb-8">
        {t.navigation.teacherOnboardingSteps.map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:inline ${i <= step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
            {i < t.navigation.teacherOnboardingSteps.length - 1 && <div className={`h-px w-6 sm:w-12 ${i < step ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">
            {step === 0 && t.navigation.teacherOnboardingTitles[0]}
            {step === 1 && t.navigation.teacherOnboardingTitles[1]}
            {step === 2 && t.navigation.teacherOnboardingTitles[2]}
            {step === 3 && t.navigation.teacherOnboardingTitles[3]}
            {step === 4 && t.navigation.teacherOnboardingTitles[4]}
            {step === 5 && t.navigation.teacherOnboardingTitles[5]}
          </CardTitle>
          <CardDescription>
            {step === 0 && t.navigation.teacherOnboardingDescriptions[0]}
            {step === 1 && t.navigation.teacherOnboardingDescriptions[1]}
            {step === 2 && schoolLevels.length > 0 && `Subjects for: ${schoolLevels.map(sl => (t.navigation.levelLabels as any)[sl] || sl).join(", ")}`}
            {step === 3 && t.navigation.teacherOnboardingDescriptions[3]}
            {step === 4 && t.navigation.teacherOnboardingDescriptions[4]}
            {step === 5 && t.navigation.teacherOnboardingDescriptions[5]}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {step === 0 && (
            <div className="py-6 space-y-4 text-center">
              <GraduationCap className="h-20 w-20 mx-auto text-primary/30" />
              <p className="text-muted-foreground max-w-md mx-auto">
                We detected your school has classes at <strong>{schoolLevels.map(sl => (t.navigation.levelLabels as any)[sl]).join(", ")}</strong> levels.
                Let's configure your teaching profile so you only see what's relevant to you.
              </p>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <button onClick={() => { setTeacherType("class"); setIsClassTeacher(true); }}
                className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-md ${teacherType === "class" ? "border-primary bg-primary/5" : "border-border"}`}>
                <Users className="h-8 w-8 mb-3 text-primary" />
                <h3 className="font-semibold">{t.classes.classTeacher}</h3>
                <p className="text-sm text-muted-foreground mt-1">I am responsible for a specific class — manage attendance, reports, and communication.</p>
              </button>
              <button onClick={() => { setTeacherType("subject"); setIsClassTeacher(false); }}
                className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-md ${teacherType === "subject" ? "border-primary bg-primary/5" : "border-border"}`}>
                <BookOpen className="h-8 w-8 mb-3 text-primary" />
                <h3 className="font-semibold">{t.exams.subject} Teacher</h3>
                <p className="text-sm text-muted-foreground mt-1">I teach specific subjects across multiple classes — focused on curriculum delivery.</p>
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="py-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                {filteredSubjects().map((s: any) => (
                  <button key={s.id} onClick={() => toggleSubject(s.id)}
                    className={`p-3 rounded-lg border text-left text-sm transition-all ${selectedSubjects.includes(s.id) ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"}`}>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{s.code} · {s.is_core ? <span className="text-blue-600">{t.common.type}</span> : t.common.category}</div>
                  </button>
                ))}
              </div>
              {filteredSubjects().length === 0 && (
                <p className="text-center text-muted-foreground py-8">{t.common.noResults}</p>
              )}
              <p className="text-xs text-muted-foreground mt-3 text-center">{selectedSubjects.length} {t.common.total} selected</p>
            </div>
          )}

          {step === 3 && (
            <div className="py-4">
              {isClassTeacher && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  {t.common.description}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                {classes.map((c: any) => (
                  <button key={c.id} onClick={() => toggleClass(c.id)}
                    className={`p-3 rounded-lg border text-left text-sm transition-all ${selectedClasses.includes(c.id) ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:bg-muted/50"}`}>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{c.level} · {c.section || "No section"}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-3 text-center">{selectedClasses.length} {t.common.total} selected</p>
            </div>
          )}

          {step === 4 && (
            <div className="py-4 space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                {t.common.description}
              </div>
              <p className="text-xs text-muted-foreground">
                {Object.values(pairings).flat().length} {t.common.total}
              </p>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {selectedClasses.map(cid => {
                  const cl = getClassById(cid);
                  if (!cl) return null;
                  const isOpen = openSections[cid] ?? false;
                  const classPairings = pairings[cid] || [];
                  return (
                    <Collapsible key={cid} open={isOpen} onOpenChange={o => setOpenSections(prev => ({ ...prev, [cid]: o }))}
                      className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium hover:bg-muted/30">
                        <span>{cl.name} <span className="text-muted-foreground font-normal">({cl.level})</span></span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{classPairings.length}/{selectedSubjects.length}</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 pb-3">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                          {selectedSubjects.map(sid => {
                            const sub = getSubjectById(sid);
                            if (!sub) return null;
                            const checked = classPairings.includes(sid);
                            return (
                              <label key={sid} className={`flex items-center gap-2 p-2 rounded border text-sm cursor-pointer transition-colors ${checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"}`}>
                                <Checkbox checked={checked} onCheckedChange={() => togglePairing(cid, sid)} />
                                <span className="truncate">{sub.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="py-6 space-y-4 text-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-muted-foreground max-w-md mx-auto">
                {t.navigation.teacherOnboardingDescriptions[5]}
              </p>
            </div>
          )}

          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button variant="ghost" onClick={() => step > 0 ? setStep(step - 1) : navigate("/teacher")} disabled={saving}>
              {step === 0 ? t.nav.dashboard : t.common.back}
            </Button>
            {step < 5 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canContinue()}>
                {t.common.next} <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {t.nav.dashboard}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherOnboarding;
