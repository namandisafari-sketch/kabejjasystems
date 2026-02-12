import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StaffPermissions {
  branch_id: string | null;
  allowed_modules: string[];
  is_active: boolean;
}

interface TeacherAssignment {
  class_ids: string[];
  subject_ids: string[];
  is_class_teacher: boolean;
  class_teacher_id: string | null;
}

export function useStaffPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: ['current-user-permissions'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user's profile to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id, role')
        .eq('id', user.id)
        .single();

      if (!profile) return null;

      // Tenant owners and admins have full access
      if (profile.role === 'tenant_owner' || profile.role === 'superadmin' || profile.role === 'admin') {
        return {
          hasFullAccess: true,
          allowedModules: null, // null means all modules
          branchId: null, // null means all branches
          staffType: 'owner',
          teacherAssignments: null,
        };
      }

      // Get staff permissions
      const { data: permissions } = await supabase
        .from('staff_permissions')
        .select('branch_id, allowed_modules, is_active, staff_type')
        .eq('profile_id', user.id)
        .eq('tenant_id', profile.tenant_id!)
        .eq('is_active', true)
        .single();

      // Get teacher assignments if staff is a teacher
      let teacherAssignments: TeacherAssignment | null = null;
      if (permissions?.staff_type === 'teacher') {
        const { data: classAssignments } = await supabase
          .from('teacher_class_assignments')
          .select('class_id, is_class_teacher')
          .eq('teacher_id', user.id)
          .eq('tenant_id', profile.tenant_id!);

        const { data: subjectAssignments } = await supabase
          .from('teacher_subject_assignments')
          .select('subject_id')
          .eq('teacher_id', user.id)
          .eq('tenant_id', profile.tenant_id!);

        const classTeacher = classAssignments?.find(c => c.is_class_teacher);

        teacherAssignments = {
          class_ids: classAssignments?.map(c => c.class_id) || [],
          subject_ids: subjectAssignments?.map(s => s.subject_id) || [],
          is_class_teacher: !!classTeacher,
          class_teacher_id: classTeacher?.class_id || null,
        };
      }

      if (!permissions) {
        // Staff without explicit permissions - show only dashboard
        return {
          hasFullAccess: false,
          allowedModules: ['dashboard', 'settings'],
          branchId: null,
          staffType: 'general',
          teacherAssignments: null,
        };
      }

      return {
        hasFullAccess: false,
        allowedModules: [...(permissions.allowed_modules || []), 'settings'], // Always include settings
        branchId: permissions.branch_id,
        staffType: permissions.staff_type || 'general',
        teacherAssignments,
      };
    },
  });

  const isModuleAllowed = (moduleCode: string): boolean => {
    if (!data) return false;
    if (data.hasFullAccess) return true;
    return data.allowedModules?.includes(moduleCode) ?? false;
  };

  const isClassAllowed = (classId: string): boolean => {
    if (!data) return false;
    if (data.hasFullAccess) return true;
    if (!data.teacherAssignments) return true; // Non-teachers have access to all if they have module access
    return data.teacherAssignments.class_ids.includes(classId);
  };

  const isSubjectAllowed = (subjectId: string): boolean => {
    if (!data) return false;
    if (data.hasFullAccess) return true;
    if (!data.teacherAssignments) return true; // Non-teachers have access to all if they have module access
    return data.teacherAssignments.subject_ids.includes(subjectId);
  };

  return {
    permissions: data,
    isLoading,
    isModuleAllowed,
    isClassAllowed,
    isSubjectAllowed,
    hasFullAccess: data?.hasFullAccess ?? false,
    allowedModules: data?.allowedModules ?? [],
    branchId: data?.branchId ?? null,
    staffType: data?.staffType ?? 'general',
    isTeacher: data?.staffType === 'teacher',
    teacherAssignments: data?.teacherAssignments ?? null,
  };
}
