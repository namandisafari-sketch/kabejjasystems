import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Phone, Mail, RefreshCw, Clock, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n";

export default function SubscriptionExpired() {
  const navigate = useNavigate();
  const { t } = useLanguage();

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
            {isTrial ? t.pages.subscriptionExpired.trialEnded : t.pages.subscriptionExpired.subscriptionExpired}
          </CardTitle>
          <CardDescription className="text-base">
            {isTrial
              ? t.pages.subscriptionExpired.trialMessage
              : t.pages.subscriptionExpired.expiredMessage
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isTrial ? (
            <div className="bg-primary/10 rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-primary">{t.pages.subscriptionExpired.readyToContinue}</h4>
              <p className="text-sm text-muted-foreground">
                {t.pages.subscriptionExpired.upgradeMessage}
              </p>
              <Button onClick={handleUpgrade} className="w-full">
                <CreditCard className="h-4 w-4 mr-2" />
                {t.pages.subscriptionExpired.upgradeNow}
              </Button>
            </div>
          ) : (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <p className="text-sm text-muted-foreground text-center">
                {t.pages.subscriptionExpired.accessDenied}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium text-center">{t.pages.subscriptionExpired.contactSupport}</p>
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <a href="tel:+256700000000" className="flex items-center gap-1 hover:text-primary">
                <Phone className="h-4 w-4" />
                +256 700 000 000
              </a>
              <a href="mailto:support@tennahubapps.com" className="flex items-center gap-1 hover:text-primary">
                <Mail className="h-4 w-4" />
                {t.pages.subscriptionExpired.emailSupport}
              </a>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t.pages.subscriptionExpired.refresh}
            </Button>
            <Button variant="destructive" className="flex-1" onClick={handleLogout}>
              {t.pages.subscriptionExpired.logOut}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}