import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useTenant = () => {
  return useQuery({
    queryKey: ['current-tenant'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      // Check for dev mode - admins can view as a tenant
      const devTenantId = localStorage.getItem('dev_tenant_id');
      const isAdmin = profile.role === 'superadmin' || profile.role === 'admin';

      const tenantId = (isAdmin && devTenantId) ? devTenantId : profile.tenant_id;

      // Get tenant details including business_type and business_code
      let businessType: string | null = null;
      let businessCode: string | null = null;
      if (tenantId) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('business_type, business_code')
          .eq('id', tenantId)
          .maybeSingle();
        
        businessType = tenant?.business_type || null;
        businessCode = tenant?.business_code || null;
      }

      return {
        tenantId,
        businessType,
        businessCode,
        isDevMode: isAdmin && !!devTenantId,
        userRole: profile.role,
      };
    },
  });
};
