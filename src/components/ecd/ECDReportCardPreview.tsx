import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Printer, Star, CheckCircle2, Trophy, Award, Crown, Phone, Mail, MapPin, Facebook, Instagram, Twitter, Globe } from 'lucide-react';
import { useRef } from 'react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';

interface ECDReportCardPreviewProps {
  reportCardId: string;
  onClose: () => void;
}

const ECDReportCardPreview = ({ reportCardId, onClose }: ECDReportCardPreviewProps) => {
  const tenantQuery = useTenant();
  const tenantId = tenantQuery.data?.tenantId;
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch tenant info
  const { data: tenant } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch report card with all related data
  const { data: reportCard, isLoading } = useQuery({
    queryKey: ['ecd-report-card-full', reportCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecd_report_cards')
        .select(`
          *,
          students(full_name, admission_number, photo_url, date_of_birth, gender),
          school_classes(name, section),
          academic_terms(name, year, term_number, start_date, end_date)
        `)
        .eq('id', reportCardId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch learning areas (5 main learning areas)
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

  // Fetch learning ratings (scores for each learning area)
  const { data: learningRatings = [] } = useQuery({
    queryKey: ['ecd-learning-ratings-full', reportCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecd_learning_ratings')
        .select(`
          *,
          ecd_learning_areas(name, icon, description)
        `)
        .eq('report_card_id', reportCardId);
      if (error) throw error;
      return data;
    },
  });

  // Fetch learning activities (Writing, Reading, Drawing, etc.)
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

  // Fetch activity ratings with comments
  const { data: activityRatings = [] } = useQuery({
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

  // Fetch days attended from gate_checkins
  const { data: attendanceData } = useQuery({
    queryKey: ['student-attendance-preview', reportCard?.student_id, reportCard?.term_id],
    queryFn: async () => {
      if (!reportCard?.academic_terms) return null;
      
      const startDate = reportCard.academic_terms.start_date;
      const endDate = reportCard.academic_terms.end_date;
      
      if (!startDate || !endDate) return null;
      
      // Count unique days with check-in
      const { data, error } = await supabase
        .from('gate_checkins')
        .select('checked_at')
        .eq('student_id', reportCard.student_id)
        .eq('check_type', 'in')
        .gte('checked_at', startDate)
        .lte('checked_at', endDate);
      
      if (error) return null;
      
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

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Report Card - ${reportCard?.students?.full_name}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif;
              font-size: 11px;
              line-height: 1.3;
              background: white;
              color: #000;
            }
            .report-card {
              max-width: 210mm;
              margin: 0 auto;
              border: 3px solid #8B0000;
              padding: 12px;
              background: white;
            }
            .header {
              display: flex;
              align-items: center;
              gap: 15px;
              border-bottom: 2px solid #8B0000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .school-logo {
              width: 60px;
              height: 60px;
              border-radius: 50%;
              object-fit: cover;
            }
            .school-info {
              flex: 1;
            }
            .school-name { 
              font-size: 18px; 
              font-weight: bold; 
              color: #8B0000; 
              text-transform: uppercase;
            }
            .school-contact { font-size: 10px; color: #333; }
            .school-email { color: #0000FF; text-decoration: underline; }
            .report-title {
              text-align: center;
              background: #FFFF00;
              padding: 6px;
              font-weight: bold;
              font-size: 14px;
              border: 2px solid #000;
              margin-bottom: 10px;
            }
            .pupil-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 5px;
              margin-bottom: 10px;
              font-size: 11px;
            }
            .info-row {
              display: flex;
              gap: 5px;
            }
            .info-label { font-weight: bold; }
            .info-value { border-bottom: 1px solid #000; flex: 1; }
            .section-header {
              background: #90EE90;
              padding: 5px 10px;
              font-weight: bold;
              border: 1px solid #000;
              margin-bottom: 5px;
            }
            .learning-areas-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }
            .learning-areas-table th,
            .learning-areas-table td {
              border: 1px solid #000;
              padding: 4px 6px;
              text-align: left;
              vertical-align: top;
            }
            .learning-areas-table th {
              background: #D3D3D3;
              font-weight: bold;
            }
            .area-name { width: 30%; }
            .score-column { width: 25%; text-align: center; }
            .activities-column { width: 45%; }
            .score-box {
              font-size: 16px;
              font-weight: bold;
              color: #8B0000;
            }
            .remark { 
              color: #FF0000; 
              font-style: italic; 
              font-weight: bold;
            }
            .activities-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 3px;
            }
            .activity-item {
              display: flex;
              align-items: center;
              gap: 3px;
              font-size: 9px;
              padding: 2px;
              border: 1px solid #ccc;
              background: #f9f9f9;
            }
            .activity-icon { width: 20px; height: 20px; }
            .activity-rating { 
              font-size: 8px; 
              color: #FF0000;
              font-weight: bold;
            }
            .totals-row {
              background: #90EE90;
              font-weight: bold;
              text-align: center;
            }
            .comments-section {
              margin-top: 10px;
              border: 1px solid #000;
            }
            .comment-row {
              display: flex;
              border-bottom: 1px solid #000;
            }
            .comment-row:last-child { border-bottom: none; }
            .comment-label {
              background: #FFB6C1;
              padding: 5px;
              min-width: 150px;
              font-weight: bold;
            }
            .comment-value {
              flex: 1;
              padding: 5px;
              min-height: 30px;
            }
            .footer-section {
              margin-top: 10px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              font-size: 10px;
            }
            .fees-box {
              border: 1px solid #000;
              padding: 5px;
            }
            .fees-row {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px dotted #000;
              padding: 2px 0;
            }
            .stamp-notice {
              text-align: center;
              font-style: italic;
              color: #FF0000;
              margin-top: 10px;
              font-size: 9px;
            }
            @media print {
              body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  if (isLoading) {
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

  // Get score remark based on score value
  const getScoreRemark = (score: number | null) => {
    if (!score) return '';
    if (score >= 90) return 'EXCELLENT';
    if (score >= 80) return 'VERY GOOD';
    if (score >= 70) return 'GOOD';
    if (score >= 60) return 'FAIR';
    if (score >= 50) return 'AVERAGE';
    return 'NEEDS IMPROVEMENT';
  };

  // Calculate total and average
  const totalScore = learningRatings.reduce((sum, lr) => sum + (lr.numeric_score || 0), 0);
  const averageScore = learningRatings.length > 0 ? totalScore / learningRatings.length : 0;

  // Get activity rating and comment
  const getActivityRating = (activityId: string) => {
    const rating = activityRatings.find(ar => ar.activity_id === activityId);
    return { 
      code: rating?.rating_code || '', 
      comment: (rating as any)?.comment || '' 
    };
  };

  // Calculate attendance from gate checkins or use saved values
  const daysPresent = attendanceData?.daysPresent || reportCard.days_present || 0;
  const totalSchoolDays = attendanceData?.totalDays || reportCard.total_school_days || 0;
  const daysAbsent = totalSchoolDays - daysPresent;

  // Generate QR code data
  const qrData = `${tenant?.name || 'School'} - ${reportCard.students?.full_name} - ${reportCard.academic_terms?.name} ${reportCard.academic_terms?.year}`;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Report Card Preview</h1>
            <p className="text-sm text-muted-foreground">
              {reportCard.students?.full_name} • {reportCard.academic_terms?.name} {reportCard.academic_terms?.year}
            </p>
          </div>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Print Report
        </Button>
      </div>

      {/* Print Preview */}
      <Card className="overflow-hidden">
        <CardContent className="p-2 sm:p-4">
          <div ref={printRef}>
            <div className="report-card max-w-4xl mx-auto border-[3px] border-red-800 p-3 sm:p-4 bg-white text-black" style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px' }}>
              {/* Header with Logo and School Info */}
              <div className="header flex items-center gap-4 border-b-2 border-red-800 pb-3 mb-3">
                {tenant?.logo_url ? (
                  <img 
                    src={tenant.logo_url} 
                    alt="School logo" 
                    className="school-logo w-16 h-16 rounded-full object-cover border-2 border-red-800"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center border-2 border-red-800">
                    <span className="text-2xl">🏫</span>
                  </div>
                )}
                <div className="school-info flex-1">
                  <h1 className="school-name text-lg sm:text-xl font-bold text-red-800 uppercase">{tenant?.name}</h1>
                  {tenant?.address && <p className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" />{tenant.address}</p>}
                  <p className="text-xs flex items-center gap-2 flex-wrap">
                    {tenant?.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{tenant.phone}</span>}
                    {tenant?.email && <span className="flex items-center gap-1 text-blue-600"><Mail className="h-3 w-3" />{tenant.email}</span>}
                  </p>
                  {/* Social Media Icons */}
                  <div className="flex gap-2 mt-1">
                    <Facebook className="h-4 w-4 text-blue-600" />
                    <Instagram className="h-4 w-4 text-pink-600" />
                    <Twitter className="h-4 w-4 text-blue-400" />
                    <Globe className="h-4 w-4 text-green-600" />
                  </div>
                </div>
                {/* QR Code */}
                <div className="flex flex-col items-center">
                  <QRCodeSVG value={qrData} size={50} />
                  <span className="text-[8px] mt-1">Scan to verify</span>
                </div>
              </div>

              {/* Report Title */}
              <div className="report-title bg-yellow-300 border-2 border-black p-2 text-center font-bold text-sm mb-3">
                END OF {reportCard.academic_terms?.name?.toUpperCase()} {reportCard.academic_terms?.year} REPORT CARD {reportCard.school_classes?.name?.toUpperCase()}
              </div>

              {/* Pupil Info Grid with Photo */}
              <div className="flex gap-4 mb-3">
                {/* Student Photo */}
                <div className="flex-shrink-0">
                  {reportCard.students?.photo_url ? (
                    <img 
                      src={reportCard.students.photo_url} 
                      alt="Student" 
                      className="w-20 h-24 object-cover border-2 border-red-800 rounded"
                    />
                  ) : (
                    <div className="w-20 h-24 bg-gray-200 border-2 border-red-800 rounded flex items-center justify-center">
                      <span className="text-3xl">👤</span>
                    </div>
                  )}
                </div>
                
                <div className="pupil-info flex-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="info-row flex gap-1">
                    <span className="info-label font-bold">PUPIL'S NAME:</span>
                    <span className="info-value border-b border-black flex-1 text-red-800 font-bold">{reportCard.students?.full_name}</span>
                  </div>
                  <div className="info-row flex gap-1">
                    <span className="info-label font-bold">ADM NO:</span>
                    <span className="info-value border-b border-black flex-1 text-red-800">{reportCard.students?.admission_number || 'N/A'}</span>
                  </div>
                  <div className="info-row flex gap-1">
                    <span className="info-label font-bold">CLASS:</span>
                    <span className="info-value border-b border-black flex-1 text-red-800">{reportCard.school_classes?.name}</span>
                  </div>
                  <div className="info-row flex gap-1">
                    <span className="info-label font-bold">SEX:</span>
                    <span className="info-value border-b border-black text-red-800">{reportCard.students?.gender || 'N/A'}</span>
                  </div>
                  <div className="info-row flex gap-1 col-span-2">
                    <span className="info-label font-bold">YEAR:</span>
                    <span className="info-value border-b border-black text-red-800">{reportCard.academic_terms?.year}</span>
                    <span className="info-label font-bold ml-4">TERM:</span>
                    <span className="info-value border-b border-black text-red-800">{reportCard.academic_terms?.name}</span>
                    <span className="info-label font-bold ml-4">POSITION:</span>
                    <span className="info-value border-b border-black text-green-700 font-bold">{reportCard.class_rank || '-'}/{reportCard.total_students_in_class || '-'}</span>
                  </div>
                  <div className="info-row flex gap-1 col-span-2 bg-blue-50 p-1 rounded">
                    <span className="info-label font-bold">ATTENDANCE:</span>
                    <span className="text-green-700 font-bold">{daysPresent} days present</span>
                    <span className="mx-2">|</span>
                    <span className="text-red-600">{daysAbsent} days absent</span>
                    <span className="mx-2">|</span>
                    <span className="text-gray-600">out of {totalSchoolDays} school days</span>
                  </div>
                </div>
              </div>

              {/* Achievement Scores Section Header */}
              <div className="section-header bg-green-300 border border-black p-1 font-bold text-sm mb-2">
                Achievement Scores in the 5 Learning Areas
              </div>

              {/* Learning Areas Table */}
              <table className="learning-areas-table w-full border-collapse mb-3" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th className="border border-black p-1 bg-gray-200 text-left" style={{ width: '30%' }}>AREA</th>
                    <th className="border border-black p-1 bg-gray-200 text-center" style={{ width: '25%' }}>SCORE AND COMMENT</th>
                    <th className="border border-black p-1 bg-gray-200 text-center" style={{ width: '45%' }}>PERFORMANCE IN LEARNING ACTIVITIES</th>
                  </tr>
                </thead>
                <tbody>
                  {learningAreas.slice(0, 5).map((area, idx) => {
                    const rating = learningRatings.find(lr => lr.learning_area_id === area.id);
                    const score = rating?.numeric_score || 0;
                    const remark = rating?.grade_remark || rating?.remark || getScoreRemark(score);
                    
                    // Split activities for this row (2 per learning area)
                    const rowActivities = activities.slice(idx * 2, idx * 2 + 2);
                    
                    return (
                      <tr key={area.id}>
                        <td className="border border-black p-2 align-top">
                          <div className="font-bold text-xs">Learning area {idx + 1}</div>
                          <div className="text-[10px] italic text-gray-600 mt-1">{area.description || area.name}</div>
                        </td>
                        <td className="border border-black p-2 text-center align-middle">
                          <div className="font-bold text-lg text-red-800">SCORE: {score}</div>
                          <div className="text-[10px] mt-1">Remark:</div>
                          <div className="text-red-600 font-bold italic text-xs">{remark}</div>
                        </td>
                        <td className="border border-black p-1 align-middle">
                          <div className="grid grid-cols-2 gap-1">
                            {rowActivities.map(activity => {
                              const actRating = getActivityRating(activity.id);
                              return (
                                <div key={activity.id} className="flex flex-col items-center p-1 border border-gray-300 bg-gray-50 text-center">
                                  <span className="text-lg">{activity.icon}</span>
                                  <span className="text-[9px] font-medium">{activity.name}</span>
                                  <span className="text-[8px] text-red-600 font-bold italic">{actRating.code || 'EXCELLENT'}</span>
                                  {actRating.comment && <span className="text-[7px] text-gray-600 italic">{actRating.comment}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* Totals Row */}
                  <tr className="bg-green-300 font-bold">
                    <td className="border border-black p-2 text-center" colSpan={2}>
                      <span className="mr-8">TOTAL: {totalScore.toFixed(0)}</span>
                      <span className="mr-8">AVERAGE: {averageScore.toFixed(1)}</span>
                      <span>POSITION: {reportCard.class_rank || 'N/A'}</span>
                    </td>
                    <td className="border border-black p-2"></td>
                  </tr>
                </tbody>
              </table>

              {/* Comments Section */}
              <div className="comments-section border border-black mb-3">
                <div className="comment-row flex border-b border-black">
                  <div className="comment-label bg-pink-200 p-2 font-bold min-w-[150px]">Class Teacher's Comment:</div>
                  <div className="comment-value flex-1 p-2 min-h-[30px]">{reportCard.teacher_comment || ''}</div>
                </div>
                <div className="comment-row flex">
                  <div className="comment-label bg-pink-200 p-2 font-bold min-w-[150px]">Head Teacher's Comment:</div>
                  <div className="comment-value flex-1 p-2 min-h-[30px]">{reportCard.head_teacher_comment || ''}</div>
                </div>
              </div>

              {/* Footer Section */}
              <div className="footer-section grid grid-cols-2 gap-4 text-[10px]">
                <div className="fees-box border border-black p-2">
                  <div className="fees-row flex justify-between border-b border-dotted border-black py-1">
                    <span className="font-bold">Fees Balance:</span>
                    <span>{reportCard.fees_balance ? `USh${reportCard.fees_balance.toLocaleString()}` : '-'}</span>
                  </div>
                  <div className="fees-row flex justify-between border-b border-dotted border-black py-1">
                    <span className="font-bold">Next Term Fees:</span>
                    <span>{reportCard.next_term_fees ? `USh${reportCard.next_term_fees.toLocaleString()}` : '-'}</span>
                  </div>
                </div>
                <div className="fees-box border border-black p-2">
                  <div className="fees-row flex justify-between border-b border-dotted border-black py-1">
                    <span className="font-bold">The Term Closed on:</span>
                    <span>{reportCard.term_closing_date ? format(new Date(reportCard.term_closing_date), 'dd/MM/yyyy') : (reportCard.academic_terms?.end_date ? format(new Date(reportCard.academic_terms.end_date), 'dd/MM/yyyy') : '-')}</span>
                  </div>
                  <div className="fees-row flex justify-between py-1">
                    <span className="font-bold">Next Term Begins on:</span>
                    <span>{reportCard.next_term_start_date ? format(new Date(reportCard.next_term_start_date), 'dd/MM/yyyy') : '-'}</span>
                  </div>
                </div>
              </div>

              {/* Digital Stamp & Footer */}
              <div className="flex justify-between items-center mt-3">
                <div className="text-[9px] text-gray-600">
                  Generated on: {format(new Date(), 'dd/MM/yyyy HH:mm')}
                </div>
                <div className="relative">
                  <div className="w-16 h-16 border-2 border-green-600 rounded-full flex items-center justify-center bg-green-50 rotate-[-15deg]">
                    <div className="text-center">
                      <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto" />
                      <span className="text-[6px] font-bold text-green-700 block">VERIFIED</span>
                    </div>
                  </div>
                </div>
                <div className="text-[9px] italic text-red-600">
                  Not valid without official stamp
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ECDReportCardPreview;
