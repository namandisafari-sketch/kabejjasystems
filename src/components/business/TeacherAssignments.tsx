import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, GraduationCap, Loader2 } from "lucide-react";

interface TeacherAssignmentsProps {
  tenantId: string;
  selectedClasses: string[];
  selectedSubjects: { subjectId: string; classId?: string }[];
  onClassesChange: (classes: string[]) => void;
  onSubjectsChange: (subjects: { subjectId: string; classId?: string }[]) => void;
  isClassTeacher: boolean;
  onClassTeacherChange: (isClassTeacher: boolean) => void;
  classTeacherId?: string;
  onClassTeacherIdChange?: (classId: string) => void;
}

export function TeacherAssignments({
  tenantId,
  selectedClasses,
  selectedSubjects,
  onClassesChange,
  onSubjectsChange,
  isClassTeacher,
  onClassTeacherChange,
  classTeacherId,
  onClassTeacherIdChange,
}: TeacherAssignmentsProps) {
  // Fetch classes
  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ['school-classes-for-assignment', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_classes')
        .select('id, name, level, grade')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('level')
        .order('grade');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  // Fetch subjects
  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects-for-assignment', tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, code, level')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const toggleClass = (classId: string) => {
    if (selectedClasses.includes(classId)) {
      onClassesChange(selectedClasses.filter(id => id !== classId));
      // Also remove as class teacher if needed
      if (classTeacherId === classId && onClassTeacherIdChange) {
        onClassTeacherIdChange('');
      }
    } else {
      onClassesChange([...selectedClasses, classId]);
    }
  };

  const toggleSubject = (subjectId: string) => {
    const exists = selectedSubjects.some(s => s.subjectId === subjectId);
    if (exists) {
      onSubjectsChange(selectedSubjects.filter(s => s.subjectId !== subjectId));
    } else {
      onSubjectsChange([...selectedSubjects, { subjectId }]);
    }
  };

  const setAsClassTeacher = (classId: string) => {
    if (onClassTeacherIdChange) {
      if (classTeacherId === classId) {
        onClassTeacherIdChange('');
        onClassTeacherChange(false);
      } else {
        onClassTeacherIdChange(classId);
        onClassTeacherChange(true);
        // Auto-select the class if not already selected
        if (!selectedClasses.includes(classId)) {
          onClassesChange([...selectedClasses, classId]);
        }
      }
    }
  };

  // Group classes by level
  const groupedClasses = classes.reduce((acc, cls) => {
    const level = cls.level || 'Other';
    if (!acc[level]) acc[level] = [];
    acc[level].push(cls);
    return acc;
  }, {} as Record<string, typeof classes>);

  if (loadingClasses || loadingSubjects) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading assignments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Class Assignments */}
      <div>
        <Label className="flex items-center gap-2 mb-3">
          <GraduationCap className="h-4 w-4" />
          Assigned Classes
        </Label>
        <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
          {Object.entries(groupedClasses).map(([level, levelClasses]) => (
            <div key={level} className="mb-3 last:mb-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{level}</p>
              <div className="grid grid-cols-2 gap-2">
                {levelClasses.map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between space-x-2 p-2 rounded hover:bg-muted/50">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`class-${cls.id}`}
                        checked={selectedClasses.includes(cls.id)}
                        onCheckedChange={() => toggleClass(cls.id)}
                      />
                      <Label htmlFor={`class-${cls.id}`} className="text-sm font-normal cursor-pointer">
                        {cls.name}
                      </Label>
                    </div>
                    {selectedClasses.includes(cls.id) && (
                      <Badge
                        variant={classTeacherId === cls.id ? "default" : "outline"}
                        className="text-xs cursor-pointer"
                        onClick={() => setAsClassTeacher(cls.id)}
                      >
                        {classTeacherId === cls.id ? "Class Teacher" : "Set CT"}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {classes.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">No classes available</p>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Teacher can only manage attendance/marks for assigned classes
        </p>
      </div>

      <Separator />

      {/* Subject Assignments */}
      <div>
        <Label className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4" />
          Assigned Subjects
        </Label>
        <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            {subjects.map((subject) => (
              <div key={subject.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`subject-${subject.id}`}
                  checked={selectedSubjects.some(s => s.subjectId === subject.id)}
                  onCheckedChange={() => toggleSubject(subject.id)}
                />
                <Label htmlFor={`subject-${subject.id}`} className="text-sm font-normal cursor-pointer">
                  {subject.name}
                  {subject.code && <span className="text-muted-foreground ml-1">({subject.code})</span>}
                </Label>
              </div>
            ))}
          </div>
          {subjects.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">No subjects available</p>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Teacher can only enter marks for assigned subjects
        </p>
      </div>

      {/* Summary */}
      {(selectedClasses.length > 0 || selectedSubjects.length > 0) && (
        <div className="bg-muted/50 rounded-md p-3">
          <p className="text-xs font-semibold mb-2">Assignment Summary</p>
          <div className="flex flex-wrap gap-1">
            {selectedClasses.map(classId => {
              const cls = classes.find(c => c.id === classId);
              return cls ? (
                <Badge key={classId} variant="secondary" className="text-xs">
                  {cls.name}
                  {classTeacherId === classId && " (CT)"}
                </Badge>
              ) : null;
            })}
            {selectedSubjects.map(({ subjectId }) => {
              const subject = subjects.find(s => s.id === subjectId);
              return subject ? (
                <Badge key={subjectId} variant="outline" className="text-xs">
                  {subject.name}
                </Badge>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
