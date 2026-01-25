import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Phone, Mail, RefreshCw, Clock, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function SubscriptionExpired() {
  const navigate = useNavigate();

  // Get tenant info to check if it's a trial
  const { data: tenantInfo } = useQuery({
    queryKey: ['expired-tenant-info'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) return null;

      const { data: tenant } = await supabase
        .from('tenants')
        .select('name, is_trial, trial_end_date')
        .eq('id', profile.tenant_id)
        .single();

      return tenant;
    },
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleUpgrade = () => {
    navigate('/payment');
  };

  const isTrial = tenantInfo?.is_trial;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 bg-destructive/10 rounded-full w-fit">
            {isTrial ? (
              <Clock className="h-12 w-12 text-warning" />
            ) : (
              <AlertTriangle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isTrial ? "Free Trial Ended" : "Subscription Expired"}
          </CardTitle>
          <CardDescription className="text-base">
            {isTrial
              ? "Your 14-day free trial has ended. Upgrade now to continue using all features!"
              : "Your business subscription has reached its cycle limit. Please contact the administrator to renew your subscription."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isTrial ? (
            <div className="bg-primary/10 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-primary">Ready to Continue?</h4>
              <p className="text-sm text-muted-foreground">
                Upgrade to a paid plan to keep all your data and continue managing your business.
              </p>
              <Button onClick={handleUpgrade} className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                All users linked to this business cannot access the system until the subscription is renewed.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium text-center">Contact Support:</p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <a href="tel:+256700000000" className="flex items-center gap-1 hover:text-primary">
                <Phone className="h-4 w-4" />
                +256 700 000 000
              </a>
              <a href="mailto:support@kabejja.com" className="flex items-center gap-1 hover:text-primary">
                <Mail className="h-4 w-4" />
                Email Support
              </a>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleLogout}>
              Log Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}