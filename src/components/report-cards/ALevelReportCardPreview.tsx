import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, GraduationCap, BookOpen, Award } from "lucide-react";
import { format } from "date-fns";

interface ALevelReportCardPreviewProps {
  reportCardId: string;
  onClose: () => void;
}

// A-Level grading scale with colors
const getALevelGrade = (score: number): { grade: string; descriptor: string; color: { bg: string; text: string } } => {
  if (score >= 80) return { grade: 'A', descriptor: 'Excellent', color: { bg: '#059669', text: '#fff' } };
  if (score >= 70) return { grade: 'B', descriptor: 'Very Good', color: { bg: '#10b981', text: '#fff' } };
  if (score >= 60) return { grade: 'C', descriptor: 'Good', color: { bg: '#34d399', text: '#000' } };
  if (score >= 50) return { grade: 'D', descriptor: 'Credit', color: { bg: '#fbbf24', text: '#000' } };
  if (score >= 40) return { grade: 'E', descriptor: 'Pass', color: { bg: '#f59e0b', text: '#000' } };
  if (score >= 30) return { grade: 'O', descriptor: 'Subsidiary', color: { bg: '#f97316', text: '#fff' } };
  return { grade: 'F', descriptor: 'Fail', color: { bg: '#ef4444', text: '#fff' } };
};

export function ALevelReportCardPreview({ reportCardId, onClose }: ALevelReportCardPreviewProps) {
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
          <title>A-Level Report Card - ${reportCard?.students?.full_name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Open Sans', sans-serif; font-size: 10px; line-height: 1.3; background: #fff; }
            .report-container { max-width: 210mm; margin: 0 auto; border: 3px solid #166534; }
            .header-section { background: linear-gradient(135deg, #166534 0%, #22c55e 100%); color: white; padding: 15px; text-align: center; }
            .school-name { font-family: 'Merriweather', serif; font-size: 22px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; }
            .school-contacts { font-size: 9px; opacity: 0.9; margin-top: 5px; }
            .title-bar { background: #fbbf24; color: #000; padding: 10px; text-align: center; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
            .student-grid { display: grid; grid-template-columns: repeat(4, 1fr); background: #f0fdf4; }
            .student-item { padding: 8px 12px; border: 1px solid #bbf7d0; font-size: 10px; }
            .student-label { color: #166534; font-size: 8px; text-transform: uppercase; font-weight: 600; }
            .student-value { font-weight: 600; color: #14532d; margin-top: 2px; }
            .section-header { background: linear-gradient(90deg, #166534 0%, #22c55e 100%); color: white; padding: 8px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; }
            th { background: #dcfce7; color: #166534; font-weight: 600; padding: 8px 6px; text-align: center; font-size: 9px; border: 1px solid #bbf7d0; }
            td { padding: 8px 6px; border: 1px solid #e5e7eb; font-size: 10px; text-align: center; }
            tr:nth-child(even) { background: #f9fafb; }
            .grade-badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 10px; }
            .avg-row { background: linear-gradient(90deg, #fef3c7 0%, #fde68a 100%) !important; font-weight: 700; }
            .overall-grid { display: grid; grid-template-columns: repeat(3, 1fr); border: 2px solid #166534; margin: 10px; }
            .overall-item { padding: 12px; text-align: center; border-right: 1px solid #166534; }
            .overall-item:last-child { border-right: none; }
            .overall-label { font-size: 9px; color: #166534; text-transform: uppercase; font-weight: 600; }
            .overall-value { font-size: 20px; font-weight: 700; color: #14532d; margin-top: 4px; }
            .key-section { padding: 10px; background: #f0fdf4; font-size: 8px; border-top: 1px solid #bbf7d0; }
            .projects-table th { background: #dbeafe; color: #1e40af; }
            .comment-section { padding: 12px; }
            .comment-box { border: 2px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 10px; }
            .comment-title { background: #f1f5f9; padding: 6px 10px; margin: -12px -12px 10px -12px; font-weight: 600; font-size: 11px; color: #475569; border-radius: 6px 6px 0 0; }
            .comment-text { font-style: italic; color: #64748b; line-height: 1.5; }
            .footer-section { background: linear-gradient(135deg, #166534 0%, #22c55e 100%); color: white; padding: 12px; }
            .footer-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
            .footer-item { text-align: center; }
            .footer-label { font-size: 8px; opacity: 0.8; text-transform: uppercase; }
            .footer-value { font-weight: 600; font-size: 11px; margin-top: 2px; }
            .motto-bar { background: #14532d; color: #fbbf24; text-align: center; padding: 8px; font-weight: 700; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; }
            @media print { body { padding: 0; } .report-container { border: 2px solid #166534; } }
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!reportCard) {
    return <div className="p-6 text-center text-muted-foreground">Report card not found</div>;
  }

  const student = reportCard.students;
  const term = reportCard.academic_terms;
  const studentAge = student?.date_of_birth 
    ? Math.floor((new Date().getTime() - new Date(student.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 'N/A';

  // Calculate averages
  const validScores = scores.filter((s: any) => (s.formative_a1 > 0 || s.formative_a2 > 0 || s.formative_a3 > 0 || s.eot_score > 0));
  
  const calculateTotal = (score: any) => {
    const formativeAvg = ((score.formative_a1 || 0) + (score.formative_a2 || 0) + (score.formative_a3 || 0)) / 3;
    const formative20 = formativeAvg * 0.2;
    const eot80 = (score.eot_score || 0) * 0.8;
    return formative20 + eot80;
  };

  const totalAverage = validScores.length > 0 
    ? validScores.reduce((sum: number, s: any) => sum + calculateTotal(s), 0) / validScores.length 
    : 0;

  const projectActivities = activities.filter((a: any) => a.activity_type === 'projects');

  return (
    <div className="p-6 bg-emerald-50/50 min-h-screen">
      <div className="flex items-center justify-between mb-6 max-w-4xl mx-auto">
        <Button variant="outline" onClick={onClose} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to List
        </Button>
        <Button onClick={handlePrint} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Printer className="h-4 w-4" />
          Print Report Card
        </Button>
      </div>

      <div className="max-w-4xl mx-auto" ref={printRef}>
        <div className="report-container bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-emerald-700">
          
          {/* Header */}
          <div className="header-section bg-gradient-to-br from-emerald-800 to-emerald-600 text-white p-5 text-center">
            {tenant?.logo_url && (
              <img src={tenant.logo_url} alt="School Logo" className="h-14 mx-auto mb-2" style={{ maxHeight: '60px' }} />
            )}
            <h1 className="school-name text-xl font-bold tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>
              {tenant?.name || 'SCHOOL NAME'}
            </h1>
            <p className="school-contacts text-[10px] opacity-90 mt-2">
              {tenant?.address}<br/>
              CONTACTS: {tenant?.phone} | {tenant?.email}
            </p>
          </div>

          {/* Title Bar */}
          <div className="title-bar bg-amber-400 text-center py-3">
            <h2 className="text-base font-bold tracking-wider uppercase flex items-center justify-center gap-2">
              <GraduationCap className="h-5 w-5" />
              A LEVEL END OF {term?.name?.toUpperCase()} REPORT CARD {term?.year}
            </h2>
          </div>

          {/* Student Info Grid */}
          <div className="student-grid grid grid-cols-4 bg-emerald-50">
            <div className="student-item p-3 border border-emerald-200">
              <div className="student-label text-[8px] text-emerald-700 uppercase font-semibold">NAME</div>
              <div className="student-value font-semibold text-emerald-900 text-sm">{student?.full_name}</div>
            </div>
            <div className="student-item p-3 border border-emerald-200">
              <div className="student-label text-[8px] text-emerald-700 uppercase font-semibold">GENDER</div>
              <div className="student-value font-semibold text-emerald-900 capitalize">{student?.gender || 'N/A'}</div>
            </div>
            <div className="student-item p-3 border border-emerald-200">
              <div className="student-label text-[8px] text-emerald-700 uppercase font-semibold">AGE</div>
              <div className="student-value font-semibold text-emerald-900">{studentAge}</div>
            </div>
            <div className="student-item p-3 border border-emerald-200">
              <div className="student-label text-[8px] text-emerald-700 uppercase font-semibold">ROLL NO</div>
              <div className="student-value font-semibold text-emerald-900">{reportCard.roll_number || student?.admission_number}</div>
            </div>
            <div className="student-item p-3 border border-emerald-200">
              <div className="student-label text-[8px] text-emerald-700 uppercase font-semibold">CLASS</div>
              <div className="student-value font-semibold text-emerald-900">{student?.school_classes?.name}</div>
            </div>
            <div className="student-item p-3 border border-emerald-200">
              <div className="student-label text-[8px] text-emerald-700 uppercase font-semibold">STREAM</div>
              <div className="student-value font-semibold text-emerald-900">{reportCard.stream || 'N/A'}</div>
            </div>
            <div className="student-item p-3 border border-emerald-200">
              <div className="student-label text-[8px] text-emerald-700 uppercase font-semibold">COMBINATION</div>
              <div className="student-value font-semibold text-emerald-900">{reportCard.student_combination || 'N/A'}</div>
            </div>
            <div className="student-item p-3 border border-emerald-200">
              <div className="student-label text-[8px] text-emerald-700 uppercase font-semibold">TERM</div>
              <div className="student-value font-semibold text-emerald-900">{term?.term_number || 'ONE'}</div>
            </div>
          </div>

          {/* Term Performance Records */}
          <div className="section-header bg-gradient-to-r from-emerald-700 to-emerald-600 text-white px-4 py-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            <span className="font-bold uppercase tracking-wide">Term Performance Records</span>
          </div>

          <table className="w-full">
            <thead>
              <tr className="bg-emerald-100">
                <th rowSpan={2} className="border border-emerald-200 px-2 py-2 text-left text-[10px] text-emerald-800 font-semibold">Code Subject</th>
                <th colSpan={4} className="border border-emerald-200 px-2 py-2 text-[10px] text-emerald-800 font-semibold">FORMATIVE</th>
                <th colSpan={2} className="border border-emerald-200 px-2 py-2 text-[10px] text-emerald-800 font-semibold">EOT</th>
                <th rowSpan={2} className="border border-emerald-200 px-2 py-2 text-[10px] text-emerald-800 font-semibold">SUMMATIVE<br/>GRADE</th>
                <th rowSpan={2} className="border border-emerald-200 px-2 py-2 text-[10px] text-emerald-800 font-semibold">COMMENT</th>
                <th rowSpan={2} className="border border-emerald-200 px-2 py-2 text-[10px] text-emerald-800 font-semibold">TR</th>
              </tr>
              <tr className="bg-emerald-50">
                <th className="border border-emerald-200 px-2 py-1 text-[9px] text-emerald-700">A1</th>
                <th className="border border-emerald-200 px-2 py-1 text-[9px] text-emerald-700">A2</th>
                <th className="border border-emerald-200 px-2 py-1 text-[9px] text-emerald-700">A3</th>
                <th className="border border-emerald-200 px-2 py-1 text-[9px] text-emerald-700">AVG 20%</th>
                <th className="border border-emerald-200 px-2 py-1 text-[9px] text-emerald-700">80%</th>
                <th className="border border-emerald-200 px-2 py-1 text-[9px] text-emerald-700">100%</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score: any, index: number) => {
                const formativeAvg = ((score.formative_a1 || 0) + (score.formative_a2 || 0) + (score.formative_a3 || 0)) / 3;
                const formative20 = formativeAvg * 0.2;
                const eot80 = (score.eot_score || 0) * 0.8;
                const total100 = formative20 + eot80;
                const { grade, color } = getALevelGrade(total100);
                
                return (
                  <tr key={score.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-200 px-3 py-2 text-left font-medium text-slate-700">
                      <span className="text-slate-500 mr-1">{score.school_subjects?.code}</span>
                      {score.school_subjects?.name}
                    </td>
                    <td className="border border-slate-200 px-2 py-2">{score.formative_a1 || '-'}</td>
                    <td className="border border-slate-200 px-2 py-2">{score.formative_a2 || '-'}</td>
                    <td className="border border-slate-200 px-2 py-2">{score.formative_a3 || '-'}</td>
                    <td className="border border-slate-200 px-2 py-2 font-semibold">{formative20.toFixed(1)}</td>
                    <td className="border border-slate-200 px-2 py-2">{eot80.toFixed(1)}</td>
                    <td className="border border-slate-200 px-2 py-2 font-bold">{total100.toFixed(1)}</td>
                    <td className="border border-slate-200 px-2 py-2">
                      <span 
                        className="grade-badge inline-block px-2 py-1 rounded font-bold text-[10px]"
                        style={{ backgroundColor: color.bg, color: color.text }}
                      >
                        {grade}
                      </span>
                    </td>
                    <td className="border border-slate-200 px-2 py-2 text-left text-[9px] text-slate-600">{score.subject_remark || score.grade_descriptor || ''}</td>
                    <td className="border border-slate-200 px-2 py-2 text-[10px]">{score.teacher_initials || ''}</td>
                  </tr>
                );
              })}
              {/* Average Row */}
              <tr className="avg-row bg-gradient-to-r from-amber-50 to-amber-100 font-bold">
                <td colSpan={4} className="border border-amber-300 px-3 py-2 text-right text-slate-700">AVERAGE SCORES</td>
                <td className="border border-amber-300 px-2 py-2 text-amber-700">{(totalAverage * 0.2).toFixed(1)}%</td>
                <td className="border border-amber-300 px-2 py-2 text-amber-700">{(totalAverage * 0.8).toFixed(1)}%</td>
                <td className="border border-amber-300 px-2 py-2 text-amber-700 text-lg">{totalAverage.toFixed(1)}%</td>
                <td colSpan={3} className="border border-amber-300"></td>
              </tr>
            </tbody>
          </table>

          {/* Overall Section */}
          <div className="overall-grid grid grid-cols-3 border-2 border-emerald-600 m-4 rounded-lg overflow-hidden">
            <div className="overall-item p-4 text-center border-r border-emerald-600 bg-emerald-50">
              <div className="overall-label text-[9px] text-emerald-700 uppercase font-semibold">Overall Identifier</div>
              <div className="overall-value text-3xl font-bold text-emerald-800 mt-1">{reportCard.overall_identifier || '-'}</div>
            </div>
            <div className="overall-item p-4 text-center border-r border-emerald-600 bg-emerald-50">
              <div className="overall-label text-[9px] text-emerald-700 uppercase font-semibold">Overall Achievement</div>
              <div className="overall-value text-sm font-semibold text-emerald-800 mt-2">{reportCard.overall_achievement || '-'}</div>
            </div>
            <div className="overall-item p-4 text-center bg-emerald-50">
              <div className="overall-label text-[9px] text-emerald-700 uppercase font-semibold">Overall Grade</div>
              <div className="overall-value text-3xl font-bold text-emerald-800 mt-1">{reportCard.overall_grade || '-'}</div>
            </div>
          </div>

          {/* Grade Scale & Key */}
          <div className="key-section p-4 bg-slate-50 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-slate-700 mb-2 text-sm">Grade Scale</h4>
                <div className="flex flex-wrap gap-2">
                  {['A', 'B', 'C', 'D'].map(g => {
                    const { color } = getALevelGrade(g === 'A' ? 85 : g === 'B' ? 72 : g === 'C' ? 55 : 42);
                    return (
                      <span key={g} className="text-[10px] flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: color.bg, color: color.text }}>{g}</span>
                        <span className="text-slate-500">{g === 'A' ? '75-100' : g === 'B' ? '65-74' : g === 'C' ? '50-64' : '35-49'}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-slate-700 mb-2 text-sm">Key to Terms</h4>
                <div className="text-[9px] text-slate-600 space-y-1">
                  <div><strong>1 - Basic:</strong> Few LOGs achieved (0.9-1.49)</div>
                  <div><strong>2 - Moderate:</strong> Many LOGs achieved (1.5-2.49)</div>
                  <div><strong>3 - Outstanding:</strong> Most LOGs achieved (2.5-3.0)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Projects Section */}
          {projectActivities.length > 0 && (
            <>
              <div className="section-header bg-gradient-to-r from-blue-700 to-blue-600 text-white px-4 py-3 flex items-center gap-2">
                <Award className="h-5 w-5" />
                <span className="font-bold uppercase tracking-wide">Student's Project Work</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="border border-blue-200 px-3 py-2 text-left text-[10px] text-blue-800 font-semibold">TERMLY PROJECT WORK</th>
                    <th className="border border-blue-200 px-3 py-2 text-[10px] text-blue-800 font-semibold">AVERAGE SCORE</th>
                    <th className="border border-blue-200 px-3 py-2 text-[10px] text-blue-800 font-semibold">GRADE</th>
                    <th className="border border-blue-200 px-3 py-2 text-[10px] text-blue-800 font-semibold">REMARKS</th>
                    <th className="border border-blue-200 px-3 py-2 text-[10px] text-blue-800 font-semibold">TEACHER</th>
                  </tr>
                </thead>
                <tbody>
                  {projectActivities.map((activity: any) => (
                    <tr key={activity.id} className="bg-white">
                      <td className="border border-slate-200 px-3 py-2 font-medium">{activity.activity_name}</td>
                      <td className="border border-slate-200 px-3 py-2 text-center">{activity.average_score || '-'}</td>
                      <td className="border border-slate-200 px-3 py-2 text-center font-bold text-blue-700">{activity.grade || '-'}</td>
                      <td className="border border-slate-200 px-3 py-2">{activity.remark || activity.performance || '-'}</td>
                      <td className="border border-slate-200 px-3 py-2 text-center">{activity.teacher_initials || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* Comments */}
          <div className="comment-section p-4 grid grid-cols-2 gap-4">
            <div className="comment-box border-2 border-slate-200 rounded-lg overflow-hidden">
              <div className="comment-title bg-slate-100 px-4 py-2 font-semibold text-sm text-slate-600 border-b">
                Class Teacher's Comment
              </div>
              <div className="comment-text p-4 italic text-slate-600 text-sm leading-relaxed min-h-[60px]">
                {reportCard.class_teacher_comment || 'No comment provided.'}
              </div>
              <div className="px-4 py-2 border-t border-dashed text-[10px] text-slate-500 italic">Keep it up.</div>
            </div>
            <div className="comment-box border-2 border-slate-200 rounded-lg overflow-hidden">
              <div className="comment-title bg-slate-100 px-4 py-2 font-semibold text-sm text-slate-600 border-b">
                Headteacher's Comment
              </div>
              <div className="comment-text p-4 italic text-slate-600 text-sm leading-relaxed min-h-[60px]">
                {reportCard.head_teacher_comment || 'You are a diligent student who has made significant progress.'}
              </div>
              <div className="px-4 py-2 border-t border-dashed text-[10px] text-slate-500 italic">Keep it up.</div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer-section bg-gradient-to-br from-emerald-800 to-emerald-600 text-white p-4">
            <div className="footer-grid grid grid-cols-4 gap-3">
              <div className="footer-item text-center">
                <div className="footer-label text-[8px] opacity-80 uppercase">Term Ended On</div>
                <div className="footer-value font-semibold text-sm mt-1">
                  {reportCard.term_end_date ? format(new Date(reportCard.term_end_date), 'dd-MMM-yyyy') : '___________'}
                </div>
              </div>
              <div className="footer-item text-center">
                <div className="footer-label text-[8px] opacity-80 uppercase">Next Term Begins</div>
                <div className="footer-value font-semibold text-sm mt-1">
                  {reportCard.next_term_start_date ? format(new Date(reportCard.next_term_start_date), 'dd-MMM-yyyy') : '___________'}
                </div>
              </div>
              <div className="footer-item text-center">
                <div className="footer-label text-[8px] opacity-80 uppercase">Fees Balance</div>
                <div className="footer-value font-semibold text-sm mt-1">Ugx {(reportCard.fees_balance || 0).toLocaleString()}</div>
              </div>
              <div className="footer-item text-center">
                <div className="footer-label text-[8px] opacity-80 uppercase">Fees Next Term</div>
                <div className="footer-value font-semibold text-sm mt-1">Ugx {(reportCard.next_term_fees || 0).toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Motto */}
          <div className="motto-bar bg-emerald-900 text-amber-400 text-center py-2 font-bold tracking-widest uppercase text-sm">
            Success After Struggle
          </div>

        </div>
      </div>
    </div>
  );
}
