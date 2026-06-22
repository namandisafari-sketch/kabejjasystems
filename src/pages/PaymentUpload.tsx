import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/i18n";

const PaymentUpload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [tenantData, setTenantData] = useState<any>(null);
  const [packageData, setPackageData] = useState<any>(null);
  const [schoolSubscription, setSchoolSubscription] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    paymentMethod: "",
    transactionRef: "",
    notes: "",
  });

  // Check if this is a school-type business
  const isSchoolType = tenantData?.business_type && 
    ['kindergarten', 'primary_school', 'secondary_school'].includes(tenantData.business_type);

  // Fetch payment instructions from settings
  const { data: paymentInstructions } = useQuery({
    queryKey: ['payment-instructions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'payment_instructions')
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching payment instructions:', error);
        return '<p>Please contact support for payment instructions.</p>';
      }
      
      return data?.value || '<p>Please contact support for payment instructions.</p>';
    },
  });

  useEffect(() => {
    fetchTenantData();
  }, []);

  const fetchTenantData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) {
        toast({
          title: t.common.error,
          description: t.auth.signup,
          variant: "destructive",
        });
        navigate('/signup');
        return;
      }

      const { data: tenant } = await supabase
        .from('tenants')
        .select('*, packages(*)')
        .eq('id', profile.tenant_id)
        .single();

      setTenantData(tenant);
      
      // Check if it's a school type - fetch school subscription instead
      const businessType = tenant?.business_type;
      if (businessType && ['kindergarten', 'primary_school', 'secondary_school'].includes(businessType)) {
        // Fetch school subscription with package details
        const { data: subscription } = await supabase
          .from('school_subscriptions')
          .select('*, school_packages(*)')
          .eq('tenant_id', profile.tenant_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (subscription) {
          setSchoolSubscription(subscription);
          setPackageData(subscription.school_packages);
        }
      } else {
        setPackageData(tenant?.packages);
      }
    } catch (error: any) {
      console.error('Error fetching tenant:', error);
    } finally {
      setPageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.paymentMethod || !formData.transactionRef) {
      toast({
        title: t.messages.toastTitles[84],
        description: t.messages.toastDescriptions.pleaseFillRequired,
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (isSchoolType && schoolSubscription) {
        // Update school subscription payment status
        const { error } = await supabase
          .from('school_subscriptions')
          .update({
            payment_status: 'pending_verification',
          })
          .eq('id', schoolSubscription.id);

        if (error) throw error;
      } else if (packageData) {
        // Regular business - create payment upload
        const { error } = await supabase
          .from('payment_uploads')
          .insert({
            tenant_id: tenantData.id,
            uploader_id: user.id,
            package_id: packageData.id,
            amount: packageData.price,
            currency: packageData.currency || 'UGX',
            payment_method: formData.paymentMethod,
            transaction_ref: formData.transactionRef,
            status: 'pending',
          });

        if (error) throw error;
      }

      toast({
        title: t.messages.toastTitles[99],
        description: t.messages.toastDescriptions.adminWillReview,
      });

      navigate('/pending-approval');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: t.messages.toastTitles[160],
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (!tenantData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">{t.common.error}</p>
            <Button onClick={() => navigate('/signup')}>{t.auth.signup}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get package info - either regular or school package
  const displayPackage = packageData;
  const packageName = displayPackage?.name || 'Selected Package';
  const packagePrice = isSchoolType 
    ? displayPackage?.price_per_term 
    : displayPackage?.price;

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{t.common.submit}</CardTitle>
            <CardDescription>
              {t.pages.pendingApproval.description}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Package Summary */}
            {displayPackage && (
              <Card className="mb-6 bg-accent/5 border-accent">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{t.common.category}:</span>
                    <span className="text-lg font-bold">{packageName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{t.common.amount}:</span>
                    <span className="text-2xl font-bold text-accent">
                      {packagePrice ? new Intl.NumberFormat('en-UG', { 
                        style: 'currency', 
                        currency: 'UGX', 
                        maximumFractionDigits: 0 
                      }).format(packagePrice) : t.common.notes}
                      {isSchoolType && <span className="text-sm font-normal text-muted-foreground">/{t.common.total}</span>}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Instructions */}
            <Card className="mb-6 bg-muted/50">
              <CardHeader>
                <CardTitle className="text-lg">{t.fees.paymentMethod}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div dangerouslySetInnerHTML={{ __html: paymentInstructions || '' }} />
              </CardContent>
            </Card>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="paymentMethod">{t.fees.paymentMethod} *</Label>
                <Input
                  id="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  placeholder={t.fees.paymentMethod}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="transactionRef">{t.common.notes} *</Label>
                <Input
                  id="transactionRef"
                  value={formData.transactionRef}
                  onChange={(e) => setFormData(prev => ({ ...prev, transactionRef: e.target.value }))}
                  placeholder={t.common.notes}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="notes">{t.common.notes}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder={t.common.notes}
                  rows={3}
                />
              </div>
              
              <Button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent/90">
                {loading ? `${t.common.submit}...` : t.common.submit}
                <Upload className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PaymentUpload;