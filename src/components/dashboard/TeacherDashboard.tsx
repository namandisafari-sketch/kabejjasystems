import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useTenant } from "@/hooks/use-tenant";
import { useStaffPermissions } from "@/hooks/use-staff-permissions";
import { Link } from "react-router-dom";
import { 
  BookOpen, Users, Calendar, ClipboardCheck, GraduationCap, 
  FileText, Clock, CheckCircle2 
} from "lucide-react";

const TeacherDashboard = () => {
  const { data: tenant } = useTenant();
  const { teacherAssignments } = useStaffPermissions();

  const { data: currentTerm } = useQuery({
    queryKey: ['current-term', tenant?.tenantId],
    queryFn: async () => {
      if (!tenant?.tenantId) return null;
      const { data } = await supabase
        .from('academic_terms')
        .select('*')
        .eq('tenant_id', tenant.tenantId)
        .eq('is_current', true)
        .maybeSingle();
      return data;
    },
    enabled: !!tenant?.tenantId,
  });

  // My assigned classes
  const { data: myClasses = [] } = useQuery({
    queryKey: ['teacher-classes', tenant?.tenantId, teacherAssignments?.class_ids],
    queryFn: async () => {
      if (!tenant?.tenantId || !teacherAssignments?.class_ids?.length) return [];
      const { data } = await supabase
        .from('school_classes')
        .select('id, name, grade, level, capacity')
        .eq('tenant_id', tenant.tenantId)
        .in('id', teacherAssignments.class_ids);
      
      if (!data) return [];

      // Get enrollment counts
      const { data: students } = await supabase
        .from('students')
        .select('class_id')
        .eq('tenant_id', tenant.tenantId)
        .eq('is_active', true)
        .in('class_id', teacherAssignments.class_ids);

      const counts: Record<string, number> = {};
      (students || []).forEach(s => { counts[s.class_id] = (counts[s.class_id] || 0) + 1; });

      return data.map(c => ({ ...c, enrolled: counts[c.id] || 0 }));
    },
    enabled: !!tenant?.tenantId && !!teacherAssignments?.class_ids?.length,
  });

  // My subjects
  const { data: mySubjects = [] } = useQuery({
    queryKey: ['teacher-subjects', tenant?.tenantId, teacherAssignments?.subject_ids],
    queryFn: async () => {
      if (!tenant?.tenantId || !teacherAssignments?.subject_ids?.length) return [];
      const { data } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('tenant_id', tenant.tenantId)
        .in('id', teacherAssignments.subject_ids);
      return data || [];
    },
    enabled: !!tenant?.tenantId && !!teacherAssignments?.subject_ids?.length,
  });

  // Upcoming exams for my classes
  const { data: upcomingExams = [] } = useQuery({
    queryKey: ['teacher-exams', tenant?.tenantId, teacherAssignments?.class_ids],
    queryFn: async () => {
      if (!tenant?.tenantId || !teacherAssignments?.class_ids?.length) return [];
      const { data } = await supabase
        .from('exams')
        .select('id, name, exam_date, class_id, subject_id, school_classes(name), subjects(name)')
        .eq('tenant_id', tenant.tenantId)
        .in('class_id', teacherAssignments.class_ids)
        .gte('exam_date', new Date().toISOString().split('T')[0])
        .order('exam_date')
        .limit(6);
      return data || [];
    },
    enabled: !!tenant?.tenantId && !!teacherAssignments?.class_ids?.length,
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your class overview.</p>
        </div>
        <div className="flex items-center gap-2">
          {currentTerm && (
            <Badge variant="secondary" className="text-sm">
              <Calendar className="h-3 w-3 mr-1" />
              {currentTerm.name} ({currentTerm.year})
            </Badge>
          )}
          {teacherAssignments?.is_class_teacher && (
            <Badge className="bg-primary/10 text-primary border-primary/20">
              <GraduationCap className="h-3 w-3 mr-1" />
              Class Teacher
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myClasses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">My Subjects</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mySubjects.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{myClasses.reduce((sum, c) => sum + c.enrolled, 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Exams</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingExams.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* My Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              My Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myClasses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No classes assigned yet</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {myClasses.map(cls => (
                  <div key={cls.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{cls.name}</h4>
                      {teacherAssignments?.class_teacher_id === cls.id && (
                        <Badge variant="outline" className="text-xs">CT</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{cls.level} • {cls.grade}</p>
                    <div className="mt-2 flex items-center gap-1 text-sm">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span>{cls.enrolled} / {cls.capacity || '∞'} students</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* My Subjects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Subjects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mySubjects.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No subjects assigned yet</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {mySubjects.map(sub => (
                  <div key={sub.id} className="border rounded-lg p-4">
                    <h4 className="font-semibold">{sub.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground font-mono">{sub.code}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Exams */}
      <Card className="mb-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Upcoming Exams
          </CardTitle>
          <Link to="/business/exams">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {upcomingExams.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No upcoming exams</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingExams.map((exam: any) => (
                <div key={exam.id} className="border rounded-lg p-4">
                  <h4 className="font-semibold text-sm">{exam.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{exam.subjects?.name}</p>
                  <div className="flex items-center justify-between mt-3">
                    <Badge variant="outline" className="text-xs">{exam.school_classes?.name}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(exam.exam_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link to="/business/attendance">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <CheckCircle2 className="h-5 w-5" />
                <span className="text-xs">Take Attendance</span>
              </Button>
            </Link>
            <Link to="/business/exams">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <ClipboardCheck className="h-5 w-5" />
                <span className="text-xs">Enter Marks</span>
              </Button>
            </Link>
            <Link to="/business/report-cards">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <FileText className="h-5 w-5" />
                <span className="text-xs">Report Cards</span>
              </Button>
            </Link>
            <Link to="/business/students">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Users className="h-5 w-5" />
                <span className="text-xs">My Students</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherDashboard;
