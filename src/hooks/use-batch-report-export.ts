import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface ReportCardData {
  id: string;
  studentName: string;
  className: string;
}

export function useBatchReportExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const generateReportHTML = async (
    type: 'regular' | 'ecd',
    reportCardId: string,
    tenantData: any
  ): Promise<string> => {
    if (type === 'ecd') {
      return generateECDReportHTML(reportCardId, tenantData);
    }
    return generateRegularReportHTML(reportCardId, tenantData);
  };

  const generateRegularReportHTML = async (reportCardId: string, tenantData: any): Promise<string> => {
    // Fetch report card data
    const { data: reportCard } = await supabase
      .from('student_report_cards')
      .select(`
        *,
        students(id, full_name, admission_number, date_of_birth, gender, guardian_name, school_classes!class_id(id, name, level)),
        academic_terms(id, name, term_number, year)
      `)
      .eq('id', reportCardId)
      .single();

    if (!reportCard) return '';

    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantData.tenantId)
      .single();

    const { data: scores } = await supabase
      .from('report_card_scores')
      .select('*, school_subjects(id, name, code)')
      .eq('report_card_id', reportCardId);

    const { data: skills } = await supabase
      .from('report_card_skills')
      .select('*')
      .eq('report_card_id', reportCardId);

    const { data: activities } = await supabase
      .from('report_card_activities')
      .select('*')
      .eq('report_card_id', reportCardId);

    const student = reportCard.students;
    const term = reportCard.academic_terms;
    const genericSkills = skills?.filter(s => s.skill_category === 'generic') || [];
    const values = skills?.filter(s => s.skill_category === 'values') || [];

    return `
      <div class="report-card" style="font-family: 'Times New Roman', Times, serif; font-size: 11px; line-height: 1.3; padding: 20px; max-width: 210mm; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px;">
          ${tenant?.logo_url ? `<img src="${tenant.logo_url}" alt="School Logo" style="height: 60px; margin-bottom: 5px;" />` : ''}
          <h1 style="font-size: 18px; font-weight: bold; text-transform: uppercase; margin: 0;">${tenant?.name || 'School Name'}</h1>
          <p style="font-size: 10px; color: #444; margin: 3px 0;">${tenant?.address || ''} | ${tenant?.phone || ''} | ${tenant?.email || ''}</p>
          <h2 style="font-size: 14px; margin-top: 8px;">STUDENT REPORT CARD</h2>
          <p style="font-weight: 600;">${term?.name} ${term?.year}</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-bottom: 15px; padding: 8px; background: #f5f5f5; border-radius: 4px; font-size: 10px;">
          <div><strong>Name:</strong> ${student?.full_name}</div>
          <div><strong>Admission No:</strong> ${student?.admission_number}</div>
          <div><strong>Class:</strong> ${student?.school_classes?.name}</div>
          <div><strong>D.O.B:</strong> ${student?.date_of_birth || 'N/A'}</div>
          <div><strong>Gender:</strong> ${student?.gender || 'N/A'}</div>
          <div><strong>Guardian:</strong> ${student?.guardian_name || 'N/A'}</div>
          <div><strong>Attendance:</strong> ${reportCard.days_present}/${reportCard.total_school_days} days</div>
          <div><strong>Class Position:</strong> ${reportCard.class_rank || '-'} / ${reportCard.total_students_in_class || '-'}</div>
          <div>${reportCard.is_prefect ? `<span style="background: #fbbf24; color: #000; padding: 2px 6px; border-radius: 3px; font-size: 9px;">Prefect: ${reportCard.prefect_title || 'Yes'}</span>` : ''}</div>
        </div>
        <div style="margin-bottom: 15px;">
          <div style="font-size: 12px; font-weight: bold; background: #1a1a2e; color: white; padding: 4px 8px; margin-bottom: 5px;">ACADEMIC PERFORMANCE</div>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr>
                <th style="border: 1px solid #333; padding: 3px 5px; text-align: left; background: #e0e0e0;">Subject</th>
                <th style="border: 1px solid #333; padding: 3px 5px; text-align: center; background: #e0e0e0;">Formative</th>
                <th style="border: 1px solid #333; padding: 3px 5px; text-align: center; background: #e0e0e0;">Exam</th>
                <th style="border: 1px solid #333; padding: 3px 5px; text-align: center; background: #e0e0e0;">Total</th>
                <th style="border: 1px solid #333; padding: 3px 5px; text-align: center; background: #e0e0e0;">Grade</th>
                <th style="border: 1px solid #333; padding: 3px 5px; text-align: left; background: #e0e0e0;">Remark</th>
              </tr>
            </thead>
            <tbody>
              ${(scores || []).map(score => `
                <tr>
                  <td style="border: 1px solid #333; padding: 3px 5px;">${score.school_subjects?.name}</td>
                  <td style="border: 1px solid #333; padding: 3px 5px; text-align: center;">${score.formative_score || '-'}</td>
                  <td style="border: 1px solid #333; padding: 3px 5px; text-align: center;">${score.school_based_score || '-'}</td>
                  <td style="border: 1px solid #333; padding: 3px 5px; text-align: center; font-weight: bold;">${score.total_score?.toFixed(1) || '-'}</td>
                  <td style="border: 1px solid #333; padding: 3px 5px; text-align: center; font-weight: bold; color: ${(score.total_score || 0) >= 50 ? '#16a34a' : '#dc2626'};">${score.grade}</td>
                  <td style="border: 1px solid #333; padding: 3px 5px;">${score.subject_remark || score.grade_descriptor || ''}</td>
                </tr>
              `).join('')}
              <tr style="font-weight: bold; background: #f0f0f0;">
                <td colspan="3" style="border: 1px solid #333; padding: 3px 5px;">OVERALL AVERAGE</td>
                <td style="border: 1px solid #333; padding: 3px 5px; text-align: center;">${reportCard.average_score?.toFixed(1) || '-'}%</td>
                <td colspan="2" style="border: 1px solid #333; padding: 3px 5px;"></td>
              </tr>
            </tbody>
          </table>
        </div>
        ${genericSkills.length > 0 || values.length > 0 ? `
          <div style="margin-bottom: 15px;">
            <div style="font-size: 12px; font-weight: bold; background: #1a1a2e; color: white; padding: 4px 8px; margin-bottom: 5px;">GENERIC SKILLS & VALUES</div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
              ${genericSkills.length > 0 ? `
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                  <thead><tr><th style="border: 1px solid #333; padding: 3px 5px; background: #e0e0e0;">Generic Skills</th><th style="border: 1px solid #333; padding: 3px 5px; background: #e0e0e0;">Rating</th></tr></thead>
                  <tbody>${genericSkills.map(skill => `<tr><td style="border: 1px solid #333; padding: 3px 5px;">${skill.skill_name}</td><td style="border: 1px solid #333; padding: 3px 5px;">${skill.rating}</td></tr>`).join('')}</tbody>
                </table>
              ` : ''}
              ${values.length > 0 ? `
                <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
                  <thead><tr><th style="border: 1px solid #333; padding: 3px 5px; background: #e0e0e0;">Values</th><th style="border: 1px solid #333; padding: 3px 5px; background: #e0e0e0;">Rating</th></tr></thead>
                  <tbody>${values.map(skill => `<tr><td style="border: 1px solid #333; padding: 3px 5px;">${skill.skill_name}</td><td style="border: 1px solid #333; padding: 3px 5px;">${skill.rating}</td></tr>`).join('')}</tbody>
                </table>
              ` : ''}
            </div>
          </div>
        ` : ''}
        <div style="margin-bottom: 15px;">
          <div style="font-size: 12px; font-weight: bold; background: #1a1a2e; color: white; padding: 4px 8px; margin-bottom: 5px;">DISCIPLINE</div>
          <p style="padding: 5px; background: #f9f9f9;"><strong>Conduct:</strong> ${reportCard.discipline_remark || 'Good'}</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          <div style="border: 1px solid #333; padding: 8px; min-height: 60px;">
            <h4 style="font-size: 10px; font-weight: bold; margin-bottom: 3px; border-bottom: 1px solid #ccc; padding-bottom: 2px;">Class Teacher's Comment</h4>
            <p style="font-size: 10px;">${reportCard.class_teacher_comment || 'No comment provided.'}</p>
          </div>
          <div style="border: 1px solid #333; padding: 8px; min-height: 60px;">
            <h4 style="font-size: 10px; font-weight: bold; margin-bottom: 3px; border-bottom: 1px solid #ccc; padding-bottom: 2px;">Head Teacher's Comment</h4>
            <p style="font-size: 10px;">${reportCard.head_teacher_comment || 'No comment provided.'}</p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 15px; font-size: 9px; color: #666; border-top: 1px solid #ccc; padding-top: 8px;">
          <p>Generated on ${new Date().toLocaleDateString('en-UG', { dateStyle: 'full' })}</p>
        </div>
      </div>
    `;
  };

  const generateECDReportHTML = async (reportCardId: string, tenantData: any): Promise<string> => {
    const { data: reportCard } = await supabase
      .from('ecd_report_cards')
      .select(`
        *,
        students(full_name, admission_number, photo_url, date_of_birth, gender),
        school_classes(name, section),
        academic_terms(name, year, term_number)
      `)
      .eq('id', reportCardId)
      .single();

    if (!reportCard) return '';

    const { data: tenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantData.tenantId)
      .single();

    const { data: learningRatings } = await supabase
      .from('ecd_learning_ratings')
      .select('*, ecd_learning_areas(name, icon)')
      .eq('report_card_id', reportCardId);

    const { data: skillsRatings } = await supabase
      .from('ecd_skills_ratings')
      .select('*, ecd_skills_values(name, category)')
      .eq('report_card_id', reportCardId);

    const { data: ratingScale } = await supabase
      .from('ecd_rating_scale')
      .select('*')
      .eq('tenant_id', tenantData.tenantId)
      .eq('is_active', true);

    const getRatingIcon = (code: string) => {
      const rating = ratingScale?.find(r => r.code === code);
      return rating?.icon || '❓';
    };

    const attendancePercent = reportCard.total_school_days > 0 
      ? Math.round((reportCard.days_present / reportCard.total_school_days) * 100) 
      : 0;

    return `
      <div class="report-card" style="font-family: 'Comic Sans MS', cursive; padding: 24px; max-width: 800px; margin: 0 auto; border: 4px solid #FF6B9D; border-radius: 20px; background: linear-gradient(135deg, #FFF5F7 0%, #F0FDFA 100%);">
        <div style="text-align: center; border-bottom: 3px dashed #4ECDC4; padding-bottom: 16px; margin-bottom: 16px;">
          ${tenant?.logo_url ? `<img src="${tenant.logo_url}" alt="School logo" style="height: 60px; margin-bottom: 8px;" />` : ''}
          <h1 style="font-size: 24px; font-weight: bold; color: #FF6B9D; margin: 0;">${tenant?.name}</h1>
          <p style="font-size: 12px; color: #666; margin: 4px 0;">${tenant?.address || ''}</p>
          <h2 style="font-size: 18px; color: #4ECDC4; margin-top: 8px;">⭐ Progress Report Card ⭐</h2>
          <p style="font-size: 13px; margin-top: 4px;">${reportCard.academic_terms?.name} ${reportCard.academic_terms?.year}</p>
        </div>
        <div style="display: flex; gap: 16px; align-items: center; background: white; padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 2px solid #4ECDC4;">
          <div style="width: 70px; height: 70px; border-radius: 50%; background: #FFE4EC; display: flex; align-items: center; justify-content: center; font-size: 28px;">
            ${reportCard.students?.photo_url ? `<img src="${reportCard.students.photo_url}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />` : '👶'}
          </div>
          <div>
            <h2 style="font-size: 18px; font-weight: bold; color: #FF6B9D; margin: 0;">${reportCard.students?.full_name}</h2>
            <div style="display: flex; gap: 16px; margin-top: 6px; font-size: 13px;">
              <span><strong>Class:</strong> ${reportCard.school_classes?.name}</span>
              <span><strong>Adm No:</strong> ${reportCard.students?.admission_number}</span>
            </div>
          </div>
        </div>
        <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 2px solid #4ECDC4;">
          <h3 style="font-size: 16px; font-weight: bold; color: #FF6B9D; margin-bottom: 12px;">📅 Attendance</h3>
          <div style="display: flex; justify-content: space-around; text-align: center; padding: 12px; background: #F0FDFA; border-radius: 8px;">
            <div><div style="font-size: 28px; font-weight: bold; color: #22C55E;">${reportCard.days_present}</div><div style="font-size: 11px; color: #666;">Days Present</div></div>
            <div><div style="font-size: 28px; font-weight: bold; color: #EF4444;">${reportCard.days_absent || 0}</div><div style="font-size: 11px; color: #666;">Days Absent</div></div>
            <div><div style="font-size: 28px; font-weight: bold; color: #3B82F6;">${attendancePercent}%</div><div style="font-size: 11px; color: #666;">Attendance</div></div>
          </div>
        </div>
        <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 2px solid #4ECDC4;">
          <h3 style="font-size: 16px; font-weight: bold; color: #FF6B9D; margin-bottom: 12px;">📚 Learning Progress</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            ${(learningRatings || []).map(lr => `
              <div style="padding: 12px; background: #FFF5F7; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px;">${lr.ecd_learning_areas?.icon || '📖'}</div>
                <div style="font-size: 11px; margin: 4px 0;">${lr.ecd_learning_areas?.name}</div>
                <div style="font-size: 20px;">${getRatingIcon(lr.rating_code)}</div>
              </div>
            `).join('')}
          </div>
        </div>
        <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 2px solid #4ECDC4;">
          <h3 style="font-size: 16px; font-weight: bold; color: #FF6B9D; margin-bottom: 12px;">🌟 Skills & Values</h3>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
            ${(skillsRatings || []).map(sr => `
              <div style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #F0FDFA; border-radius: 6px; font-size: 12px;">
                <span style="font-size: 14px;">${sr.is_achieved ? '✅' : '❌'}</span>
                <span>${sr.ecd_skills_values?.name}</span>
              </div>
            `).join('')}
          </div>
        </div>
        ${reportCard.teacher_comment || reportCard.behavior_comment ? `
          <div style="background: white; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 2px solid #4ECDC4;">
            <h3 style="font-size: 16px; font-weight: bold; color: #FF6B9D; margin-bottom: 12px;">💬 Teacher's Comments</h3>
            ${reportCard.teacher_comment ? `<div style="background: #FFF5F7; padding: 12px; border-radius: 8px; font-style: italic; margin-bottom: 8px;"><strong>Progress:</strong> ${reportCard.teacher_comment}</div>` : ''}
            ${reportCard.behavior_comment ? `<div style="background: #FFF5F7; padding: 12px; border-radius: 8px; font-style: italic;"><strong>Behavior:</strong> ${reportCard.behavior_comment}</div>` : ''}
          </div>
        ` : ''}
        <div style="text-align: center; margin-top: 16px; padding-top: 16px; border-top: 3px dashed #4ECDC4; font-size: 13px; color: #FF6B9D;">
          <p>🌈 Keep up the wonderful work! 🌈</p>
          <p style="font-size: 11px; color: #666; margin-top: 8px;">Generated on ${new Date().toLocaleDateString('en-UG', { dateStyle: 'full' })}</p>
        </div>
      </div>
    `;
  };

  const exportAsZip = async (
    type: 'regular' | 'ecd',
    reportCards: ReportCardData[],
    tenantData: any,
    termName: string
  ) => {
    if (reportCards.length === 0) {
      toast.error('No report cards to export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const zip = new JSZip();
      const folder = zip.folder(`Report_Cards_${termName.replace(/\s+/g, '_')}`);

      for (let i = 0; i < reportCards.length; i++) {
        const rc = reportCards[i];
        setExportProgress(Math.round(((i + 1) / reportCards.length) * 100));

        const html = await generateReportHTML(type, rc.id, tenantData);
        const fileName = `${rc.studentName.replace(/\s+/g, '_')}_${rc.className.replace(/\s+/g, '_')}.html`;
        folder?.file(fileName, `<!DOCTYPE html><html><head><title>Report Card - ${rc.studentName}</title></head><body>${html}</body></html>`);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Report_Cards_${termName.replace(/\s+/g, '_')}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${reportCards.length} report cards as ZIP`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report cards');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const exportAsSinglePDF = async (
    type: 'regular' | 'ecd',
    reportCards: ReportCardData[],
    tenantData: any,
    termName: string
  ) => {
    if (reportCards.length === 0) {
      toast.error('No report cards to export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const allHTML: string[] = [];

      for (let i = 0; i < reportCards.length; i++) {
        const rc = reportCards[i];
        setExportProgress(Math.round(((i + 1) / reportCards.length) * 100));
        const html = await generateReportHTML(type, rc.id, tenantData);
        allHTML.push(html);
      }

      const combinedHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Report Cards - ${termName}</title>
            <style>
              @media print {
                .page-break { page-break-after: always; }
              }
              body { margin: 0; padding: 0; }
            </style>
          </head>
          <body>
            ${allHTML.map((html, index) => `
              <div ${index < allHTML.length - 1 ? 'class="page-break"' : ''}>
                ${html}
              </div>
            `).join('')}
          </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups to print reports');
        return;
      }

      printWindow.document.write(combinedHTML);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
      }, 500);

      toast.success(`Prepared ${reportCards.length} report cards for printing`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report cards');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  return {
    isExporting,
    exportProgress,
    exportAsZip,
    exportAsSinglePDF,
  };
}
