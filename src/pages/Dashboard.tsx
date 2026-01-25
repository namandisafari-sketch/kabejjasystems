import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/login');
        return;
      }

      // Load profile to determine user role and tenant status
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, tenant_id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        navigate('/login');
        return;
      }

      if (!profileData) {
        // User exists in auth but has no profile - incomplete signup
        // TEMP FIX: Navigate directly to business page
        console.log('No profile data - navigating to business');
        navigate('/business');
        return;
      }

      // Check for dev mode - admins can view as a tenant
      const devTenantId = localStorage.getItem('dev_tenant_id');
      const isAdmin = profileData.role === 'superadmin' || profileData.role === 'admin';

      // If admin is in dev mode with a tenant selected, go to business portal
      if (isAdmin && devTenantId) {
        navigate('/business');
        return;
      }

      // Platform admins go to admin portal (when not in dev mode)
      if (isAdmin) {
        navigate('/admin');
        return;
      }

      // Users without tenant assignment go to business anyway (TEMP)
      if (!profileData.tenant_id) {
        console.log('No tenant_id - navigating to business anyway');
        navigate('/business');
        return;
      }

      // Check tenant status for business owners
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('status, is_trial, trial_end_date')
        .eq('id', profileData.tenant_id)
        .maybeSingle();

      if (tenantError) {
        console.error('Tenant fetch error:', tenantError);
        navigate('/login');
        return;
      }

      // Check if trial user with expired trial
      if (tenant?.is_trial && tenant?.trial_end_date) {
        const trialEnd = new Date(tenant.trial_end_date);
        if (new Date() > trialEnd) {
          navigate('/subscription-expired');
          return;
        }
      }

      // Active tenants (including trial) go to business portal
      // TEMP: Allow all users regardless of status
      console.log('Tenant status:', tenant?.status);
      navigate('/business');
      return;

      // DISABLED: All other statuses redirect
      // navigate('/pending-approval');

    } catch (error) {
      console.error('Auth check failed:', error);
      navigate('/login');
    }
  };

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};

export default Dashboard;
