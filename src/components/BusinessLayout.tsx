import { useEffect, useState } from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { BusinessSidebar } from "@/components/BusinessSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionCheck } from "@/hooks/use-subscription-check";
import { useIsMobile } from "@/hooks/use-mobile";

interface LocationState {
  devBusinessType?: string;
  devBusinessName?: string;
}

export function BusinessLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [isDevMode, setIsDevMode] = useState(false);

  // Check subscription status
  const { isExpired, isLoading: subscriptionLoading } = useSubscriptionCheck();

  useEffect(() => {
    // Redirect to subscription expired page if subscription is expired
    if (!subscriptionLoading && isExpired) {
      navigate('/subscription-expired');
    }
  }, [isExpired, subscriptionLoading, navigate]);

  useEffect(() => {
    const state = location.state as LocationState;
    if (import.meta.env.DEV && state?.devBusinessType) {
      setBusinessName(state.devBusinessName || 'Dev Business');
      setBusinessType(state.devBusinessType);
      setIsDevMode(true);
      return;
    }

    setIsDevMode(false);
    checkAuth();
  }, [location.state]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id, role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
      }

      if (!profile?.tenant_id) {
        toast({
          title: "No Business Found",
          description: "Please complete your registration",
          variant: "destructive",
        });
        navigate('/signup');
        return;
      }

      const { data: tenant } = await supabase
        .from('tenants')
        .select('name, status, business_type')
        .eq('id', profile.tenant_id)
        .single();

      if (tenant) {
        setBusinessName(tenant.name);
        setBusinessType(tenant.business_type || '');

        // TEMPORARILY DISABLED - Allow all users to access dashboard
        // TODO: Re-enable after fixing database tenant status issues
        /*
        if (tenant.status !== 'active') {
          toast({
            title: "Account Inactive",
            description: "Your business account is not active yet",
            variant: "destructive",
          });
          navigate('/pending-approval');
          return;
        }
        */
        console.log('Tenant status:', tenant.status); // Debug log
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      navigate('/login');
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop sidebar - hidden on mobile */}
        <div className="hidden md:block">
          <BusinessSidebar businessName={businessName} businessType={businessType} devMode={isDevMode} />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Announcement Banner - Always visible at top */}
          <AnnouncementBanner />
          
          {/* Desktop header with sidebar trigger - hidden on mobile */}
          <header className="hidden md:flex h-14 border-b border-border items-center px-4 bg-card/95 backdrop-blur-sm sticky top-0 z-40">
            <SidebarTrigger className="touch-target" />
          </header>
          
          {/* Mobile header - shown only on mobile */}
          <header className="md:hidden h-14 border-b border-border flex items-center px-4 bg-card/95 backdrop-blur-sm sticky top-0 z-40 safe-top">
            <span className="font-semibold text-sm truncate">{businessName}</span>
          </header>
          
          {/* Main content - add bottom padding on mobile for bottom nav */}
          <main className="flex-1 overflow-auto p-4 sm:p-6 pb-24 md:pb-6 safe-bottom">
            <Outlet />
          </main>
        </div>
        
        {/* Mobile bottom navigation */}
        <MobileBottomNav businessType={businessType} devMode={isDevMode} />
      </div>
    </SidebarProvider>
  );
}