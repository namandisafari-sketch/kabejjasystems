import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// A-Level grading scale
const getALevelGrade = (score: number): { grade: string; descriptor: string } => {
  if (score >= 80) return { grade: 'A', descriptor: 'Excellent' };
  if (score >= 70) return { grade: 'B', descriptor: 'Very Good' };
  if (score >= 60) return { grade: 'C', descriptor: 'Good' };
  if (score >= 50) return { grade: 'D', descriptor: 'Credit' };
  if (score >= 40) return { grade: 'E', descriptor: 'Pass' };
  if (score >= 30) return { grade: 'O', descriptor: 'Subsidiary' };
  return { grade: 'F', descriptor: 'Fail' };
};

const gradeDescriptors: Record<string, string> = {
  'A': 'Excellent',
  'B': 'Very Good',
  'C': 'Good',
  'D': 'Credit',
  'E': 'Pass',
  'O': 'Subsidiary',
  'F': 'Fail'
};

interface ALevelReportCardEditorProps {
  reportCard: any;
  onClose: () => void;
}

export function ALevelReportCardEditor({ reportCard, onClose }: ALevelReportCardEditorProps) {
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    roll_number: reportCard.roll_number || '',
    stream: reportCard.stream || '',
    student_combination: reportCard.student_combination || '',
    overall_identifier: reportCard.overall_identifier || '',
    overall_achievement: reportCard.overall_achievement || '',
    overall_grade: reportCard.overall_grade || '',
    term_end_date: reportCard.term_end_date || '',
    next_term_start_date: reportCard.next_term_start_date || '',
    fees_balance: reportCard.fees_balance || 0,
    next_term_fees: reportCard.next_term_fees || 0,
    class_teacher_comment: reportCard.class_teacher_comment || '',
    head_teacher_comment: reportCard.head_teacher_comment || '',
    class_teacher_signature: reportCard.class_teacher_signature || '',
    head_teacher_signature: reportCard.head_teacher_signature || '',
  });

  const [scores, setScores] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [newActivity, setNewActivity] = useState({ 
    name: '', 
    average_score: 0, 
    grade: '', 
    remark: '', 
    teacher_initials: '' 
  });

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

  // Fetch school subjects (A-Level)
  const { data: subjects = [] } = useQuery({
    queryKey: ['school-subjects-alevel', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_subjects')
        .select('*')
        .eq('tenant_id', tenantData!.tenantId)
        .eq('is_active', true)
        .or('level.eq.a-level,level.eq.both')
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

  // Fetch existing activities
  const { data: existingActivities = [] } = useQuery({
    queryKey: ['report-card-activities', reportCard.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_card_activities')
        .select('*')
        .eq('report_card_id', reportCard.id)
        .eq('activity_type', 'projects');
      if (error) throw error;
      return data;
    },
  });

  // Initialize scores
  useEffect(() => {
    if (subjects.length > 0) {
      const initialScores = subjects.map(subject => {
        const existing = existingScores.find((s: any) => s.subject_id === subject.id);
        return {
          subject_id: subject.id,
          subject_name: subject.name,
          subject_code: subject.code,
          formative_a1: existing?.formative_a1 || 0,
          formative_a2: existing?.formative_a2 || 0,
          formative_a3: existing?.formative_a3 || 0,
          eot_score: existing?.eot_score || 0,
          subject_remark: existing?.subject_remark || '',
          teacher_initials: existing?.teacher_initials || '',
          id: existing?.id,
        };
      });
      setScores(initialScores);
    }
  }, [subjects, existingScores]);

  // Initialize activities
  useEffect(() => {
    setActivities(existingActivities);
  }, [existingActivities]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Calculate overall scores
      const validScores = scores.filter(s => s.formative_a1 > 0 || s.formative_a2 > 0 || s.formative_a3 > 0 || s.eot_score > 0);
      let totalScore = 0;
      
      for (const score of validScores) {
        const formativeAvg = ((score.formative_a1 || 0) + (score.formative_a2 || 0) + (score.formative_a3 || 0)) / 3;
        const total = (formativeAvg * 0.2) + ((score.eot_score || 0) * 0.8);
        totalScore += total;
      }
      
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
        const formativeAvg = ((score.formative_a1 || 0) + (score.formative_a2 || 0) + (score.formative_a3 || 0)) / 3;
        const formative20 = formativeAvg * 0.2;
        const eot80 = (score.eot_score || 0) * 0.8;
        const totalScore = formative20 + eot80;
        const { grade, descriptor } = getALevelGrade(totalScore);

        const scoreData = {
          report_card_id: reportCard.id,
          subject_id: score.subject_id,
          formative_a1: score.formative_a1,
          formative_a2: score.formative_a2,
          formative_a3: score.formative_a3,
          formative_avg: formativeAvg,
          eot_score: score.eot_score,
          total_score: totalScore,
          grade,
          summative_grade: grade,
          grade_descriptor: descriptor,
          subject_remark: score.subject_remark,
          teacher_initials: score.teacher_initials,
        };

        if (score.id) {
          const { error } = await supabase
            .from('report_card_scores')
            .update(scoreData)
            .eq('id', score.id);
          if (error) throw error;
        } else if (score.formative_a1 > 0 || score.formative_a2 > 0 || score.formative_a3 > 0 || score.eot_score > 0) {
          const { error } = await supabase
            .from('report_card_scores')
            .insert(scoreData);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-cards'] });
      queryClient.invalidateQueries({ queryKey: ['report-card-scores'] });
      toast({ title: "Report card saved" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Add project mutation
  const addActivityMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('report_card_activities')
        .insert({
          report_card_id: reportCard.id,
          activity_type: 'projects',
          activity_name: newActivity.name,
          average_score: newActivity.average_score,
          grade: newActivity.grade,
          performance: newActivity.remark,
          remark: newActivity.remark,
          teacher_initials: newActivity.teacher_initials,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setActivities([...activities, data]);
      setNewActivity({ name: '', average_score: 0, grade: '', remark: '', teacher_initials: '' });
      toast({ title: "Project added" });
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
      toast({ title: "Project removed" });
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
              {student?.school_classes?.name} • {student?.admission_number} • A-Level Report Card
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
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="scores">Subject Scores</TabsTrigger>
          <TabsTrigger value="projects">Projects Work</TabsTrigger>
          <TabsTrigger value="details">Student Details</TabsTrigger>
          <TabsTrigger value="comments">Comments & Fees</TabsTrigger>
        </TabsList>

        <TabsContent value="scores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>A-Level Subject Scores</CardTitle>
              <p className="text-sm text-muted-foreground">
                Enter formative assessments (A1, A2, A3) and End of Term (EOT) scores
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="w-16 text-center">A1</TableHead>
                    <TableHead className="w-16 text-center">A2</TableHead>
                    <TableHead className="w-16 text-center">A3</TableHead>
                    <TableHead className="w-20 text-center">AVG 20%</TableHead>
                    <TableHead className="w-16 text-center">EOT 80%</TableHead>
                    <TableHead className="w-20 text-center">Total</TableHead>
                    <TableHead className="w-16 text-center">Grade</TableHead>
                    <TableHead className="w-20">TR Initials</TableHead>
                    <TableHead>Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((score, index) => {
                    const formativeAvg = ((score.formative_a1 || 0) + (score.formative_a2 || 0) + (score.formative_a3 || 0)) / 3;
                    const formative20 = formativeAvg * 0.2;
                    const eot80 = (score.eot_score || 0) * 0.8;
                    const total = formative20 + eot80;
                    const { grade } = getALevelGrade(total);
                    
                    return (
                      <TableRow key={score.subject_id}>
                        <TableCell className="font-medium">
                          {score.subject_code && <span className="text-muted-foreground mr-1">{score.subject_code}</span>}
                          {score.subject_name}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={score.formative_a1}
                            onChange={(e) => handleScoreChange(index, 'formative_a1', Number(e.target.value))}
                            className="w-14 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={score.formative_a2}
                            onChange={(e) => handleScoreChange(index, 'formative_a2', Number(e.target.value))}
                            className="w-14 text-center"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={score.formative_a3}
                            onChange={(e) => handleScoreChange(index, 'formative_a3', Number(e.target.value))}
                            className="w-14 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-center font-semibold">{formative20.toFixed(1)}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={score.eot_score}
                            onChange={(e) => handleScoreChange(index, 'eot_score', Number(e.target.value))}
                            className="w-14 text-center"
                          />
                        </TableCell>
                        <TableCell className="text-center font-bold">{total.toFixed(1)}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold px-2 py-1 rounded ${
                            grade === 'A' ? 'bg-green-200 text-green-800' :
                            grade === 'B' ? 'bg-green-100 text-green-700' :
                            grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                            grade === 'D' ? 'bg-amber-100 text-amber-800' :
                            grade === 'E' ? 'bg-orange-100 text-orange-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {grade}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="TR"
                            value={score.teacher_initials}
                            onChange={(e) => handleScoreChange(index, 'teacher_initials', e.target.value)}
                            className="w-16"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Comment"
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

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student's Project Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-6 gap-4 items-end">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input
                    placeholder="e.g., Apiculture"
                    value={newActivity.name}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Average Score</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={newActivity.average_score}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, average_score: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grade</Label>
                  <Select
                    value={newActivity.grade}
                    onValueChange={(value) => setNewActivity(prev => ({ ...prev, grade: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A - Exceptional</SelectItem>
                      <SelectItem value="B">B - Good</SelectItem>
                      <SelectItem value="C">C - Satisfactory</SelectItem>
                      <SelectItem value="D">D - Fair</SelectItem>
                      <SelectItem value="E">E - Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Input
                    placeholder="e.g., Exceptional"
                    value={newActivity.remark}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, remark: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teacher</Label>
                  <Input
                    placeholder="Initials"
                    value={newActivity.teacher_initials}
                    onChange={(e) => setNewActivity(prev => ({ ...prev, teacher_initials: e.target.value }))}
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
                      <TableHead>Project Work</TableHead>
                      <TableHead>Average Score</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Teacher</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activities.map((activity) => (
                      <TableRow key={activity.id}>
                        <TableCell>{activity.activity_name}</TableCell>
                        <TableCell>{activity.average_score || '-'}</TableCell>
                        <TableCell className="font-bold">{activity.grade || '-'}</TableCell>
                        <TableCell>{activity.remark || activity.performance || '-'}</TableCell>
                        <TableCell>{activity.teacher_initials || '-'}</TableCell>
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

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Details & Overall Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Roll Number</Label>
                  <Input
                    value={formData.roll_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, roll_number: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stream</Label>
                  <Input
                    placeholder="e.g., S.5 WEST"
                    value={formData.stream}
                    onChange={(e) => setFormData(prev => ({ ...prev, stream: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Combination</Label>
                  <Input
                    placeholder="e.g., BCM/SUB ICT"
                    value={formData.student_combination}
                    onChange={(e) => setFormData(prev => ({ ...prev, student_combination: e.target.value }))}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-4">Overall Assessment</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Overall Identifier (1-3)</Label>
                    <Select
                      value={formData.overall_identifier}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, overall_identifier: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Basic</SelectItem>
                        <SelectItem value="2">2 - Moderate</SelectItem>
                        <SelectItem value="3">3 - Outstanding</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Overall Achievement</Label>
                    <Input
                      placeholder="Description"
                      value={formData.overall_achievement}
                      onChange={(e) => setFormData(prev => ({ ...prev, overall_achievement: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Overall Grade</Label>
                    <Select
                      value={formData.overall_grade}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, overall_grade: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comments, Dates & Fees</CardTitle>
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
                      value={formData.head_teacher_signature}
                      onChange={(e) => setFormData(prev => ({ ...prev, head_teacher_signature: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-4">Term Dates & Fees</h4>
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Term End Date</Label>
                    <Input
                      type="date"
                      value={formData.term_end_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, term_end_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Next Term Begins</Label>
                    <Input
                      type="date"
                      value={formData.next_term_start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, next_term_start_date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fees Balance (Ugx)</Label>
                    <Input
                      type="number"
                      value={formData.fees_balance}
                      onChange={(e) => setFormData(prev => ({ ...prev, fees_balance: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Next Term Fees (Ugx)</Label>
                    <Input
                      type="number"
                      value={formData.next_term_fees}
                      onChange={(e) => setFormData(prev => ({ ...prev, next_term_fees: Number(e.target.value) }))}
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
