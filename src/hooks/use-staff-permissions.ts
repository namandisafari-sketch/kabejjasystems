import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StaffPermissions {
  branch_id: string | null;
  allowed_modules: string[];
  is_active: boolean;
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
        };
      }

      // Get staff permissions
      const { data: permissions } = await supabase
        .from('staff_permissions')
        .select('branch_id, allowed_modules, is_active')
        .eq('profile_id', user.id)
        .eq('tenant_id', profile.tenant_id!)
        .eq('is_active', true)
        .single();

      if (!permissions) {
        // Staff without explicit permissions - show only dashboard
        return {
          hasFullAccess: false,
          allowedModules: ['dashboard', 'settings'],
          branchId: null,
        };
      }

      return {
        hasFullAccess: false,
        allowedModules: [...(permissions.allowed_modules || []), 'settings'], // Always include settings
        branchId: permissions.branch_id,
      };
    },
  });

  const isModuleAllowed = (moduleCode: string): boolean => {
    if (!data) return false;
    if (data.hasFullAccess) return true;
    return data.allowedModules?.includes(moduleCode) ?? false;
  };

  return {
    permissions: data,
    isLoading,
    isModuleAllowed,
    hasFullAccess: data?.hasFullAccess ?? false,
    allowedModules: data?.allowedModules ?? [],
    branchId: data?.branchId ?? null,
  };
}