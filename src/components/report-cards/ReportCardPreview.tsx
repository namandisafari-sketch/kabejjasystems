import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Award, GraduationCap } from "lucide-react";
import { format } from "date-fns";

interface ReportCardPreviewProps {
  reportCardId: string;
  onClose: () => void;
}

// Grade color mapping
const getGradeColor = (grade: string) => {
  const colors: Record<string, { bg: string; text: string }> = {
    'A*': { bg: '#059669', text: '#fff' },
    'A': { bg: '#10b981', text: '#fff' },
    'B': { bg: '#34d399', text: '#000' },
    'C': { bg: '#fbbf24', text: '#000' },
    'D': { bg: '#f59e0b', text: '#000' },
    'E': { bg: '#f97316', text: '#fff' },
    'F': { bg: '#ef4444', text: '#fff' },
    'G': { bg: '#dc2626', text: '#fff' },
  };
  return colors[grade] || { bg: '#6b7280', text: '#fff' };
};

export function ReportCardPreview({ reportCardId, onClose }: ReportCardPreviewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: tenantData } = useTenant();

  const { data: tenant } = useQuery({
    queryKey: ['tenant', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantData!.tenantId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: reportCard, isLoading } = useQuery({
    queryKey: ['report-card-full', reportCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_report_cards')
        .select(`
          *,
          students(id, full_name, admission_number, date_of_birth, gender, guardian_name, guardian_phone, school_classes!class_id(id, name, level)),
          academic_terms(id, name, term_number, year)
        `)
        .eq('id', reportCardId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: scores = [] } = useQuery({
    queryKey: ['report-card-scores', reportCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_card_scores')
        .select('*, school_subjects(id, name, code)')
        .eq('report_card_id', reportCardId)
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });

  const { data: skills = [] } = useQuery({
    queryKey: ['report-card-skills', reportCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_card_skills')
        .select('*')
        .eq('report_card_id', reportCardId);
      if (error) throw error;
      return data;
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['report-card-activities', reportCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_card_activities')
        .select('*')
        .eq('report_card_id', reportCardId);
      if (error) throw error;
      return data;
    },
  });

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Report Card - ${reportCard?.students?.full_name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Open Sans', sans-serif; font-size: 11px; line-height: 1.4; padding: 15px; background: #fff; }
            .report-container { max-width: 210mm; margin: 0 auto; border: 3px solid #1e3a5f; border-radius: 8px; overflow: hidden; }
            .header-section { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 20px; text-align: center; }
            .header-section img { max-height: 70px; margin-bottom: 10px; }
            .school-name { font-family: 'Merriweather', serif; font-size: 24px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px; }
            .school-motto { font-style: italic; font-size: 12px; opacity: 0.9; margin-bottom: 8px; }
            .school-contacts { font-size: 10px; opacity: 0.85; }
            .report-title { background: #f59e0b; color: #000; padding: 8px; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
            .term-info { background: #fef3c7; padding: 6px; font-weight: 600; font-size: 12px; border-bottom: 2px solid #f59e0b; }
            .student-grid { display: grid; grid-template-columns: repeat(3, 1fr); background: #f8fafc; }
            .student-item { padding: 10px 15px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; font-size: 11px; }
            .student-item:nth-child(3n) { border-right: none; }
            .student-label { color: #64748b; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
            .student-value { font-weight: 600; color: #1e293b; }
            .section { margin: 0; }
            .section-header { background: linear-gradient(90deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 10px 15px; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 8px; }
            .section-header svg { width: 18px; height: 18px; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #e2e8f0; color: #1e293b; font-weight: 600; padding: 10px 8px; text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; }
            td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
            tr:nth-child(even) { background: #f8fafc; }
            tr:hover { background: #f1f5f9; }
            .grade-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 11px; min-width: 35px; text-align: center; }
            .total-row { background: linear-gradient(90deg, #fef3c7 0%, #fde68a 100%) !important; font-weight: 700; }
            .total-row td { border-top: 2px solid #f59e0b; }
            .grading-key { display: flex; flex-wrap: wrap; gap: 8px; padding: 12px 15px; background: #f8fafc; border-top: 1px solid #e2e8f0; justify-content: center; }
            .grade-key-item { display: flex; align-items: center; gap: 4px; font-size: 9px; }
            .grade-key-badge { padding: 2px 6px; border-radius: 3px; font-weight: 600; font-size: 8px; }
            .skills-container { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0; }
            .skills-column { border-right: 1px solid #e2e8f0; }
            .skills-column:last-child { border-right: none; }
            .activities-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
            .activity-column { padding: 12px; border-right: 1px solid #e2e8f0; }
            .activity-column:last-child { border-right: none; }
            .activity-title { font-weight: 600; color: #1e3a5f; margin-bottom: 8px; font-size: 11px; text-transform: uppercase; }
            .discipline-box { padding: 15px; background: #f0fdf4; border-left: 4px solid #22c55e; margin: 15px; border-radius: 0 8px 8px 0; }
            .discipline-label { font-size: 10px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
            .discipline-value { font-size: 14px; font-weight: 600; color: #166534; }
            .comments-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; padding: 15px; }
            .comment-card { border: 2px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            .comment-header { background: #f1f5f9; padding: 10px 12px; font-weight: 600; font-size: 11px; color: #475569; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
            .comment-body { padding: 12px; min-height: 60px; font-style: italic; color: #475569; font-size: 11px; line-height: 1.5; }
            .signature-area { padding: 10px 12px; border-top: 1px dashed #cbd5e1; font-size: 10px; color: #64748b; }
            .footer-section { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 15px; text-align: center; }
            .footer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 10px; }
            .footer-item { text-align: center; }
            .footer-label { font-size: 9px; opacity: 0.8; text-transform: uppercase; margin-bottom: 4px; }
            .footer-value { font-weight: 600; font-size: 11px; }
            .generated-date { font-size: 9px; opacity: 0.7; margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2); }
            .prefect-badge { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }
            .rank-highlight { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 8px 16px; border-radius: 8px; text-align: center; }
            .rank-number { font-size: 24px; font-weight: 700; }
            .rank-label { font-size: 9px; opacity: 0.9; text-transform: uppercase; }
            @media print { 
              body { padding: 0; } 
              .report-container { max-width: 100%; border-radius: 0; }
            }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!reportCard) {
    return <div className="p-6 text-center text-muted-foreground">Report card not found</div>;
  }

  const student = reportCard.students;
  const term = reportCard.academic_terms;
  const genericSkills = skills.filter((s: any) => s.skill_category === 'generic');
  const values = skills.filter((s: any) => s.skill_category === 'values');
  const sportsActivities = activities.filter((a: any) => a.activity_type === 'sports');
  const clubsActivities = activities.filter((a: any) => a.activity_type === 'clubs');
  const projectsActivities = activities.filter((a: any) => a.activity_type === 'projects');

  const attendancePercentage = reportCard.total_school_days > 0 
    ? ((reportCard.days_present / reportCard.total_school_days) * 100).toFixed(0) 
    : 0;

  return (
    <div className="p-6 bg-muted/30 min-h-screen">
      <div className="flex items-center justify-between mb-6 max-w-4xl mx-auto">
        <Button variant="outline" onClick={onClose} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to List
        </Button>
        <Button onClick={handlePrint} className="gap-2 bg-primary">
          <Printer className="h-4 w-4" />
          Print Report Card
        </Button>
      </div>

      <div className="max-w-4xl mx-auto" ref={printRef}>
        <div className="report-container bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-[#1e3a5f]">
          
          {/* Header Section */}
          <div className="header-section bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] text-white p-6 text-center">
            {tenant?.logo_url && (
              <img src={tenant.logo_url} alt="School Logo" className="h-16 mx-auto mb-3" style={{ maxHeight: '70px' }} />
            )}
            <h1 className="school-name text-2xl font-bold tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
              {tenant?.name || 'School Name'}
            </h1>
            <p className="school-motto text-sm italic opacity-90 mb-2">Excellence in Education</p>
            <p className="school-contacts text-xs opacity-80">
              {tenant?.address} | {tenant?.phone} | {tenant?.email}
            </p>
          </div>

          {/* Report Title Bar */}
          <div className="report-title bg-amber-400 text-center py-3">
            <h2 className="text-lg font-bold tracking-wider uppercase flex items-center justify-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Student Report Card
            </h2>
          </div>
          <div className="term-info bg-amber-50 text-center py-2 border-b-2 border-amber-400">
            <span className="font-semibold text-amber-900">{term?.name} {term?.year}</span>
          </div>

          {/* Student Information Grid */}
          <div className="student-grid grid grid-cols-3 bg-slate-50">
            <div className="student-item p-3 border-b border-r border-slate-200">
              <div className="student-label text-[9px] text-slate-500 uppercase tracking-wide mb-1">Full Name</div>
              <div className="student-value font-semibold text-slate-800">{student?.full_name}</div>
            </div>
            <div className="student-item p-3 border-b border-r border-slate-200">
              <div className="student-label text-[9px] text-slate-500 uppercase tracking-wide mb-1">Admission No</div>
              <div className="student-value font-semibold text-slate-800">{student?.admission_number}</div>
            </div>
            <div className="student-item p-3 border-b border-slate-200">
              <div className="student-label text-[9px] text-slate-500 uppercase tracking-wide mb-1">Class</div>
              <div className="student-value font-semibold text-slate-800">{student?.school_classes?.name}</div>
            </div>
            <div className="student-item p-3 border-b border-r border-slate-200">
              <div className="student-label text-[9px] text-slate-500 uppercase tracking-wide mb-1">Date of Birth</div>
              <div className="student-value font-semibold text-slate-800">
                {student?.date_of_birth ? format(new Date(student.date_of_birth), 'dd MMM yyyy') : 'N/A'}
              </div>
            </div>
            <div className="student-item p-3 border-b border-r border-slate-200">
              <div className="student-label text-[9px] text-slate-500 uppercase tracking-wide mb-1">Gender</div>
              <div className="student-value font-semibold text-slate-800 capitalize">{student?.gender || 'N/A'}</div>
            </div>
            <div className="student-item p-3 border-b border-slate-200">
              <div className="student-label text-[9px] text-slate-500 uppercase tracking-wide mb-1">Guardian</div>
              <div className="student-value font-semibold text-slate-800">{student?.guardian_name || 'N/A'}</div>
            </div>
            <div className="student-item p-3 border-r border-slate-200">
              <div className="student-label text-[9px] text-slate-500 uppercase tracking-wide mb-1">Attendance</div>
              <div className="student-value font-semibold text-slate-800">
                {reportCard.days_present || 0}/{reportCard.total_school_days || 0} days 
                <span className="text-emerald-600 ml-1">({attendancePercentage}%)</span>
              </div>
            </div>
            <div className="student-item p-3 border-r border-slate-200 flex items-center justify-center">
              <div className="rank-highlight bg-gradient-to-br from-blue-500 to-blue-700 text-white px-4 py-2 rounded-lg text-center">
                <div className="rank-number text-2xl font-bold">{reportCard.class_rank || '-'}</div>
                <div className="rank-label text-[8px] uppercase opacity-90">of {reportCard.total_students_in_class || '-'}</div>
              </div>
            </div>
            <div className="student-item p-3 flex items-center">
              {reportCard.is_prefect && (
                <span className="prefect-badge bg-gradient-to-r from-amber-400 to-amber-500 text-white px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  {reportCard.prefect_title || 'Prefect'}
                </span>
              )}
            </div>
          </div>

          {/* Academic Performance */}
          <div className="section">
            <div className="section-header bg-gradient-to-r from-[#1e3a5f] to-[#2d5a87] text-white px-4 py-3 flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              <span className="font-bold uppercase tracking-wide">Academic Performance</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left px-3 py-3 text-xs uppercase text-slate-600 font-semibold border-b-2 border-slate-200" style={{ width: '25%' }}>Subject</th>
                  <th className="text-center px-2 py-3 text-xs uppercase text-slate-600 font-semibold border-b-2 border-slate-200" style={{ width: '12%' }}>Formative (20%)</th>
                  <th className="text-center px-2 py-3 text-xs uppercase text-slate-600 font-semibold border-b-2 border-slate-200" style={{ width: '12%' }}>Exam (80%)</th>
                  <th className="text-center px-2 py-3 text-xs uppercase text-slate-600 font-semibold border-b-2 border-slate-200" style={{ width: '10%' }}>Total</th>
                  <th className="text-center px-2 py-3 text-xs uppercase text-slate-600 font-semibold border-b-2 border-slate-200" style={{ width: '8%' }}>Grade</th>
                  <th className="text-left px-3 py-3 text-xs uppercase text-slate-600 font-semibold border-b-2 border-slate-200" style={{ width: '33%' }}>Remark</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score: any, index: number) => {
                  const gradeColor = getGradeColor(score.grade);
                  return (
                    <tr key={score.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      <td className="px-3 py-3 font-medium text-slate-700 border-b border-slate-100">{score.school_subjects?.name}</td>
                      <td className="text-center px-2 py-3 border-b border-slate-100">{score.formative_score || '-'}</td>
                      <td className="text-center px-2 py-3 border-b border-slate-100">{score.school_based_score || '-'}</td>
                      <td className="text-center px-2 py-3 font-bold border-b border-slate-100">{score.total_score?.toFixed(1) || '-'}</td>
                      <td className="text-center px-2 py-3 border-b border-slate-100">
                        <span 
                          className="grade-badge inline-block px-3 py-1 rounded font-bold text-xs"
                          style={{ backgroundColor: gradeColor.bg, color: gradeColor.text }}
                        >
                          {score.grade || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-slate-600 border-b border-slate-100 text-sm">{score.subject_remark || score.grade_descriptor || '-'}</td>
                    </tr>
                  );
                })}
                <tr className="total-row bg-gradient-to-r from-amber-50 to-amber-100">
                  <td colSpan={3} className="px-3 py-3 font-bold text-slate-800 border-t-2 border-amber-300">OVERALL AVERAGE</td>
                  <td className="text-center px-2 py-3 font-bold text-lg text-amber-700 border-t-2 border-amber-300">{reportCard.average_score?.toFixed(1) || 0}%</td>
                  <td colSpan={2} className="border-t-2 border-amber-300"></td>
                </tr>
              </tbody>
            </table>
            
            {/* Grading Key */}
            <div className="grading-key flex flex-wrap gap-2 px-4 py-3 bg-slate-50 border-t border-slate-200 justify-center">
              {[
                { grade: 'A*', range: '90-100', color: getGradeColor('A*') },
                { grade: 'A', range: '80-89', color: getGradeColor('A') },
                { grade: 'B', range: '70-79', color: getGradeColor('B') },
                { grade: 'C', range: '60-69', color: getGradeColor('C') },
                { grade: 'D', range: '50-59', color: getGradeColor('D') },
                { grade: 'E', range: '40-49', color: getGradeColor('E') },
                { grade: 'F', range: '30-39', color: getGradeColor('F') },
                { grade: 'G', range: '<30', color: getGradeColor('G') },
              ].map(item => (
                <div key={item.grade} className="flex items-center gap-1 text-[10px]">
                  <span 
                    className="px-2 py-0.5 rounded text-[9px] font-bold"
                    style={{ backgroundColor: item.color.bg, color: item.color.text }}
                  >
                    {item.grade}
                  </span>
                  <span className="text-slate-500">{item.range}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Skills & Values */}
          {(genericSkills.length > 0 || values.length > 0) && (
            <div className="section">
              <div className="section-header bg-gradient-to-r from-[#1e3a5f] to-[#2d5a87] text-white px-4 py-3">
                <span className="font-bold uppercase tracking-wide">Generic Skills & Values</span>
              </div>
              <div className="skills-container grid grid-cols-2">
                {genericSkills.length > 0 && (
                  <div className="skills-column border-r border-slate-200">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="text-left px-3 py-2 text-xs uppercase text-slate-600 font-semibold">Generic Skills</th>
                          <th className="text-center px-3 py-2 text-xs uppercase text-slate-600 font-semibold">Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {genericSkills.map((skill: any) => (
                          <tr key={skill.id} className="border-b border-slate-100">
                            <td className="px-3 py-2 text-sm">{skill.skill_name}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                {skill.rating || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {values.length > 0 && (
                  <div className="skills-column">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="text-left px-3 py-2 text-xs uppercase text-slate-600 font-semibold">Values</th>
                          <th className="text-center px-3 py-2 text-xs uppercase text-slate-600 font-semibold">Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {values.map((skill: any) => (
                          <tr key={skill.id} className="border-b border-slate-100">
                            <td className="px-3 py-2 text-sm">{skill.skill_name}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                {skill.rating || '-'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activities */}
          {activities.length > 0 && (
            <div className="section">
              <div className="section-header bg-gradient-to-r from-[#1e3a5f] to-[#2d5a87] text-white px-4 py-3">
                <span className="font-bold uppercase tracking-wide">Co-curricular Activities</span>
              </div>
              <div className="activities-grid grid grid-cols-3">
                {sportsActivities.length > 0 && (
                  <div className="activity-column p-3 border-r border-slate-200">
                    <div className="activity-title text-sm font-semibold text-[#1e3a5f] mb-2 uppercase">Sports & Games</div>
                    {sportsActivities.map((a: any) => (
                      <div key={a.id} className="flex justify-between py-1 text-sm border-b border-slate-100">
                        <span>{a.activity_name}</span>
                        <span className="text-emerald-600 font-medium">{a.performance}</span>
                      </div>
                    ))}
                  </div>
                )}
                {clubsActivities.length > 0 && (
                  <div className="activity-column p-3 border-r border-slate-200">
                    <div className="activity-title text-sm font-semibold text-[#1e3a5f] mb-2 uppercase">Clubs</div>
                    {clubsActivities.map((a: any) => (
                      <div key={a.id} className="flex justify-between py-1 text-sm border-b border-slate-100">
                        <span>{a.activity_name}</span>
                        <span className="text-emerald-600 font-medium">{a.performance}</span>
                      </div>
                    ))}
                  </div>
                )}
                {projectsActivities.length > 0 && (
                  <div className="activity-column p-3">
                    <div className="activity-title text-sm font-semibold text-[#1e3a5f] mb-2 uppercase">Projects</div>
                    {projectsActivities.map((a: any) => (
                      <div key={a.id} className="flex justify-between py-1 text-sm border-b border-slate-100">
                        <span>{a.activity_name}</span>
                        <span className="text-emerald-600 font-medium">{a.performance}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Discipline */}
          <div className="discipline-box m-4 p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg">
            <div className="discipline-label text-[10px] text-slate-500 uppercase tracking-wide mb-1">Conduct & Discipline</div>
            <div className="discipline-value text-base font-semibold text-emerald-700">{reportCard.discipline_remark || 'Well disciplined'}</div>
          </div>

          {/* Comments */}
          <div className="comments-grid grid grid-cols-2 gap-4 p-4">
            <div className="comment-card border-2 border-slate-200 rounded-lg overflow-hidden">
              <div className="comment-header bg-slate-100 px-3 py-2 font-semibold text-sm text-slate-600 uppercase border-b border-slate-200">
                Class Teacher's Comment
              </div>
              <div className="comment-body p-3 min-h-[60px] italic text-slate-600 text-sm leading-relaxed">
                {reportCard.class_teacher_comment || 'No comment provided.'}
              </div>
              <div className="signature-area px-3 py-2 border-t border-dashed border-slate-200 text-xs text-slate-500">
                <strong>Signature:</strong> {reportCard.class_teacher_signature || '_________________'}
              </div>
            </div>
            <div className="comment-card border-2 border-slate-200 rounded-lg overflow-hidden">
              <div className="comment-header bg-slate-100 px-3 py-2 font-semibold text-sm text-slate-600 uppercase border-b border-slate-200">
                Head Teacher's Comment
              </div>
              <div className="comment-body p-3 min-h-[60px] italic text-slate-600 text-sm leading-relaxed">
                {reportCard.head_teacher_comment || 'No comment provided.'}
              </div>
              <div className="signature-area px-3 py-2 border-t border-dashed border-slate-200 text-xs text-slate-500">
                <strong>Signature:</strong> {reportCard.head_teacher_signature || '_________________'}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer-section bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] text-white p-4">
            <div className="footer-grid grid grid-cols-3 gap-4 mb-3">
              <div className="footer-item text-center">
                <div className="footer-label text-[9px] opacity-80 uppercase mb-1">Next Term Begins</div>
                <div className="footer-value font-semibold text-sm">
                  {reportCard.next_term_start_date ? format(new Date(reportCard.next_term_start_date), 'dd MMM yyyy') : '______________'}
                </div>
              </div>
              <div className="footer-item text-center">
                <div className="footer-label text-[9px] opacity-80 uppercase mb-1">Fees Balance</div>
                <div className="footer-value font-semibold text-sm">Ugx {(reportCard.fees_balance || 0).toLocaleString()}</div>
              </div>
              <div className="footer-item text-center">
                <div className="footer-label text-[9px] opacity-80 uppercase mb-1">Next Term Fees</div>
                <div className="footer-value font-semibold text-sm">Ugx {(reportCard.next_term_fees || 0).toLocaleString()}</div>
              </div>
            </div>
            <div className="generated-date text-center text-[10px] opacity-70 pt-3 border-t border-white/20">
              Generated on {new Date().toLocaleDateString('en-UG', { dateStyle: 'full' })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
