import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, BarChart3, Trophy, MessageSquare, TrendingUp, TrendingDown, Minus, Users } from "lucide-react";
import { 
  generateClassTeacherRemark, 
  generateHeadTeacherRemark,
  getPerformanceLevel
} from "@/lib/remarksGenerator";

// Uganda grading scale
const getGrade = (score: number) => {
  if (score >= 90) return { grade: 'A*', descriptor: 'Excellent', color: 'bg-green-600' };
  if (score >= 80) return { grade: 'A', descriptor: 'Very Good', color: 'bg-green-500' };
  if (score >= 70) return { grade: 'B', descriptor: 'Good', color: 'bg-blue-500' };
  if (score >= 60) return { grade: 'C', descriptor: 'Credit', color: 'bg-yellow-500' };
  if (score >= 50) return { grade: 'D', descriptor: 'Pass', color: 'bg-orange-500' };
  if (score >= 40) return { grade: 'E', descriptor: 'Subsidiary Pass', color: 'bg-orange-600' };
  if (score >= 30) return { grade: 'F', descriptor: 'Failure', color: 'bg-red-500' };
  return { grade: 'G', descriptor: 'Unclassified', color: 'bg-red-700' };
};

export default function AcademicAnalytics() {
  const { data: tenantData } = useTenant();
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch terms
  const { data: terms = [] } = useQuery({
    queryKey: ['academic-terms', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('tenant_id', tenantData!.tenantId)
        .order('year', { ascending: false })
        .order('term_number', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const currentTerm = terms.find(t => t.is_current);
  if (currentTerm && !selectedTerm) setSelectedTerm(currentTerm.id);

  // Fetch classes
  const { data: classes = [] } = useQuery({
    queryKey: ['school-classes', tenantData?.tenantId],
    enabled: !!tenantData?.tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_classes')
        .select('*')
        .eq('tenant_id', tenantData!.tenantId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch report cards with scores
  const { data: reportCards = [], isLoading } = useQuery({
    queryKey: ['analytics-report-cards', tenantData?.tenantId, selectedTerm, selectedClass],
    enabled: !!tenantData?.tenantId && !!selectedTerm,
    queryFn: async () => {
      let query = supabase
        .from('student_report_cards')
        .select(`
          *,
          students!inner(id, full_name, admission_number, gender, school_classes!class_id(id, name)),
          academic_terms(id, name, year)
        `)
        .eq('tenant_id', tenantData!.tenantId)
        .eq('term_id', selectedTerm);

      if (selectedClass && selectedClass !== 'all') {
        query = query.eq('class_id', selectedClass);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch report card scores for the term
  const reportCardIds = reportCards.map(rc => rc.id);
  const { data: allScores = [] } = useQuery({
    queryKey: ['analytics-scores', reportCardIds],
    enabled: reportCardIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('report_card_scores')
        .select('*, school_subjects(id, name, code, category)')
        .in('report_card_id', reportCardIds);
      if (error) throw error;
      return data;
    },
  });

  // Compute analytics
  const classGroups: Record<string, typeof reportCards> = {};
  reportCards.forEach(rc => {
    const className = rc.students?.school_classes?.name || 'Unknown';
    if (!classGroups[className]) classGroups[className] = [];
    classGroups[className].push(rc);
  });

  // Subject performance analysis
  const subjectStats: Record<string, { name: string; code: string; scores: number[]; category: string }> = {};
  allScores.forEach(s => {
    const subName = s.school_subjects?.name || 'Unknown';
    const subCode = s.school_subjects?.code || '';
    const cat = s.school_subjects?.category || 'core';
    if (!subjectStats[subName]) subjectStats[subName] = { name: subName, code: subCode, scores: [], category: cat };
    const total = (s.formative_score || 0) * 0.2 + (s.school_based_score || 0) * 0.8;
    if (total > 0) subjectStats[subName].scores.push(total);
  });

  const subjectRankings = Object.values(subjectStats)
    .map(s => ({
      ...s,
      avg: s.scores.length > 0 ? s.scores.reduce((a, b) => a + b, 0) / s.scores.length : 0,
      highest: s.scores.length > 0 ? Math.max(...s.scores) : 0,
      lowest: s.scores.length > 0 ? Math.min(...s.scores) : 0,
      passRate: s.scores.length > 0 ? (s.scores.filter(x => x >= 50).length / s.scores.length) * 100 : 0,
      totalStudents: s.scores.length,
      gradeDistribution: {
        'A*': s.scores.filter(x => x >= 90).length,
        'A': s.scores.filter(x => x >= 80 && x < 90).length,
        'B': s.scores.filter(x => x >= 70 && x < 80).length,
        'C': s.scores.filter(x => x >= 60 && x < 70).length,
        'D': s.scores.filter(x => x >= 50 && x < 60).length,
        'E': s.scores.filter(x => x >= 40 && x < 50).length,
        'F': s.scores.filter(x => x >= 30 && x < 40).length,
        'G': s.scores.filter(x => x < 30).length,
      },
    }))
    .sort((a, b) => b.avg - a.avg);

  // Student rankings per class
  const studentRankings: Record<string, Array<{ name: string; admNo: string; avg: number; rank: number; total: number; grade: ReturnType<typeof getGrade> }>> = {};
  Object.entries(classGroups).forEach(([className, cards]) => {
    const ranked = cards
      .map(rc => ({
        name: rc.students?.full_name || 'Unknown',
        admNo: rc.students?.admission_number || '',
        avg: rc.average_score || 0,
        total: rc.total_score || 0,
        rank: 0,
        grade: getGrade(rc.average_score || 0),
      }))
      .sort((a, b) => b.avg - a.avg)
      .map((s, i, arr) => ({
        ...s,
        rank: i > 0 && s.avg === arr[i - 1].avg ? arr[i - 1].rank : i + 1,
      }));
    studentRankings[className] = ranked;
  });

  // Summary stats
  const totalStudents = reportCards.length;
  const overallAvg = totalStudents > 0 ? reportCards.reduce((s, rc) => s + (rc.average_score || 0), 0) / totalStudents : 0;
  const passCount = reportCards.filter(rc => (rc.average_score || 0) >= 50).length;
  const passRate = totalStudents > 0 ? (passCount / totalStudents) * 100 : 0;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const termName = terms.find(t => t.id === selectedTerm)?.name || '';
    const year = terms.find(t => t.id === selectedTerm)?.year || '';
    printWindow.document.write(`
      <html><head><title>Score Sheet - ${termName} ${year}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; font-size: 10px; padding: 10mm; }
        h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
        h2 { font-size: 13px; margin: 12px 0 6px; border-bottom: 1px solid #333; padding-bottom: 2px; }
        h3 { font-size: 11px; margin: 8px 0 4px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid #999; padding: 3px 5px; text-align: left; font-size: 9px; }
        th { background: #f0f0f0; font-weight: bold; }
        .rank-1 { background: #fef3c7; font-weight: bold; }
        .rank-2 { background: #f0fdf4; }
        .rank-3 { background: #eff6ff; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .summary { display: flex; gap: 20px; margin-bottom: 10px; }
        .summary-item { padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; }
        @page { margin: 8mm; size: A4 portrait; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${printContent.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const termLabel = terms.find(t => t.id === selectedTerm);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 pb-24 md:pb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Academic Analytics</h1>
          <p className="text-muted-foreground">Performance statistics, score sheets & automated remarks</p>
        </div>
        <Button onClick={handlePrint} disabled={reportCards.length === 0}>
          <Printer className="h-4 w-4 mr-2" />
          Print Score Sheet
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger>
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name} {t.year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-8 w-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{totalStudents}</p>
            <p className="text-xs text-muted-foreground">Total Learners</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <BarChart3 className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{overallAvg.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Overall Average</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold">{passRate.toFixed(0)}%</p>
            <p className="text-xs text-muted-foreground">Pass Rate (≥50%)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Trophy className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold">{subjectRankings.length}</p>
            <p className="text-xs text-muted-foreground">Subjects Analyzed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rankings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rankings">Student Rankings</TabsTrigger>
          <TabsTrigger value="subjects">Subject Analysis</TabsTrigger>
          <TabsTrigger value="remarks">Auto Remarks</TabsTrigger>
        </TabsList>

        {/* Student Rankings */}
        <TabsContent value="rankings" className="space-y-4">
          {Object.entries(studentRankings).map(([className, students]) => (
            <Card key={className}>
              <CardHeader>
                <CardTitle className="text-lg">{className} — Student Rankings</CardTitle>
                <CardDescription>{students.length} learners</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {students.map((s, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${s.rank === 1 ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-950/20' : s.rank === 2 ? 'border-gray-300 bg-gray-50 dark:bg-gray-900/20' : s.rank === 3 ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : 'border-border'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-lg text-primary">#{s.rank}</span>
                        <Badge className={`${s.grade.color} text-white`}>{s.grade.grade}</Badge>
                      </div>
                      <p className="font-semibold text-sm truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.admNo}</p>
                      <div className="flex justify-between mt-2 text-xs">
                        <span>Avg: <strong>{s.avg.toFixed(1)}%</strong></span>
                        <span className="text-muted-foreground">{s.grade.descriptor}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {Object.keys(studentRankings).length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No report card data available for this term</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Subject Analysis */}
        <TabsContent value="subjects" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectRankings.map((sub, i) => {
              const trend = sub.avg >= 60 ? 'up' : sub.avg >= 40 ? 'neutral' : 'down';
              return (
                <Card key={sub.name}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">#{i + 1}</span>
                        <div>
                          <p className="font-semibold text-sm">{sub.name}</p>
                          <p className="text-xs text-muted-foreground">{sub.code} • {sub.category}</p>
                        </div>
                      </div>
                      {trend === 'up' ? <TrendingUp className="h-5 w-5 text-green-500" /> :
                       trend === 'down' ? <TrendingDown className="h-5 w-5 text-red-500" /> :
                       <Minus className="h-5 w-5 text-yellow-500" />}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                      <div className="p-2 rounded bg-muted">
                        <p className="font-bold text-base">{sub.avg.toFixed(1)}%</p>
                        <p className="text-muted-foreground">Average</p>
                      </div>
                      <div className="p-2 rounded bg-muted">
                        <p className="font-bold text-base text-green-600">{sub.highest.toFixed(0)}%</p>
                        <p className="text-muted-foreground">Highest</p>
                      </div>
                      <div className="p-2 rounded bg-muted">
                        <p className="font-bold text-base text-red-600">{sub.lowest.toFixed(0)}%</p>
                        <p className="text-muted-foreground">Lowest</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span>Pass rate: <strong>{sub.passRate.toFixed(0)}%</strong></span>
                      <span className="text-muted-foreground">{sub.totalStudents} students</span>
                    </div>
                    {/* Grade distribution */}
                    <div className="flex gap-1 mt-2">
                      {Object.entries(sub.gradeDistribution).map(([g, count]) => (
                        count > 0 && (
                          <Badge key={g} variant="outline" className="text-[10px] px-1">
                            {g}:{count}
                          </Badge>
                        )
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {subjectRankings.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No subject scores available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Auto Remarks */}
        <TabsContent value="remarks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Automated Report Remarks Preview
              </CardTitle>
              <CardDescription>
                Based on Uganda's new curriculum grading descriptors. These remarks auto-populate when saving report cards.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {reportCards.slice(0, 20).map(rc => {
                  const avg = rc.average_score || 0;
                  const name = rc.students?.full_name || 'Student';
                  const grade = getGrade(avg);
                  return (
                    <div key={rc.id} className="p-3 rounded-lg border border-border space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{name}</p>
                          <p className="text-xs text-muted-foreground">{rc.students?.school_classes?.name} • {avg.toFixed(1)}%</p>
                        </div>
                        <Badge className={`${grade.color} text-white`}>{grade.grade}</Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs"><strong>Class Teacher:</strong></p>
                        <p className="text-xs text-muted-foreground italic">{generateClassTeacherRemark(avg, name)}</p>
                        <p className="text-xs mt-1"><strong>Head Teacher:</strong></p>
                        <p className="text-xs text-muted-foreground italic">{generateHeadTeacherRemark(avg, name)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {reportCards.length === 0 && (
                <div className="py-12 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No report cards to generate remarks for</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Hidden printable score sheet */}
      <div className="hidden">
        <div ref={printRef}>
          <h1>School Academic Score Sheet</h1>
          <p style={{ textAlign: 'center', marginBottom: '8px' }}>
            Academic Score Sheet — {termLabel?.name} {termLabel?.year}
          </p>

          {Object.entries(studentRankings).map(([className, students]) => (
            <div key={className}>
              <h2>{className} — Student Performance</h2>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>Rank</th>
                    <th>Student Name</th>
                    <th>Adm No.</th>
                    <th className="text-center" style={{ width: '60px' }}>Average</th>
                    <th className="text-center" style={{ width: '50px' }}>Grade</th>
                    <th className="text-center" style={{ width: '80px' }}>Descriptor</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={i} className={s.rank <= 3 ? `rank-${s.rank}` : ''}>
                      <td className="text-center">{s.rank}</td>
                      <td>{s.name}</td>
                      <td>{s.admNo}</td>
                      <td className="text-center">{s.avg.toFixed(1)}%</td>
                      <td className="text-center"><strong>{s.grade.grade}</strong></td>
                      <td className="text-center">{s.grade.descriptor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          <h2>Subject Performance Summary</h2>
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>Rank</th>
                <th>Subject</th>
                <th>Code</th>
                <th className="text-center">Students</th>
                <th className="text-center">Average</th>
                <th className="text-center">Highest</th>
                <th className="text-center">Lowest</th>
                <th className="text-center">Pass Rate</th>
              </tr>
            </thead>
            <tbody>
              {subjectRankings.map((s, i) => (
                <tr key={s.name}>
                  <td className="text-center">{i + 1}</td>
                  <td>{s.name}</td>
                  <td>{s.code}</td>
                  <td className="text-center">{s.totalStudents}</td>
                  <td className="text-center">{s.avg.toFixed(1)}%</td>
                  <td className="text-center">{s.highest.toFixed(0)}%</td>
                  <td className="text-center">{s.lowest.toFixed(0)}%</td>
                  <td className="text-center">{s.passRate.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
