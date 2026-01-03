import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSubscriptionCheck() {
  const { data, isLoading } = useQuery({
    queryKey: ['subscription-check'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user's profile to find tenant
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) return null;

      // Admins bypass subscription check
      if (profile.role === 'superadmin' || profile.role === 'admin') {
        return { isActive: true, isExpired: false, tenantId: profile.tenant_id };
      }

      // Get tenant subscription status including trial info
      const { data: tenant } = await supabase
        .from('tenants')
        .select('subscription_status, subscription_end_date, name, is_trial, trial_end_date')
        .eq('id', profile.tenant_id)
        .single();

      if (!tenant) return null;

      const now = new Date();
      
      // Check trial status
      if (tenant.is_trial) {
        const trialEndDate = tenant.trial_end_date ? new Date(tenant.trial_end_date) : null;
        const isTrialExpired = trialEndDate ? now > trialEndDate : false;
        
        return {
          isActive: !isTrialExpired,
          isExpired: isTrialExpired,
          isTrial: true,
          trialEndDate: tenant.trial_end_date,
          subscriptionStatus: tenant.subscription_status,
          endDate: tenant.subscription_end_date,
          tenantName: tenant.name,
          tenantId: profile.tenant_id,
        };
      }

      // Regular subscription check
      const endDate = tenant.subscription_end_date ? new Date(tenant.subscription_end_date) : null;
      const isExpired = endDate ? now > endDate : false;
      const isActive = tenant.subscription_status === 'active' && !isExpired;

      return {
        isActive,
        isExpired,
        isTrial: false,
        subscriptionStatus: tenant.subscription_status,
        endDate: tenant.subscription_end_date,
        tenantName: tenant.name,
        tenantId: profile.tenant_id,
      };
    },
    refetchInterval: 60000, // Check every minute
  });

  return {
    subscriptionData: data,
    isLoading,
    isActive: data?.isActive ?? true,
    isExpired: data?.isExpired ?? false,
  };
}
