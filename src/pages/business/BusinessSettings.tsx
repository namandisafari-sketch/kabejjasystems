import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, Building, Users, Building2, Receipt, Mail, GraduationCap, Calendar, Clock, Home, Database } from "lucide-react";
import { ModuleManagement } from "@/components/business/ModuleManagement";
import { StaffManagement } from "@/components/business/StaffManagement";
import { BranchManagement } from "@/components/business/BranchManagement";
import { ReceiptSettings } from "@/components/business/ReceiptSettings";
import { LetterSettings } from "@/components/business/LetterSettings";
import { SchoolSettings } from "@/components/business/SchoolSettings";
import { DataBackupExport } from "@/components/business/DataBackupExport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenant } from "@/hooks/use-tenant";

const BusinessSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tenantData } = useTenant();
  const isSchool = ['kindergarten', 'primary_school', 'secondary_school'].includes(tenantData?.businessType || '');
  const isRental = tenantData?.businessType === 'rental_management';

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) return null;

      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*, packages(name, price, currency, validity_days, branch_limit, user_limit), rental_packages(name, monthly_price, max_properties, max_units, included_users)')
        .eq('id', profile.tenant_id)
        .single();

      return tenantData;
    },
  });

  const branchLimit = tenant?.packages?.branch_limit || 1;
  const userLimit = isRental ? (tenant?.rental_packages?.included_users || 1) : (tenant?.packages?.user_limit || 2);
  const propertyLimit = tenant?.rental_packages?.max_properties || 3;
  const unitLimit = tenant?.rental_packages?.max_units || 10;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Business Settings</h1>
          <p className="text-muted-foreground">Manage your business profile and preferences</p>
        </div>
      </div>

      <Tabs defaultValue="profile" className="max-w-4xl">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="profile" className="flex items-center gap-1">
            <Building className="h-4 w-4" />
            Profile
          </TabsTrigger>
          {!isRental && (
            <TabsTrigger value="branches" className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              Branches
            </TabsTrigger>
          )}
          <TabsTrigger value="staff" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Staff
          </TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="receipts" className="flex items-center gap-1">
            <Receipt className="h-4 w-4" />
            Receipts
          </TabsTrigger>
          {isSchool && (
            <TabsTrigger value="school" className="flex items-center gap-1">
              <GraduationCap className="h-4 w-4" />
              School
            </TabsTrigger>
          )}
          {isSchool && (
            <TabsTrigger value="letters" className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              Letters
            </TabsTrigger>
          )}
          <TabsTrigger value="backup" className="flex items-center gap-1">
            <Database className="h-4 w-4" />
            Backup
          </TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>Your business details and contact information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Business Name</Label>
                <Input value={tenant?.name || ''} readOnly className="bg-muted" />
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <Label>Business Type</Label>
                  <Input value={tenant?.business_type || ''} readOnly className="bg-muted capitalize" />
                </div>
                <div>
                  <Label>Business Code</Label>
                  <Input value={tenant?.business_code || ''} readOnly className="bg-muted font-mono font-bold tracking-widest" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Input value={tenant?.status || ''} readOnly className="bg-muted capitalize" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input value={tenant?.email || ''} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={tenant?.phone || ''} readOnly className="bg-muted" />
                </div>
              </div>
              <div>
                <Label>Address</Label>
                <Input value={tenant?.address || ''} readOnly className="bg-muted" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>Contact support for assistance</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you need to update your business information or have questions about your subscription, 
                please contact our support team.
              </p>
              <Button variant="outline">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {!isRental && (
          <TabsContent value="branches">
            <BranchManagement tenantId={tenant?.id || null} branchLimit={branchLimit} />
          </TabsContent>
        )}

        <TabsContent value="staff">
          <StaffManagement 
            tenantId={tenant?.id || null} 
            userLimit={userLimit}
            businessName={tenant?.name || ''}
            businessCode={tenant?.business_code || ''}
            businessType={tenant?.business_type || null}
          />
        </TabsContent>

        <TabsContent value="modules">
          <ModuleManagement tenantId={tenant?.id || null} businessType={tenant?.business_type || null} />
        </TabsContent>

        <TabsContent value="receipts">
          <ReceiptSettings 
            tenantId={tenant?.id || null} 
            businessName={tenant?.name} 
            currentLogoUrl={tenant?.logo_url}
            onLogoUpdate={() => queryClient.invalidateQueries({ queryKey: ['tenant-settings'] })}
          />
        </TabsContent>

        {isSchool && (
          <TabsContent value="school">
            <SchoolSettings tenantId={tenant?.id || null} />
          </TabsContent>
        )}

        {isSchool && (
          <TabsContent value="letters">
            <LetterSettings tenantId={tenant?.id || null} />
          </TabsContent>
        )}

        <TabsContent value="backup">
          <DataBackupExport tenantId={tenant?.id || null} businessType={tenant?.business_type || null} />
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
              <CardDescription>Your current plan and subscription status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Current Package</Label>
                  <Input value={isRental ? (tenant?.rental_packages?.name || 'No package') : (tenant?.packages?.name || 'No package')} readOnly className="bg-muted" />
                </div>
                <div>
                  <Label>{isRental ? 'Monthly Price' : 'Package Price'}</Label>
                  <Input 
                    value={isRental 
                      ? (tenant?.rental_packages ? `${new Intl.NumberFormat('en-UG', {
                          style: 'currency',
                          currency: 'UGX',
                          maximumFractionDigits: 0,
                        }).format(tenant.rental_packages.monthly_price)}` : 'N/A')
                      : (tenant?.packages ? `${new Intl.NumberFormat('en-UG', {
                          style: 'currency',
                          currency: tenant.packages.currency || 'UGX',
                          maximumFractionDigits: 0,
                        }).format(tenant.packages.price)}` : 'N/A')} 
                    readOnly 
                    className="bg-muted" 
                  />
                </div>
              </div>
              
              {/* Show rental-specific limits for rental businesses */}
              {isRental ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Property Limit</Label>
                    <Input value={`${propertyLimit} properties`} readOnly className="bg-muted" />
                  </div>
                  <div>
                    <Label>Unit Limit</Label>
                    <Input value={`${unitLimit} units`} readOnly className="bg-muted" />
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Branch Limit</Label>
                    <Input value={`${branchLimit} branches`} readOnly className="bg-muted" />
                  </div>
                  <div>
                    <Label>User Limit</Label>
                    <Input value={`${tenant?.packages?.user_limit || 5} users`} readOnly className="bg-muted" />
                  </div>
                </div>
              )}
              
              <div>
                <Label>Staff Users</Label>
                <Input value={`${userLimit} included`} readOnly className="bg-muted" />
              </div>
              {/* Subscription Cycle Progress */}
              {(() => {
                const validityDays = tenant?.packages?.validity_days || 30;
                const activatedAt = tenant?.activated_at ? new Date(tenant.activated_at) : null;
                const isTrial = tenant?.is_trial;
                const trialEndDate = tenant?.trial_end_date ? new Date(tenant.trial_end_date) : null;
                
                let startDate = activatedAt;
                let endDate: Date | null = null;
                let cycleDays = validityDays;
                
                if (isTrial && trialEndDate) {
                  endDate = trialEndDate;
                  cycleDays = tenant?.trial_days || 14;
                } else if (activatedAt) {
                  endDate = new Date(activatedAt);
                  endDate.setDate(endDate.getDate() + validityDays);
                }
                
                const now = new Date();
                const daysElapsed = startDate ? Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                const daysRemaining = Math.max(0, cycleDays - daysElapsed);
                const progress = Math.min(100, Math.max(0, (daysElapsed / cycleDays) * 100));
                
                return (
                  <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">
                          {isTrial ? 'Trial Period' : 'Subscription Cycle'}
                        </Label>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3.5 w-3.5" />
                        <span className={daysRemaining <= 3 ? 'text-destructive font-medium' : 'text-muted-foreground'}>
                          {daysRemaining} days remaining
                        </span>
                      </div>
                    </div>
                    
                    <Progress 
                      value={progress} 
                      className={`h-3 ${progress >= 80 ? '[&>div]:bg-destructive' : progress >= 60 ? '[&>div]:bg-warning' : ''}`}
                    />
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        Started: {startDate ? startDate.toLocaleDateString() : 'N/A'}
                      </span>
                      <span>
                        {isTrial ? 'Trial ends' : 'Renews'}: {endDate ? endDate.toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    
                    {daysRemaining <= 5 && (
                      <p className="text-xs text-destructive mt-2">
                        ⚠️ Your {isTrial ? 'trial' : 'subscription'} is ending soon. {isTrial ? 'Upgrade to continue.' : 'Please renew to avoid interruption.'}
                      </p>
                    )}
                  </div>
                );
              })()}
              <div>
                <Label>Referral Code</Label>
                <Input value={tenant?.referral_code || 'N/A'} readOnly className="bg-muted font-mono" />
                <p className="text-xs text-muted-foreground mt-1">
                  Share this code with others to earn rewards
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessSettings;