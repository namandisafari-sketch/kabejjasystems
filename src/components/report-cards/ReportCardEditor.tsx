import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/hooks/use-database";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Uganda 8-level grading scale
const getGradeFromScore = (score: number): { grade: string; descriptor: string } => {
  if (score >= 90) return { grade: 'A*', descriptor: 'Excellent' };
  if (score >= 80) return { grade: 'A', descriptor: 'Very Good' };
  if (score >= 70) return { grade: 'B', descriptor: 'Good' };
  if (score >= 60) return { grade: 'C', descriptor: 'Credit' };
  if (score >= 50) return { grade: 'D', descriptor: 'Pass' };
  if (score >= 40) return { grade: 'E', descriptor: 'Subsidiary Pass' };
  if (score >= 30) return { grade: 'F', descriptor: 'Failure' };
  return { grade: 'G', descriptor: 'Unclassified' };
};

const defaultSkills = [
  { name: 'Critical Thinking', category: 'generic' },
  { name: 'Communication', category: 'generic' },
  { name: 'Teamwork', category: 'generic' },
  { name: 'Problem Solving', category: 'generic' },
  { name: 'Self-Management', category: 'generic' },
  { name: 'Integrity', category: 'values' },
  { name: 'Respect', category: 'values' },
  { name: 'Responsibility', category: 'values' },
  { name: 'Patriotism', category: 'values' },
];

const disciplineOptions = [
  'Well disciplined',
  'Good conduct',
  'Needs guidance',
  'Requires close supervision',
  'Needs improvement',
];

const ratingOptions = ['Excellent', 'Very Good', 'Good', 'Fair', 'Needs Improvement'];

interface ReportCardEditorProps {
  reportCard: any;
  onClose: () => void;
}

export function ReportCardEditor({ reportCard, onClose }: ReportCardEditorProps) {
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    days_present: reportCard.days_present || 0,
    days_absent: reportCard.days_absent || 0,
    total_school_days: reportCard.total_school_days || 0,
    is_prefect: reportCard.is_prefect || false,
    prefect_title: reportCard.prefect_title || '',
    discipline_remark: reportCard.discipline_remark || 'Well disciplined',
    class_rank: reportCard.class_rank || null,
    total_students_in_class: reportCard.total_students_in_class || null,
    class_teacher_comment: reportCard.class_teacher_comment || '',
    head_teacher_comment: reportCard.head_teacher_comment || '',
    class_teacher_signature: reportCard.class_teacher_signature || '',
    head_teacher_signature: reportCard.head_teacher_signature || '',
  });

  const [scores, setScores] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [newActivity, setNewActivity] = useState({ type: 'sports', name: '', performance: 'Good', remark: '' });

  // Fetch student details
  const { data: student } = useQuery({
    queryKey: ['student', reportCard.student_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, school_classes(id, name, level)')
        .eq('id', reportCard.student_id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch school subjects based on student's level
  const { data: subjects = [] } = useQuery({
    queryKey: ['school-subjects', tenantData?.tenantId, student?.school_classes?.level],
    enabled: !!tenantData?.tenantId && !!student,
    queryFn: async () => {
      const studentLevel = student?.school_classes?.level;
      const level = studentLevel?.includes('a-level') || studentLevel?.includes('S5') || studentLevel?.includes('S6') || studentLevel?.includes('Senior 5') || studentLevel?.includes('Senior 6')
        ? 'a-level'
        : 'o-level';

      const { data, error } = await supabase
        .from('school_subjects')
        .select('*')
        .eq('tenant_id', tenantData!.tenantId)
        .eq('is_active', true)
        .or(`level.eq.${level},level.eq.both`)
        .order('category')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing scores
  const { data: existingScores = [] } = useQuery({
    queryKey: ['report-card-scores', reportCard.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_card_scores')
        .select('*, school_subjects(id, name, code)')
        .eq('report_card_id', reportCard.id);
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing skills
  const { data: existingSkills = [] } = useQuery({
    queryKey: ['report-card-skills', reportCard.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_card_skills')
        .select('*')
        .eq('report_card_id', reportCard.id);
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing activities
  const { data: existingActivities = [] } = useQuery({
    queryKey: ['report-card-activities', reportCard.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_card_activities')
        .select('*')
        .eq('report_card_id', reportCard.id);
      if (error) throw error;
      return data;
    },
  });

  // Initialize scores when subjects load
  useEffect(() => {
    if (subjects.length > 0) {
      const initialScores = subjects.map(subject => {
        const existing = existingScores.find(s => s.subject_id === subject.id);
        return {
          subject_id: subject.id,
          subject_name: subject.name,
          subject_code: subject.code,
          formative_score: existing?.formative_score || 0,
          school_based_score: existing?.school_based_score || 0,
          competency_score: existing?.competency_score || 0,
          subject_remark: existing?.subject_remark || '',
          teacher_name: existing?.teacher_name || '',
          id: existing?.id,
        };
      });
      setScores(initialScores);
    }
  }, [subjects, existingScores]);

  // Initialize skills
  useEffect(() => {
    const initialSkills = defaultSkills.map(skill => {
      const existing = existingSkills.find(s => s.skill_name === skill.name);
      return {
        skill_name: skill.name,
        skill_category: skill.category,
        rating: existing?.rating || '',
        remark: existing?.remark || '',
        id: existing?.id,
      };
    });
    setSkills(initialSkills);
  }, [existingSkills]);

  // Initialize activities
  useEffect(() => {
    setActivities(existingActivities);
  }, [existingActivities]);

  // Save report card mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Calculate totals
      const validScores = scores.filter(s => s.formative_score > 0 || s.school_based_score > 0);
      const totalScore = validScores.reduce((sum, s) => {
        const total = (s.formative_score * 0.2) + (s.school_based_score * 0.8);
        return sum + total;
      }, 0);
      const averageScore = validScores.length > 0 ? totalScore / validScores.length : 0;

      // Update report card
      const { error: rcError } = await supabase
        .from('student_report_cards')
        .update({
          ...formData,
          total_score: totalScore,
          average_score: averageScore,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportCard.id);
      if (rcError) throw rcError;

      // Upsert scores
      for (const score of scores) {
        const totalScore = (score.formative_score * 0.2) + (score.school_based_score * 0.8);
        const { grade, descriptor } = getGradeFromScore(totalScore);

        const scoreData = {
          report_card_id: reportCard.id,
          subject_id: score.subject_id,
          formative_score: score.formative_score,
          school_based_score: score.school_based_score,
          competency_score: score.competency_score,
          grade,
          grade_descriptor: descriptor,
          subject_remark: score.subject_remark,
          teacher_name: score.teacher_name,
        };

        if (score.id) {
          const { error } = await supabase
            .from('report_card_scores')
            .update(scoreData)
            .eq('id', score.id);
          if (error) throw error;
        } else if (score.formative_score > 0 || score.school_based_score > 0) {
          const { error } = await supabase
            .from('report_card_scores')
            .insert(scoreData);
          if (error) throw error;
        }
      }

      // Upsert skills
      for (const skill of skills) {
        if (!skill.rating) continue;

        const skillData = {
          report_card_id: reportCard.id,
          skill_name: skill.skill_name,
          skill_category: skill.skill_category,
          rating: skill.rating,
          remark: skill.remark,
        };

        if (skill.id) {
          const { error } = await supabase
            .from('report_card_skills')
            .update(skillData)
            .eq('id', skill.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('report_card_skills')
            .insert(skillData);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-cards'] });
      queryClient.invalidateQueries({ queryKey: ['report-card-scores'] });
      queryClient.invalidateQueries({ queryKey: ['report-card-skills'] });
      toast({ title: "Report card saved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Add activity mutation
  const addActivityMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('report_card_activities')
        .insert({
          report_card_id: reportCard.id,
          activity_type: newActivity.type,
          activity_name: newActivity.name,
          performance: newActivity.performance,
          remark: newActivity.remark,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setActivities([...activities, data]);
      setNewActivity({ type: 'sports', name: '', performance: 'Good', remark: '' });
      toast({ title: "Activity added" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Delete activity mutation
  const deleteActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('report_card_activities')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      setActivities(activities.filter(a => a.id !== id));
      toast({ title: "Activity removed" });
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('student_report_cards')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
        })
        .eq('id', reportCard.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Report card published" });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleScoreChange = (index: number, field: string, value: any) => {
    const updated = [...scores];
    updated[index] = { ...updated[index], [field]: value };
    setScores(updated);
  };

  const handleSkillChange = (index: number, field: string, value: string) => {
    const updated = [...skills];
    updated[index] = { ...updated[index], [field]: value };
    setSkills(updated);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{student?.full_name}</h1>
            <p className="text-muted-foreground">
              {student?.school_classes?.name} • {student?.admission_number}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
          <Button
            variant="default"
            onClick={() => {
              saveMutation.mutate();
              publishMutation.mutate();
            }}
            disabled={publishMutation.isPending}
          >
            Publish
          </Button>
        </div>
      </div>

      <Tabs defaultValue="scores" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="scores">Subject Scores</TabsTrigger>
          <TabsTrigger value="skills">Skills & Values</TabsTrigger>
          <TabsTrigger value="activities">Co-curricular</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>

        <TabsContent value="scores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subject Scores</CardTitle>
              <p className="text-sm text-muted-foreground">
                Total = Formative (20%) + School-based Exam (80%)
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="w-24">Formative (20%)</TableHead>
                    <TableHead className="w-24">Exam (80%)</TableHead>
                    <TableHead className="w-20">Total</TableHead>
                    <TableHead className="w-16">Grade</TableHead>
                    <TableHead className="w-28">Competency (1-3)</TableHead>
                    <TableHead>Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((score, index) => {
                    const total = (score.formative_score * 0.2) + (score.school_based_score * 0.8);
                    const { grade, descriptor } = getGradeFromScore(total);
                    return (
                      <TableRow key={score.subject_id}>
                        <TableCell className="font-medium">
                          {score.subject_name}
                          {score.subject_code && <span className="text-muted-foreground ml-1">({score.subject_code})</span>}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={score.formative_score}
                            onChange={(e) => handleScoreChange(index, 'formative_score', Number(e.target.value))}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={score.school_based_score}
                            onChange={(e) => handleScoreChange(index, 'school_based_score', Number(e.target.value))}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell className="font-semibold">{total.toFixed(1)}</TableCell>
                        <TableCell>
                          <span className={`font-bold ${total >= 50 ? 'text-green-600' : 'text-red-600'}`}>
                            {grade}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            max="3"
                            step="0.1"
                            value={score.competency_score}
                            onChange={(e) => handleScoreChange(index, 'competency_score', Number(e.target.value))}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Subject remark"
                            value={score.subject_remark}
                            onChange={(e) => handleScoreChange(index, 'subject_remark', e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generic Skills & Values</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skill/Value</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Remark</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skills.map((skill, index) => (
                    <TableRow key={skill.skill_name}>
                      <TableCell className="font-medium">{skill.skill_name}</TableCell>
                      <TableCell className="capitalize">{skill.skill_category}</TableCell>
                      <TableCell>
                        <Select
                          value={skill.rating}
                          onValueChange={(value) => handleSkillChange(index, 'rating', value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="Select rating" />
                          </SelectTrigger>
                          <SelectContent>
                            {ratingOptions.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Optional remark"
                          value={skill.remark}
                          onChange={(e) => handleSkillChange(index, 'remark', e.target.value)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Co-curricular Activities</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-5 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newActivity.type}
                    onValueChange={(value) => setNewActivity(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sports">Sports & Games</SelectItem>
                      <SelectItem value="clubs">Clubs</SelectItem>
                      <SelectItem value="projects">Projects</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Activity Name</Label>
                  <Input
                    placeholder="e.g., Football, Drama Club"
                    value={newActivity.name}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Performance</Label>
                  <Select
                    value={newActivity.performance}
                    onValueChange={(value) => setNewActivity(prev => ({ ...prev, performance: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Excellent">Excellent</SelectItem>
                      <SelectItem value="Very Good">Very Good</SelectItem>
                      <SelectItem value="Good">Good</SelectItem>
                      <SelectItem value="Fair">Fair</SelectItem>
                      <SelectItem value="Participated">Participated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Remark</Label>
                  <Input
                    placeholder="Optional"
                    value={newActivity.remark}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, remark: e.target.value }))}
                  />
                </div>
                <Button
                  onClick={() => addActivityMutation.mutate()}
                  disabled={!newActivity.name || addActivityMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              {activities.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Activity</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Remark</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell className="capitalize">{activity.activity_type}</TableCell>
                        <TableCell>{activity.activity_name}</TableCell>
                        <TableCell>{activity.performance}</TableCell>
                        <TableCell>{activity.remark || '-'}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteActivityMutation.mutate(activity.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance & Prefect Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Total School Days</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.total_school_days}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_school_days: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Days Present</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.days_present}
                    onChange={(e) => setFormData(prev => ({ ...prev, days_present: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Days Absent</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.days_absent}
                    onChange={(e) => setFormData(prev => ({ ...prev, days_absent: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="border-t pt-4 space-y-4">
                <div className="flex items-center gap-4">
                  <Switch
                    checked={formData.is_prefect}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_prefect: checked }))}
                  />
                  <Label>Is Prefect</Label>
                </div>
                {formData.is_prefect && (
                  <div className="space-y-2">
                    <Label>Prefect Title</Label>
                    <Input
                      placeholder="e.g., Class Prefect, Library Prefect"
                      value={formData.prefect_title}
                      onChange={(e) => setFormData(prev => ({ ...prev, prefect_title: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              <div className="border-t pt-4 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Discipline Remark</Label>
                  <Select
                    value={formData.discipline_remark}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, discipline_remark: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {disciplineOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Class Rank</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Rank"
                      value={formData.class_rank || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, class_rank: Number(e.target.value) || null }))}
                      className="w-20"
                    />
                    <span>out of</span>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Total"
                      value={formData.total_students_in_class || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, total_students_in_class: Number(e.target.value) || null }))}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Comments & Signatures</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Class Teacher's Comment</Label>
                    <Textarea
                      rows={4}
                      placeholder="Enter class teacher's comment..."
                      value={formData.class_teacher_comment}
                      onChange={(e) => setFormData(prev => ({ ...prev, class_teacher_comment: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Class Teacher's Signature (Name)</Label>
                    <Input
                      placeholder="e.g., Mr. John Okello"
                      value={formData.class_teacher_signature}
                      onChange={(e) => setFormData(prev => ({ ...prev, class_teacher_signature: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Head Teacher's Comment</Label>
                    <Textarea
                      rows={4}
                      placeholder="Enter head teacher's comment..."
                      value={formData.head_teacher_comment}
                      onChange={(e) => setFormData(prev => ({ ...prev, head_teacher_comment: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Head Teacher's Signature (Name)</Label>
                    <Input
                      placeholder="e.g., Mrs. Grace Namugga"
                      value={formData.head_teacher_signature}
                      onChange={(e) => setFormData(prev => ({ ...prev, head_teacher_signature: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
