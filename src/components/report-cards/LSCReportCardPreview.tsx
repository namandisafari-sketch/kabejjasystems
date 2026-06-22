import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { format } from "date-fns";
import { 
  LSC_GRADING_SCALE, 
  LSC_COMPETENCIES, 
  getGradeFromScore, 
  getGradeColor,
  calculateOverallAchievement,
  getGradeDescription
} from "@/lib/lsc-report-card-utils";

interface LSCReportCardPreviewProps {
  reportCardId: string;
  onClose: () => void;
}

export function LSCReportCardPreview({ reportCardId, onClose }: LSCReportCardPreviewProps) {
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
    queryKey: ['report-card-full-lsc', reportCardId],
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
    queryKey: ['report-card-scores-lsc', reportCardId],
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
    queryKey: ['report-card-skills-lsc', reportCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_card_skills')
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
          <title>LSC Report Card - ${reportCard?.students?.full_name}</title>
          <link href="https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Open Sans', sans-serif; font-size: 9px; line-height: 1.2; padding: 10px; background: #fff; }
            .lsc-container { max-width: 210mm; margin: 0 auto; border: 2px solid #1e3a5f; background: white; }
            
            /* Header */
            .lsc-header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 12px; text-align: center; border-bottom: 3px solid #f59e0b; }
            .lsc-header-logo { max-height: 45px; margin-bottom: 6px; }
            .lsc-school-name { font-family: 'Merriweather', serif; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 3px; }
            .lsc-school-motto { font-style: italic; font-size: 10px; opacity: 0.9; margin-bottom: 4px; }
            .lsc-school-info { font-size: 8px; opacity: 0.85; line-height: 1.4; }
            
            /* Report Title */
            .lsc-report-title { background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%); color: #1e3a5f; padding: 6px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-align: center; border-bottom: 1px solid #f97316; }
            
            /* Term Info */
            .lsc-term-info { background: #fef3c7; padding: 6px 10px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; border-bottom: 1px solid #f59e0b; font-weight: 600; font-size: 9px; }
            .lsc-term-item { display: flex; justify-content: space-between; }
            .lsc-term-label { color: #64748b; }
            .lsc-term-value { color: #1e293b; font-weight: 700; }
            
            /* Student Info */
            .lsc-student-info { display: grid; grid-template-columns: repeat(4, 1fr); background: #f8fafc; border-bottom: 1px solid #cbd5e1; }
            .lsc-student-item { padding: 6px 8px; border-right: 1px solid #cbd5e1; }
            .lsc-student-item:nth-child(4n) { border-right: none; }
            .lsc-student-label { color: #64748b; font-size: 7px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
            .lsc-student-value { font-weight: 700; color: #1e293b; font-size: 10px; }
            
            /* Section */
            .lsc-section { margin: 0; }
            .lsc-section-header { background: linear-gradient(90deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 6px 10px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #f59e0b; }
            
            /* Academic Results Table */
            .lsc-table { width: 100%; border-collapse: collapse; }
            .lsc-table th { background: #e2e8f0; color: #1e293b; font-weight: 600; padding: 4px 6px; text-align: left; font-size: 8px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; border-right: 1px solid #cbd5e1; }
            .lsc-table th:last-child { border-right: none; }
            .lsc-table td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; font-size: 9px; }
            .lsc-table td:last-child { border-right: none; }
            .lsc-table tr:nth-child(even) { background: #f8fafc; }
            .lsc-table tr:last-child td { font-weight: 700; background: linear-gradient(90deg, #fef3c7 0%, #fde68a 100%); border-top: 2px solid #f59e0b; }
            
            /* Grade Badge */
            .lsc-grade-badge { display: inline-block; padding: 2px 6px; border-radius: 2px; font-weight: 700; font-size: 9px; min-width: 28px; text-align: center; color: white; }
            
            /* Competencies Grid */
            .lsc-competencies { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0; }
            .lsc-competency-item { padding: 6px 8px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
            .lsc-competency-item:nth-child(even) { border-right: none; }
            .lsc-competency-name { font-weight: 600; color: #1e3a5f; margin-bottom: 2px; font-size: 9px; }
            .lsc-rating { display: flex; gap: 3px; }
            .lsc-rating-box { width: 18px; height: 18px; border: 1px solid #cbd5e1; border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 8px; font-weight: 600; cursor: pointer; }
            
            /* Behaviour Section */
            .lsc-behaviour { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
            .lsc-behaviour-item { padding: 6px 8px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
            .lsc-behaviour-item:nth-child(3n) { border-right: none; }
            .lsc-behaviour-label { color: #64748b; font-size: 8px; text-transform: uppercase; margin-bottom: 3px; }
            .lsc-behaviour-value { font-weight: 700; color: #1e3a5f; font-size: 10px; }
            
            /* Remarks */
            .lsc-remarks { padding: 8px; background: #f8fafc; border: 1px dashed #cbd5e1; }
            .lsc-remarks-label { font-weight: 600; color: #1e3a5f; margin-bottom: 3px; font-size: 9px; }
            .lsc-remarks-text { font-size: 9px; line-height: 1.4; color: #334155; min-height: 40px; }
            
            /* Promotion Status */
            .lsc-promotion { padding: 8px; background: #f0fdf4; border-left: 3px solid #22c55e; margin: 8px 0; }
            .lsc-promotion-label { font-weight: 600; color: #15803d; margin-bottom: 2px; font-size: 9px; }
            .lsc-promotion-value { font-weight: 700; color: #15803d; font-size: 11px; }
            
            /* Grading Key */
            .lsc-grading-key { display: grid; grid-template-columns: repeat(9, 1fr); gap: 4px; padding: 6px 8px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
            .lsc-grade-key-item { display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 7px; text-align: center; }
            .lsc-grade-key-badge { padding: 2px 4px; border-radius: 2px; font-weight: 600; font-size: 8px; color: white; width: 100%; }
            .lsc-grade-key-label { font-size: 6px; color: #64748b; }
            
            /* Footer */
            .lsc-footer { padding: 10px; border-top: 1px solid #cbd5e1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
            .lsc-signature-box { text-align: center; }
            .lsc-signature-line { border-top: 1px solid #1e293b; margin-top: 30px; font-size: 8px; margin-bottom: 3px; }
            .lsc-signature-label { font-size: 8px; color: #64748b; }
            
            /* Print Styles */
            @media print {
              body { margin: 0; padding: 0; }
              .lsc-container { border: none; box-shadow: none; }
              .lsc-section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPDF = () => {
    // This would require a PDF library like jsPDF
    // For now, we'll use the print functionality
    handlePrint();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">Loading...</div>
      </div>
    );
  }

  if (!reportCard || !reportCard.students) {
    return (
      <div className="flex items-center justify-center h-96">
        <div>Report card not found</div>
      </div>
    );
  }

  const student = reportCard.students as any;
  const term = reportCard.academic_terms as any;
  const averageScore = reportCard.average_score || 0;
  const overallGrade = getGradeFromScore(averageScore);
  const overallAchievement = calculateOverallAchievement(averageScore);

  const gradeColor = (score: number) => getGradeColor(score);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded border">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex gap-2">
          <Button onClick={handlePrint} variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
          <Button onClick={handleDownloadPDF} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
        </div>
      </div>

      <div ref={printRef} className="bg-white p-8">
        {/* Header */}
        <div className="lsc-header">
          {tenant?.logo_url && (
            <img src={tenant.logo_url} alt="School Logo" className="lsc-header-logo" />
          )}
          <div className="lsc-school-name">{tenant?.name || 'School Name'}</div>
          {tenant?.motto && <div className="lsc-school-motto">{tenant.motto}</div>}
          <div className="lsc-school-info">
            {tenant?.location && <div>{tenant.location}</div>}
            {tenant?.phone && <div>Tel: {tenant.phone}</div>}
            {tenant?.email && <div>Email: {tenant.email}</div>}
          </div>
        </div>

        {/* Report Title */}
        <div className="lsc-report-title">
          LOWER SECONDARY CURRICULUM (LSC) REPORT CARD
        </div>

        {/* Term Information */}
        <div className="lsc-term-info">
          <div className="lsc-term-item">
            <span className="lsc-term-label">Term:</span>
            <span className="lsc-term-value">{term?.name || 'Term'}</span>
          </div>
          <div className="lsc-term-item">
            <span className="lsc-term-label">Year:</span>
            <span className="lsc-term-value">{term?.year || ''}</span>
          </div>
          <div className="lsc-term-item">
            <span className="lsc-term-label">Class:</span>
            <span className="lsc-term-value">{student.school_classes?.name || 'Class'}</span>
          </div>
          <div className="lsc-term-item">
            <span className="lsc-term-label">Published:</span>
            <span className="lsc-term-value">
              {reportCard.published_at ? format(new Date(reportCard.published_at), 'dd/MM/yyyy') : '—'}
            </span>
          </div>
        </div>

        {/* Student Information */}
        <div className="lsc-student-info">
          <div className="lsc-student-item">
            <div className="lsc-student-label">Full Name</div>
            <div className="lsc-student-value">{student.full_name}</div>
          </div>
          <div className="lsc-student-item">
            <div className="lsc-student-label">Admission Number</div>
            <div className="lsc-student-value">{student.admission_number}</div>
          </div>
          <div className="lsc-student-item">
            <div className="lsc-student-label">Date of Birth</div>
            <div className="lsc-student-value">
              {student.date_of_birth ? format(new Date(student.date_of_birth), 'dd/MM/yyyy') : '—'}
            </div>
          </div>
          <div className="lsc-student-item">
            <div className="lsc-student-label">Gender</div>
            <div className="lsc-student-value">{student.gender || '—'}</div>
          </div>
        </div>

        {/* Academic Results */}
        <div className="lsc-section">
          <div className="lsc-section-header">Academic Results</div>
          <table className="lsc-table">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>No.</th>
                <th style={{ width: '40%' }}>Subject</th>
                <th style={{ width: '15%' }}>Score</th>
                <th style={{ width: '10%' }}>Grade</th>
                <th style={{ width: '30%' }}>Achievement Level</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score: any, index: number) => {
                const grade = getGradeFromScore(score.score || 0);
                const color = gradeColor(score.score || 0);
                return (
                  <tr key={score.id}>
                    <td>{index + 1}</td>
                    <td>{score.school_subjects?.name || 'Subject'}</td>
                    <td>{score.score?.toFixed(1) || '—'}/100</td>
                    <td>
                      <span 
                        className="lsc-grade-badge"
                        style={{ backgroundColor: color }}
                      >
                        {grade}
                      </span>
                    </td>
                    <td>{getGradeDescription(score.score || 0)}</td>
                  </tr>
                );
              })}
              <tr>
                <td colSpan={2}>OVERALL PERFORMANCE</td>
                <td>{averageScore.toFixed(1)}/100</td>
                <td>
                  <span 
                    className="lsc-grade-badge"
                    style={{ backgroundColor: gradeColor(averageScore) }}
                  >
                    {overallGrade}
                  </span>
                </td>
                <td>{overallAchievement}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Class Ranking */}
        <div style={{ padding: '8px 10px', background: '#f0f9ff', borderTop: '1px solid #cbd5e1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Class Rank</div>
            <div style={{ fontWeight: 700, fontSize: '12px' }}>{reportCard.class_rank || '—'}/{reportCard.total_students_in_class || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: '8px', color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Class Average</div>
            <div style={{ fontWeight: 700, fontSize: '12px' }}>{(reportCard.class_average_score || 0).toFixed(1)}%</div>
          </div>
        </div>

        {/* Competencies */}
        <div className="lsc-section" style={{ marginTop: '8px' }}>
          <div className="lsc-section-header">Key Competencies Rating</div>
          <div className="lsc-competencies">
            {LSC_COMPETENCIES.map((competency, index) => {
              const skill = skills.find((s: any) => s.name?.toLowerCase() === competency.name.toLowerCase());
              const rating = skill?.rating || 0;
              return (
                <div key={competency.code} className="lsc-competency-item">
                  <div className="lsc-competency-name">{competency.name}</div>
                  <div className="lsc-rating">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <div
                        key={r}
                        className="lsc-rating-box"
                        style={{
                          backgroundColor: rating >= r ? '#10b981' : '#f1f5f9',
                          color: rating >= r ? '#fff' : '#cbd5e1',
                        }}
                      >
                        {r}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Behaviour & Conduct */}
        <div className="lsc-section" style={{ marginTop: '8px' }}>
          <div className="lsc-section-header">Behaviour & Conduct</div>
          <div className="lsc-behaviour">
            <div className="lsc-behaviour-item">
              <div className="lsc-behaviour-label">Attendance</div>
              <div className="lsc-behaviour-value">{reportCard.attendance_status || '—'}</div>
            </div>
            <div className="lsc-behaviour-item">
              <div className="lsc-behaviour-label">Punctuality</div>
              <div className="lsc-behaviour-value">{reportCard.punctuality || '—'}</div>
            </div>
            <div className="lsc-behaviour-item">
              <div className="lsc-behaviour-label">Conduct</div>
              <div className="lsc-behaviour-value">{reportCard.conduct || '—'}</div>
            </div>
          </div>
        </div>

        {/* Teacher Remarks */}
        {reportCard.teacher_remarks && (
          <div style={{ marginTop: '8px' }}>
            <div className="lsc-remarks">
              <div className="lsc-remarks-label">Teacher's Remarks</div>
              <div className="lsc-remarks-text">{reportCard.teacher_remarks}</div>
            </div>
          </div>
        )}

        {/* Promotion Status */}
        {reportCard.promotion_status && (
          <div className="lsc-promotion">
            <div className="lsc-promotion-label">Promotion Status</div>
            <div className="lsc-promotion-value">{reportCard.promotion_status.toUpperCase()}</div>
          </div>
        )}

        {/* Grading Scale Reference */}
        <div className="lsc-grading-key">
          {LSC_GRADING_SCALE.map((g) => (
            <div key={g.grade} className="lsc-grade-key-item">
              <span 
                className="lsc-grade-key-badge"
                style={{ backgroundColor: g.color }}
              >
                {g.grade}
              </span>
              <span className="lsc-grade-key-label">{g.description.substring(0, 3)}</span>
              <span className="lsc-grade-key-label">{g.minScore}-{g.maxScore}</span>
            </div>
          ))}
        </div>

        {/* Signatures */}
        <div className="lsc-footer">
          <div className="lsc-signature-box">
            <div className="lsc-signature-line"></div>
            <div className="lsc-signature-label">Class Teacher</div>
          </div>
          <div className="lsc-signature-box">
            <div className="lsc-signature-line"></div>
            <div className="lsc-signature-label">Parent/Guardian</div>
          </div>
          <div className="lsc-signature-box">
            <div className="lsc-signature-line"></div>
            <div className="lsc-signature-label">Head Teacher</div>
          </div>
        </div>
      </div>
    </div>
  );
}
