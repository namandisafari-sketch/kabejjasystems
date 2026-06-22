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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Plus } from "lucide-react";
import { 
  LSC_STANDARD_SUBJECTS, 
  LSC_COMPETENCIES, 
  BEHAVIOUR_RATINGS,
  getGradeFromScore,
  getGradeDescription,
  getGradeColor 
} from "@/lib/lsc-report-card-utils";

interface LSCReportCardEditorProps {
  reportCard: any;
  onClose: () => void;
}

export function LSCReportCardEditor({ reportCard, onClose }: LSCReportCardEditorProps) {
  const { data: tenantData } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    attendance_status: reportCard.attendance_status || 'Present',
    punctuality: reportCard.punctuality || 'Good',
    conduct: reportCard.conduct || 'Good',
    teacher_remarks: reportCard.teacher_remarks || '',
    promotion_status: reportCard.promotion_status || '',
    class_rank: reportCard.class_rank || 1,
    total_students_in_class: reportCard.total_students_in_class || 0,
  });

  const [scores, setScores] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);

  // Fetch student details
  const { data: student } = useQuery({
    queryKey: ['student', reportCard.student_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, school_classes!class_id(id, name, level)')
        .eq('id', reportCard.student_id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing report card scores
  const { data: existingScores = [] } = useQuery({
    queryKey: ['report-card-scores-lsc', reportCard.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_card_scores')
        .select('*, school_subjects(id, name, code)')
        .eq('report_card_id', reportCard.id)
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing skills/competencies
  const { data: existingSkills = [] } = useQuery({
    queryKey: ['report-card-skills-lsc', reportCard.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_card_skills')
        .select('*')
        .eq('report_card_id', reportCard.id);
      if (error) throw error;
      return data;
    },
  });

  // Initialize scores when data loads
  useEffect(() => {
    if (existingScores.length > 0) {
      setScores(existingScores.map(s => ({
        ...s,
        grade: getGradeFromScore(s.score || 0),
      })));
    } else {
      // Initialize with LSC standard subjects
      setScores(LSC_STANDARD_SUBJECTS.map(subj => ({
        id: `new-${subj.code}`,
        report_card_id: reportCard.id,
        subject_id: null,
        subject_name: subj.name,
        score: 0,
        grade: '9',
        school_subjects: { name: subj.name, code: subj.code },
      })));
    }
  }, [existingScores, reportCard.id]);

  // Initialize competencies when data loads
  useEffect(() => {
    if (existingSkills.length > 0) {
      setSkills(existingSkills);
    } else {
      // Initialize with LSC competencies
      setSkills(LSC_COMPETENCIES.map(comp => ({
        id: `new-${comp.code}`,
        report_card_id: reportCard.id,
        name: comp.name,
        rating: 3,
        description: comp.description,
      })));
    }
  }, [existingSkills, reportCard.id]);

  const updateScoreMutation = useMutation({
    mutationFn: async (updatedScores: any[]) => {
      // Update or insert scores
      for (const score of updatedScores) {
        if (score.id?.toString().startsWith('new-')) {
          // Insert new
          const { error } = await supabase
            .from('report_card_scores')
            .insert({
              report_card_id: reportCard.id,
              subject_id: score.subject_id,
              score: score.score,
              remarks: score.remarks,
            });
          if (error) throw error;
        } else {
          // Update existing
          const { error } = await supabase
            .from('report_card_scores')
            .update({
              score: score.score,
              remarks: score.remarks,
            })
            .eq('id', score.id);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast({ title: 'Scores saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['report-card-scores-lsc'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error saving scores', description: error.message, variant: 'destructive' });
    },
  });

  const updateSkillsMutation = useMutation({
    mutationFn: async (updatedSkills: any[]) => {
      // Update or insert skills
      for (const skill of updatedSkills) {
        if (skill.id?.toString().startsWith('new-')) {
          // Insert new
          const { error } = await supabase
            .from('report_card_skills')
            .insert({
              report_card_id: reportCard.id,
              name: skill.name,
              rating: skill.rating,
              description: skill.description,
            });
          if (error) throw error;
        } else {
          // Update existing
          const { error } = await supabase
            .from('report_card_skills')
            .update({
              rating: skill.rating,
              description: skill.description,
            })
            .eq('id', skill.id);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      toast({ title: 'Competencies saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['report-card-skills-lsc'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error saving competencies', description: error.message, variant: 'destructive' });
    },
  });

  const updateReportCardMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('student_report_cards')
        .update(formData)
        .eq('id', reportCard.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Report card updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['report-cards'] });
    },
    onError: (error: any) => {
      toast({ title: 'Error updating report card', description: error.message, variant: 'destructive' });
    },
  });

  const handleSave = async () => {
    await updateReportCardMutation.mutateAsync();
    await updateScoreMutation.mutateAsync(scores);
    await updateSkillsMutation.mutateAsync(skills);
    onClose();
  };

  const handleScoreChange = (index: number, field: string, value: any) => {
    const updated = [...scores];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'score') {
      updated[index].grade = getGradeFromScore(value);
    }
    setScores(updated);
  };

  const handleSkillRatingChange = (index: number, rating: number) => {
    const updated = [...skills];
    updated[index] = { ...updated[index], rating };
    setSkills(updated);
  };

  const averageScore = scores.length > 0 
    ? Math.round(scores.reduce((sum, s) => sum + (s.score || 0), 0) / scores.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <Button onClick={handleSave} disabled={updateReportCardMutation.isPending}>
          <Save className="h-4 w-4 mr-1" />
          Save Report Card
        </Button>
      </div>

      <Tabs defaultValue="academics" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="academics">Academic Results</TabsTrigger>
          <TabsTrigger value="competencies">Competencies</TabsTrigger>
          <TabsTrigger value="behaviour">Behaviour</TabsTrigger>
          <TabsTrigger value="remarks">Remarks</TabsTrigger>
        </TabsList>

        {/* Academic Results Tab */}
        <TabsContent value="academics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>LSC Academic Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label>Class Rank</Label>
                    <Input
                      type="number"
                      value={formData.class_rank}
                      onChange={(e) =>
                        setFormData({ ...formData, class_rank: parseInt(e.target.value) || 0 })
                      }
                      placeholder="e.g., 1"
                    />
                  </div>
                  <div>
                    <Label>Total Students in Class</Label>
                    <Input
                      type="number"
                      value={formData.total_students_in_class}
                      onChange={(e) =>
                        setFormData({ ...formData, total_students_in_class: parseInt(e.target.value) || 0 })
                      }
                      placeholder="e.g., 45"
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded border border-blue-200">
                  <p className="font-semibold">Average Score: {averageScore}/100</p>
                  <p className="text-sm text-gray-600">
                    Grade: <span className="font-bold">{getGradeFromScore(averageScore)}</span> ({getGradeDescription(averageScore)})
                  </p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Score (0-100)</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Achievement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scores.map((score, index) => (
                      <TableRow key={score.id}>
                        <TableCell>{score.school_subjects?.name || score.subject_name}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={score.score || 0}
                            onChange={(e) =>
                              handleScoreChange(index, 'score', parseInt(e.target.value) || 0)
                            }
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <span 
                            className="px-2 py-1 rounded text-white font-bold"
                            style={{ backgroundColor: getGradeColor(score.score || 0) }}
                          >
                            {score.grade}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {getGradeDescription(score.score || 0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Competencies Tab */}
        <TabsContent value="competencies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Key Competencies Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {skills.map((skill, index) => (
                  <div key={skill.id} className="border rounded p-4">
                    <div className="font-semibold mb-3">{skill.name}</div>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => handleSkillRatingChange(index, rating)}
                          className={`w-10 h-10 rounded border font-bold text-sm transition ${
                            skill.rating === rating
                              ? 'bg-green-600 text-white border-green-600'
                              : 'bg-white border-gray-300 hover:border-green-600'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{skill.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Behaviour Tab */}
        <TabsContent value="behaviour" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Behaviour & Conduct</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Attendance Status</Label>
                <Select
                  value={formData.attendance_status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, attendance_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Present">Present</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Punctuality</Label>
                <Select
                  value={formData.punctuality}
                  onValueChange={(value) =>
                    setFormData({ ...formData, punctuality: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Conduct</Label>
                <Select
                  value={formData.conduct}
                  onValueChange={(value) =>
                    setFormData({ ...formData, conduct: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BEHAVIOUR_RATINGS.map((rating) => (
                      <SelectItem key={rating.code} value={rating.label}>
                        {rating.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remarks Tab */}
        <TabsContent value="remarks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Remarks & Promotion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Teacher's Remarks</Label>
                <Textarea
                  value={formData.teacher_remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, teacher_remarks: e.target.value })
                  }
                  placeholder="Enter teacher's remarks about student performance..."
                  rows={5}
                />
              </div>

              <div>
                <Label>Promotion Status</Label>
                <Select
                  value={formData.promotion_status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, promotion_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Promoted">Promoted</SelectItem>
                    <SelectItem value="On Probation">On Probation</SelectItem>
                    <SelectItem value="Retained">Retained</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
