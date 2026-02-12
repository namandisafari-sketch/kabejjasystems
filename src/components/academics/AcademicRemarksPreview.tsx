import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, TrendingUp, TrendingDown, Users } from "lucide-react";
import { 
  generateClassTeacherRemark, 
  generateHeadTeacherRemark,
  getPerformanceLevel 
} from "@/lib/remarksGenerator";

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

export function AcademicRemarksPreview() {
  const { data: tenantData } = useTenant();
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("all");

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

  // Set default to current term
  if (terms.length > 0 && !selectedTerm) {
    const currentTerm = terms.find(t => t.is_current);
    if (currentTerm) setSelectedTerm(currentTerm.id);
  }

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
    queryKey: ['remarks-report-cards', tenantData?.tenantId, selectedTerm, selectedClass],
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

      // Sort by average score descending
      return (data || []).sort((a, b) => (b.average_score || 0) - (a.average_score || 0));
    },
  });

  const topPerformers = reportCards.filter(rc => (rc.average_score || 0) >= 80);
  const needsSupport = reportCards.filter(rc => (rc.average_score || 0) < 50);
  const average = reportCards.length > 0 
    ? Math.round(reportCards.reduce((sum, rc) => sum + (rc.average_score || 0), 0) / reportCards.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Automated Report Remarks Preview
        </h2>
        <p className="text-muted-foreground">Performance statistics, score sheets & automated remarks</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-2">Academic Term</label>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger>
                <SelectValue placeholder="Select term" />
              </SelectTrigger>
              <SelectContent>
                {terms.map(term => (
                  <SelectItem key={term.id} value={term.id}>
                    {term.name} - {term.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Class</label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportCards.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Class Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{average}%</div>
            <p className="text-xs text-muted-foreground mt-1">{getGrade(average).descriptor}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{topPerformers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">(80%+ average)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Need Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{needsSupport.length}</div>
            <p className="text-xs text-muted-foreground mt-1">(&lt;50% average)</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      {topPerformers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.slice(0, 5).map((rc) => (
                <div key={rc.id} className="border-b pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{rc.students?.full_name}</p>
                      <p className="text-xs text-muted-foreground">{rc.students?.school_classes?.name}</p>
                    </div>
                    <Badge className={`${getGrade(rc.average_score || 0).color}`}>
                      {getGrade(rc.average_score || 0).grade}
                    </Badge>
                  </div>
                  <p className="text-sm italic text-gray-600 mb-2">
                    {generateClassTeacherRemark(rc.average_score || 0, rc.students?.full_name || '')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Students Needing Support */}
      {needsSupport.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-base text-red-900">Students Requiring Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {needsSupport.map((rc) => (
                <div key={rc.id} className="border-b border-red-200 pb-4 last:border-0">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-red-900">{rc.students?.full_name}</p>
                      <p className="text-xs text-red-700">{rc.students?.school_classes?.name}</p>
                    </div>
                    <Badge variant="destructive">
                      {getGrade(rc.average_score || 0).grade}
                    </Badge>
                  </div>
                  <div className="bg-white bg-opacity-70 p-2 rounded text-sm text-red-800 mb-2">
                    <p className="font-semibold mb-1">Class Teacher:</p>
                    <p className="italic">
                      {generateClassTeacherRemark(rc.average_score || 0, rc.students?.full_name || '')}
                    </p>
                  </div>
                  <div className="bg-white bg-opacity-70 p-2 rounded text-sm text-red-800">
                    <p className="font-semibold mb-1">Head Teacher:</p>
                    <p className="italic">
                      {generateHeadTeacherRemark(rc.average_score || 0, rc.students?.full_name || '')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Students Summary */}
      {reportCards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Class Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {reportCards.map((rc) => (
                <div key={rc.id} className="pb-3 border-b last:border-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium">{rc.students?.full_name}</p>
                    <Badge>{rc.average_score}%</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    {generateClassTeacherRemark(rc.average_score || 0, rc.students?.full_name || '')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {reportCards.length === 0 && !isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No report cards found for this selection</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
