import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getStaffPortalRoute, STAFF_BUSINESS_ROLES } from "@/lib/staff-routing";
import { useLanguage } from "@/i18n";

const Dashboard = () => {
  const { t } = useLanguage();
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

      // Staff members - route by staff_type
      if (profileData.role === 'staff') {
        const { data: permissions } = await supabase
          .from('staff_permissions')
          .select('staff_type')
          .eq('profile_id', session.user.id)
          .eq('tenant_id', profileData.tenant_id!)
          .maybeSingle();

        const staffType = permissions?.staff_type || 'general';
        const portalRoute = getStaffPortalRoute(staffType);

        if (portalRoute) {
          navigate(portalRoute);
        } else {
          navigate('/business');
        }
        return;
      }

      // Users without tenant assignment go to business anyway (TEMP)
      if (!profileData.tenant_id) {
        console.log('No tenant_id - navigating to business anyway');
        navigate('/business');
        return;
      }

      // Check tenant subscription status for business owners
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('status, is_trial, trial_end_date, subscription_status, subscription_end_date')
        .eq('id', profileData.tenant_id)
        .maybeSingle();

      if (tenantError) {
        console.error('Tenant fetch error:', tenantError);
        navigate('/login');
        return;
      }

      if (tenant) {
        let isExpired = false;

        // Suspended or rejected tenants are blocked
        if (tenant.status === 'suspended' || tenant.status === 'rejected') {
          isExpired = true;
        }

        // Trial expired
        if (tenant.is_trial && tenant.trial_end_date) {
          if (new Date() > new Date(tenant.trial_end_date)) {
            isExpired = true;
          }
        }

        // Subscription explicitly marked expired
        if (tenant.subscription_status === 'expired') {
          isExpired = true;
        }

        // Subscription end date passed
        if (tenant.subscription_end_date) {
          if (new Date() > new Date(tenant.subscription_end_date)) {
            isExpired = true;
          }
        }

        if (isExpired) {
          navigate('/subscription-expired');
          return;
        }
      }

      // Check if tenant_owner also has staff portal permissions
      const { data: portalPerms } = await supabase
        .from('staff_permissions')
        .select('staff_type')
        .eq('profile_id', session.user.id)
        .eq('tenant_id', profileData.tenant_id!)
        .maybeSingle();

      const portalRoute = portalPerms?.staff_type ? getStaffPortalRoute(portalPerms.staff_type) : null;
      if (portalRoute) {
        navigate(portalRoute);
        return;
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
        <p className="text-muted-foreground">{t.common.loading}</p>
      </div>
    </div>
  );
};

export default Dashboard;
