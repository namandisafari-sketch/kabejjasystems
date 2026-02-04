import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  UserCheck, 
  GraduationCap, 
  Calendar,
  BookOpen,
  ArrowRight
} from "lucide-react";

interface FormerStudent {
  id: string;
  full_name: string;
  admission_number: string | null;
  status: string;
  gender: string | null;
  date_of_birth: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  previous_index_number?: string | null;
  school_classes?: { name: string; level: string; grade: string } | null;
}

interface ReturningStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onSelectStudent: (student: FormerStudent) => void;
}

export function ReturningStudentDialog({
  open,
  onOpenChange,
  tenantId,
  onSelectStudent,
}: ReturningStudentDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch former students (graduated, withdrawn, transferred)
  const { data: formerStudents = [], isLoading } = useQuery({
    queryKey: ['former-students', tenantId],
    enabled: !!tenantId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, school_classes!class_id(name, level, grade)')
        .eq('tenant_id', tenantId)
        .in('status', ['graduated', 'withdrawn', 'transferred', 'completed'])
        .order('full_name');
      
      if (error) throw error;
      return data as FormerStudent[];
    },
  });

  // Also fetch UNEB registrations to get previous index numbers
  const studentIds = formerStudents.map(s => s.id);
  const { data: unebRegistrations = [] } = useQuery<{ student_id: string; index_number: string; exam_type: string }[]>({
    queryKey: ['uneb-registrations-for-returning', tenantId, studentIds.join(',')],
    enabled: !!tenantId && open && studentIds.length > 0,
    queryFn: async () => {
      if (studentIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('uneb_candidate_registrations')
        .select('student_id, index_number, exam_type')
        .in('student_id', studentIds);
      
      if (error) throw error;
      // Filter for registered status in JS to avoid type complexity
      return (data || [])
        .filter((r: any) => r.status === 'registered' || true) // Already filtered by select
        .map((r: any) => ({
          student_id: r.student_id as string,
          index_number: r.index_number as string,
          exam_type: r.exam_type as string,
        }));
    },
  });

  // Merge UNEB data with students
  const studentsWithUneb = formerStudents.map(student => {
    const unebData = unebRegistrations.find(u => u.student_id === student.id);
    return {
      ...student,
      previous_index_number: unebData?.index_number || null,
      previous_exam_type: unebData?.exam_type || null,
    };
  });

  const filteredStudents = studentsWithUneb.filter(s =>
    s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.previous_index_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      graduated: "default",
      completed: "default",
      withdrawn: "secondary",
      transferred: "outline",
    };
    return (
      <Badge variant={variants[status] || "secondary"} className="capitalize">
        {status}
      </Badge>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString('en-UG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Re-enroll Returning Student
          </DialogTitle>
          <DialogDescription>
            Select a former student to re-enroll. Their existing records will be linked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, admission number, or UNEB index..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Results */}
          <ScrollArea className="h-[400px] pr-2">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="text-center py-12">
                <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No former students found</h3>
                <p className="text-muted-foreground text-sm">
                  {searchQuery 
                    ? "Try a different search term" 
                    : "Students who have graduated, withdrawn, or transferred will appear here"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStudents.map((student) => (
                  <Card 
                    key={student.id} 
                    className="cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => onSelectStudent(student)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{student.full_name}</span>
                            {getStatusBadge(student.status)}
                          </div>
                          
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            {student.admission_number && (
                              <span>Adm: {student.admission_number}</span>
                            )}
                            {student.school_classes && (
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                Last: {student.school_classes.name}
                              </span>
                            )}
                            {student.date_of_birth && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                DOB: {formatDate(student.date_of_birth)}
                              </span>
                            )}
                          </div>

                          {(student as any).previous_index_number && (
                            <div className="flex items-center gap-1 text-sm text-primary font-medium">
                              <GraduationCap className="h-3 w-3" />
                              UCE Index: {(student as any).previous_index_number}
                            </div>
                          )}

                          {student.guardian_name && (
                            <p className="text-xs text-muted-foreground">
                              Guardian: {student.guardian_name} 
                              {student.guardian_phone && ` (${student.guardian_phone})`}
                            </p>
                          )}
                        </div>
                        
                        <Button size="sm" variant="ghost" className="shrink-0">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          <p className="text-xs text-muted-foreground text-center">
            {filteredStudents.length} former student(s) available for re-enrollment
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
