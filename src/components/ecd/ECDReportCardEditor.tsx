import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ArrowLeft, Save, Star, CheckCircle, Trophy, Calendar, Wallet } from 'lucide-react';
import { format } from 'date-fns';

interface ECDReportCardEditorProps {
  reportCardId: string;
  onClose: () => void;
}

const RATING_OPTIONS = [
  { value: 'EXCELLENT', label: 'Excellent (90-100)' },
  { value: 'VERY_GOOD', label: 'Very Good (80-89)' },
  { value: 'GOOD', label: 'Good (70-79)' },
  { value: 'FAIR', label: 'Fair (60-69)' },
  { value: 'AVERAGE', label: 'Average (50-59)' },
  { value: 'NEEDS_IMPROVEMENT', label: 'Needs Improvement (<50)' },
];

const ECDReportCardEditor = ({ reportCardId, onClose }: ECDReportCardEditorProps) => {
  const tenantQuery = useTenant();
  const tenantId = tenantQuery.data?.tenantId;
  const queryClient = useQueryClient();

  // Form states
  const [totalDays, setTotalDays] = useState(0);
  const [daysPresent, setDaysPresent] = useState(0);
  const [teacherComment, setTeacherComment] = useState('');
  const [headTeacherComment, setHeadTeacherComment] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [headTeacherName, setHeadTeacherName] = useState('');
  const [isPrefect, setIsPrefect] = useState(false);
  const [classRank, setClassRank] = useState<number | null>(null);
  const [totalStudents, setTotalStudents] = useState<number | null>(null);
  
  // Fees and dates
  const [feesBalance, setFeesBalance] = useState(0);
  const [nextTermFees, setNextTermFees] = useState(0);
  const [termClosingDate, setTermClosingDate] = useState('');
  const [nextTermStartDate, setNextTermStartDate] = useState('');
  
  // Learning area scores (out of 100)
  const [learningScores, setLearningScores] = useState<Record<string, { score: number; remark: string }>>({});
  
  // Activity ratings with comments
  const [activityRatings, setActivityRatings] = useState<Record<string, { rating: string; comment: string }>>({});

  // Fetch report card
  const { data: reportCard, isLoading: reportCardLoading } = useQuery({
    queryKey: ['ecd-report-card', reportCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecd_report_cards')
        .select(`
          *,
          students(full_name, admission_number, photo_url),
          school_classes(name, section),
          academic_terms(name, year, term_number, start_date, end_date)
        `)
        .eq('id', reportCardId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch learning areas
  const { data: learningAreas = [] } = useQuery({
    queryKey: ['ecd-learning-areas', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecd_learning_areas')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch learning activities
  const { data: activities = [] } = useQuery({
    queryKey: ['ecd-learning-activities', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecd_learning_activities')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch existing learning ratings
  const { data: existingLearningRatings = [] } = useQuery({
    queryKey: ['ecd-learning-ratings', reportCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecd_learning_ratings')
        .select('*')
        .eq('report_card_id', reportCardId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing activity ratings with comments
  const { data: existingActivityRatings = [] } = useQuery({
    queryKey: ['ecd-activity-ratings', reportCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecd_activity_ratings')
        .select('*')
        .eq('report_card_id', reportCardId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch student's fees balance from fee_payments and student_fees
  const { data: studentFees } = useQuery({
    queryKey: ['student-fees-balance', reportCard?.student_id],
    queryFn: async () => {
      // Get total fees from fee_structures for the student's class
      const { data: studentData } = await supabase
        .from('students')
        .select('class_id')
        .eq('id', reportCard?.student_id)
        .single();
      
      if (!studentData?.class_id) return 0;
      
      // Get class level
      const { data: classData } = await supabase
        .from('school_classes')
        .select('name')
        .eq('id', studentData.class_id)
        .single();
      
      // Get fee structures for this level
      const { data: feeStructures } = await supabase
        .from('fee_structures')
        .select('amount')
        .eq('tenant_id', tenantId)
        .eq('is_active', true);
      
      const totalDue = feeStructures?.reduce((sum, f) => sum + (f.amount || 0), 0) || 0;
      
      // Get payments made
      const { data: payments } = await supabase
        .from('fee_payments')
        .select('amount')
        .eq('student_id', reportCard?.student_id);
      
      const totalPaid = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      
      return totalDue - totalPaid;
    },
    enabled: !!reportCard?.student_id && !!tenantId,
  });

  // Fetch days attended from gate_checkins
  const { data: attendanceData } = useQuery({
    queryKey: ['student-attendance', reportCard?.student_id, reportCard?.term_id],
    queryFn: async () => {
      if (!reportCard?.academic_terms) return { daysPresent: 0, totalDays: 0 };
      
      const startDate = reportCard.academic_terms.start_date;
      const endDate = reportCard.academic_terms.end_date;
      
      // Count unique days with check-in
      const { data, error } = await supabase
        .from('gate_checkins')
        .select('checked_at')
        .eq('student_id', reportCard.student_id)
        .eq('check_type', 'in')
        .gte('checked_at', startDate)
        .lte('checked_at', endDate);
      
      if (error) throw error;
      
      // Count unique dates
      const uniqueDays = new Set(
        data?.map(c => new Date(c.checked_at).toDateString())
      );
      
      // Calculate total school days (weekdays between start and end)
      const start = new Date(startDate);
      const end = new Date(endDate);
      let totalDays = 0;
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const day = d.getDay();
        if (day !== 0 && day !== 6) totalDays++;
      }
      
      return { daysPresent: uniqueDays.size, totalDays };
    },
    enabled: !!reportCard?.student_id && !!reportCard?.academic_terms,
  });

  // Initialize form with existing data
  useEffect(() => {
    if (reportCard) {
      setTotalDays(reportCard.total_school_days || 0);
      setDaysPresent(reportCard.days_present || 0);
      setTeacherComment(reportCard.teacher_comment || '');
      setHeadTeacherComment(reportCard.head_teacher_comment || '');
      setTeacherName(reportCard.teacher_name || '');
      setHeadTeacherName(reportCard.head_teacher_name || '');
      setIsPrefect(reportCard.is_prefect || false);
      setClassRank(reportCard.class_rank);
      setTotalStudents(reportCard.total_students_in_class);
      setFeesBalance(reportCard.fees_balance || 0);
      setNextTermFees(reportCard.next_term_fees || 0);
      setTermClosingDate(reportCard.term_closing_date || reportCard.academic_terms?.end_date || '');
      setNextTermStartDate(reportCard.next_term_start_date || '');
    }
  }, [reportCard]);

  // Auto-populate fees balance from student_fees
  useEffect(() => {
    if (studentFees !== undefined && studentFees > 0 && feesBalance === 0) {
      setFeesBalance(studentFees);
    }
  }, [studentFees]);

  // Auto-populate attendance from gate_checkins
  useEffect(() => {
    if (attendanceData && totalDays === 0 && daysPresent === 0) {
      setTotalDays(attendanceData.totalDays);
      setDaysPresent(attendanceData.daysPresent);
    }
  }, [attendanceData]);

  useEffect(() => {
    const scores: Record<string, { score: number; remark: string }> = {};
    existingLearningRatings.forEach(r => {
      scores[r.learning_area_id] = { 
        score: r.numeric_score || 0,
        remark: r.grade_remark || r.remark || ''
      };
    });
    setLearningScores(scores);
  }, [existingLearningRatings]);

  useEffect(() => {
    const ratings: Record<string, { rating: string; comment: string }> = {};
    existingActivityRatings.forEach(r => {
      ratings[r.activity_id] = { 
        rating: r.rating_code, 
        comment: (r as any).comment || '' 
      };
    });
    setActivityRatings(ratings);
  }, [existingActivityRatings]);

  // Calculate totals
  const calculateTotalScore = () => {
    return Object.values(learningScores).reduce((sum, s) => sum + (s.score || 0), 0);
  };
  
  const calculateAverageScore = () => {
    const scores = Object.values(learningScores).filter(s => s.score > 0);
    if (scores.length === 0) return 0;
    return scores.reduce((sum, s) => sum + s.score, 0) / scores.length;
  };

  // Get remark based on score
  const getScoreRemark = (score: number) => {
    if (score >= 90) return 'EXCELLENT';
    if (score >= 80) return 'VERY GOOD';
    if (score >= 70) return 'GOOD';
    if (score >= 60) return 'FAIR';
    if (score >= 50) return 'AVERAGE';
    return 'NEEDS IMPROVEMENT';
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const avgScore = calculateAverageScore();
      const totalScore = calculateTotalScore();
      
      // Update report card
      const { error: rcError } = await supabase
        .from('ecd_report_cards')
        .update({
          total_school_days: totalDays,
          days_present: daysPresent,
          days_absent: totalDays - daysPresent,
          teacher_comment: teacherComment,
          head_teacher_comment: headTeacherComment,
          teacher_name: teacherName,
          head_teacher_name: headTeacherName,
          is_prefect: isPrefect,
          average_score: avgScore,
          total_score: totalScore,
          class_rank: classRank,
          total_students_in_class: totalStudents,
          fees_balance: feesBalance,
          next_term_fees: nextTermFees,
          term_closing_date: termClosingDate || null,
          next_term_start_date: nextTermStartDate || null,
        })
        .eq('id', reportCardId);
      if (rcError) throw rcError;

      // Upsert learning ratings with numeric scores (out of 100)
      const learningRatingsData = Object.entries(learningScores)
        .filter(([_, v]) => v.score > 0)
        .map(([areaId, v]) => ({
          report_card_id: reportCardId,
          learning_area_id: areaId,
          rating_code: getScoreRemark(v.score),
          numeric_score: v.score,
          grade_remark: v.remark || getScoreRemark(v.score),
          remark: v.remark || getScoreRemark(v.score),
        }));

      if (learningRatingsData.length > 0) {
        const { error: lrError } = await supabase
          .from('ecd_learning_ratings')
          .upsert(learningRatingsData, { onConflict: 'report_card_id,learning_area_id' });
        if (lrError) throw lrError;
      }

      // Upsert activity ratings with comments
      const activityRatingsData = Object.entries(activityRatings)
        .filter(([_, v]) => v.rating)
        .map(([activityId, data]) => ({
          report_card_id: reportCardId,
          activity_id: activityId,
          rating_code: data.rating,
          comment: data.comment || null,
        }));

      if (activityRatingsData.length > 0) {
        const { error: arError } = await supabase
          .from('ecd_activity_ratings')
          .upsert(activityRatingsData, { onConflict: 'report_card_id,activity_id' });
        if (arError) throw arError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-report-cards'] });
      toast.success('Report card saved');
    },
    onError: (error) => {
      console.error('Save error:', error);
      toast.error('Failed to save report card');
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      await saveMutation.mutateAsync();
      const { error } = await supabase
        .from('ecd_report_cards')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', reportCardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecd-report-cards'] });
      toast.success('Report card published');
      onClose();
    },
    onError: () => toast.error('Failed to publish report card'),
  });

  if (reportCardLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!reportCard) {
    return <div>Report card not found</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              {reportCard.students?.full_name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {reportCard.school_classes?.name} • {reportCard.academic_terms?.name} {reportCard.academic_terms?.year}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save Draft</span>
            <span className="sm:hidden">Save</span>
          </Button>
          <Button 
            onClick={() => publishMutation.mutate()} 
            disabled={publishMutation.isPending}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Publish
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-green-700">{calculateTotalScore()}</p>
              <p className="text-xs text-muted-foreground">Total Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{calculateAverageScore().toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">Average</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{classRank || '-'}</p>
              <p className="text-xs text-muted-foreground">Position</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{daysPresent}/{totalDays}</p>
              <p className="text-xs text-muted-foreground">Attendance</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance & Position */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Attendance & Position
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total School Days</Label>
                <Input
                  type="number"
                  value={totalDays}
                  onChange={(e) => setTotalDays(parseInt(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label>Days Present</Label>
                <Input
                  type="number"
                  value={daysPresent}
                  onChange={(e) => setDaysPresent(parseInt(e.target.value) || 0)}
                  max={totalDays}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Class Position</Label>
                <Input
                  type="number"
                  value={classRank || ''}
                  onChange={(e) => setClassRank(parseInt(e.target.value) || null)}
                  placeholder="e.g. 1, 2, 3"
                />
              </div>
              <div>
                <Label>Total Students</Label>
                <Input
                  type="number"
                  value={totalStudents || ''}
                  onChange={(e) => setTotalStudents(parseInt(e.target.value) || null)}
                  placeholder="e.g. 25"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-600" />
                <span className="font-medium">Class Prefect / Helper</span>
              </div>
              <Switch
                checked={isPrefect}
                onCheckedChange={setIsPrefect}
              />
            </div>
          </CardContent>
        </Card>

        {/* Fees & Dates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Fees & Term Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fees Balance (USh)</Label>
                <Input
                  type="number"
                  value={feesBalance}
                  onChange={(e) => setFeesBalance(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 150000"
                />
              </div>
              <div>
                <Label>Next Term Fees (USh)</Label>
                <Input
                  type="number"
                  value={nextTermFees}
                  onChange={(e) => setNextTermFees(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 350000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Term Closing Date</Label>
                <Input
                  type="date"
                  value={termClosingDate}
                  onChange={(e) => setTermClosingDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Next Term Starts</Label>
                <Input
                  type="date"
                  value={nextTermStartDate}
                  onChange={(e) => setNextTermStartDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Class Teacher</Label>
                <Input
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Teacher's name"
                />
              </div>
              <div>
                <Label>Head Teacher</Label>
                <Input
                  value={headTeacherName}
                  onChange={(e) => setHeadTeacherName(e.target.value)}
                  placeholder="Head teacher's name"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Learning Areas - Scores out of 100 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Achievement Scores in Learning Areas (Out of 100)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {learningAreas.slice(0, 5).map((area, idx) => (
              <div key={area.id} className="border rounded-lg p-4 bg-gradient-to-r from-green-50 to-white">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{area.icon}</span>
                  <span className="font-bold">Learning Area {idx + 1}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{area.description || area.name}</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Score (0-100)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={learningScores[area.id]?.score || ''}
                      onChange={(e) => {
                        const score = parseInt(e.target.value) || 0;
                        setLearningScores(prev => ({
                          ...prev,
                          [area.id]: { 
                            score: Math.min(100, Math.max(0, score)),
                            remark: getScoreRemark(score)
                          }
                        }));
                      }}
                      placeholder="Enter score (0-100)"
                      className="text-lg font-bold"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Remark</Label>
                    <Input
                      value={learningScores[area.id]?.remark || getScoreRemark(learningScores[area.id]?.score || 0)}
                      onChange={(e) => setLearningScores(prev => ({
                        ...prev,
                        [area.id]: { ...prev[area.id], remark: e.target.value }
                      }))}
                      placeholder="e.g. EXCELLENT"
                      className="text-red-600 font-bold italic"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Learning Activities */}
      {activities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance in Learning Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activities.map(activity => (
                <div key={activity.id} className="border rounded-lg p-3 bg-gray-50 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{activity.icon}</span>
                    <span className="font-medium text-sm">{activity.name}</span>
                  </div>
                  <Select
                    value={activityRatings[activity.id]?.rating || ''}
                    onValueChange={(value) => setActivityRatings(prev => ({
                      ...prev,
                      [activity.id]: { ...prev[activity.id], rating: value }
                    }))}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Select rating" />
                    </SelectTrigger>
                    <SelectContent>
                      {RATING_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={activityRatings[activity.id]?.comment || ''}
                    onChange={(e) => setActivityRatings(prev => ({
                      ...prev,
                      [activity.id]: { ...prev[activity.id], comment: e.target.value }
                    }))}
                    placeholder="Teacher comment..."
                    className="text-xs"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Comments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Class Teacher's Comment</Label>
            <Textarea
              value={teacherComment}
              onChange={(e) => setTeacherComment(e.target.value)}
              placeholder="Comment on the learner's progress..."
              rows={3}
            />
          </div>
          <div>
            <Label>Head Teacher's Comment</Label>
            <Textarea
              value={headTeacherComment}
              onChange={(e) => setHeadTeacherComment(e.target.value)}
              placeholder="Head teacher's remarks..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ECDReportCardEditor;
