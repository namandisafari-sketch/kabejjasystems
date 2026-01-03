import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { db } from "@/hooks/use-database";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, AlertCircle, Bug, Eye, X, Rocket, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";
import { supabase } from "@/hooks/use-database";

// Validation schema for payment instructions
const paymentInstructionsSchema = z.string()
  .trim()
  .min(10, { message: "Payment instructions must be at least 10 characters" })
  .max(2000, { message: "Payment instructions must be less than 2000 characters" });

const AdminSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentInstructions, setPaymentInstructions] = useState("");
  const [validationError, setValidationError] = useState("");
  const [devTenantId, setDevTenantId] = useState<string | null>(null);

  // Load dev tenant from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('dev_tenant_id');
    if (stored) setDevTenantId(stored);
  }, []);

  // Fetch all tenants for dev mode
  const { data: tenants } = useQuery({
    queryKey: ['all-tenants'],
    queryFn: async () => {
      const { data, error } = await db
        .from('tenants')
        .select('id, name, status, business_type')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await db
        .from('settings')
        .select('*')
        .eq('key', 'payment_instructions')
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setPaymentInstructions(data.value);
      }
      
      return data;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (newInstructions: string) => {
      // Validate input
      const validation = paymentInstructionsSchema.safeParse(newInstructions);
      if (!validation.success) {
        throw new Error(validation.error.errors[0].message);
      }

      const { data: { user } } = await db.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await db
        .from('settings')
        .update({
          value: newInstructions.trim(),
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('key', 'payment_instructions');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['payment-instructions'] });
      setValidationError("");
      toast({
        title: "Settings Updated",
        description: "Payment instructions have been saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    // Client-side validation
    const validation = paymentInstructionsSchema.safeParse(paymentInstructions);
    if (!validation.success) {
      setValidationError(validation.error.errors[0].message);
      return;
    }
    
    setValidationError("");
    updateSettingsMutation.mutate(paymentInstructions);
  };

  const handleInputChange = (value: string) => {
    setPaymentInstructions(value);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError("");
    }
  };

  const handleDevModeSelect = (tenantId: string) => {
    setDevTenantId(tenantId);
    localStorage.setItem('dev_tenant_id', tenantId);
    const tenant = tenants?.find(t => t.id === tenantId);
    toast({
      title: "Dev Mode Activated",
      description: `Now viewing as: ${tenant?.name}`,
    });
  };

  const handleDevModeClear = () => {
    setDevTenantId(null);
    localStorage.removeItem('dev_tenant_id');
    toast({
      title: "Dev Mode Disabled",
      description: "Returned to admin view",
    });
  };

  const selectedTenant = tenants?.find(t => t.id === devTenantId);

  const [isDeploying, setIsDeploying] = useState(false);

  const handleTriggerDeploy = async () => {
    setIsDeploying(true);
    try {
      const { data, error } = await supabase.functions.invoke('trigger-deploy');
      
      if (error) throw error;
      
      toast({
        title: "Deployment Triggered",
        description: "The build process has been started. Check GitHub Actions for progress.",
      });
    } catch (error: any) {
      console.error('Deploy error:', error);
      toast({
        title: "Deployment Failed",
        description: error.message || "Failed to trigger deployment",
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">System Settings</h1>
          <p className="text-muted-foreground">Manage system-wide configuration</p>
        </div>
      </div>

      {/* Deploy Card */}
      <Card className="max-w-3xl mb-6 border-green-500/50 bg-green-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-green-500" />
            <CardTitle className="text-lg">Production Deployment</CardTitle>
          </div>
          <CardDescription>
            Pull latest changes from GitHub and rebuild the production site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-center">
            <Button 
              onClick={handleTriggerDeploy} 
              disabled={isDeploying}
              className="bg-green-600 hover:bg-green-700"
            >
              {isDeploying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="h-4 w-4 mr-2" />
                  Deploy to Production
                </>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              Runs: git pull → npm install → npm run build
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Dev Mode Card */}
      <Card className="max-w-3xl mb-6 border-amber-500/50 bg-amber-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-lg">Developer Mode</CardTitle>
            </div>
            {devTenantId && (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-700">
                Active
              </Badge>
            )}
          </div>
          <CardDescription>
            View the app as any tenant for testing purposes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label htmlFor="dev-tenant">Select Tenant</Label>
              <Select value={devTenantId || ""} onValueChange={handleDevModeSelect}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose a tenant to view as..." />
                </SelectTrigger>
                <SelectContent>
                  {tenants?.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>
                      <div className="flex items-center gap-2">
                        <span>{tenant.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({tenant.business_type || 'N/A'})
                        </span>
                        <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {tenant.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {devTenantId && (
              <>
                <Button variant="outline" onClick={() => window.open('/dashboard', '_blank')}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Dashboard
                </Button>
                <Button variant="ghost" onClick={handleDevModeClear}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          {selectedTenant && (
            <div className="mt-3 p-3 bg-muted rounded-lg text-sm">
              <p><strong>Currently viewing as:</strong> {selectedTenant.name}</p>
              <p className="text-muted-foreground text-xs mt-1">
                Open /dashboard in a new tab to test as this tenant
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Payment Instructions</CardTitle>
            <CardDescription>
              These instructions are displayed to users when they need to make payment during signup.
              You can include bank details, mobile money numbers, and other payment information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Formatting Tips:</strong> Use plain text or basic HTML tags like &lt;strong&gt;, &lt;p&gt;, and &lt;br/&gt;.
                Keep it clear and concise for users.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="payment-instructions">Instructions</Label>
              <Textarea
                id="payment-instructions"
                value={paymentInstructions}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Enter payment instructions..."
                rows={12}
                className="font-mono text-sm mt-2"
              />
              {validationError && (
                <p className="text-sm text-destructive mt-2">{validationError}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {paymentInstructions.length} / 2000 characters
              </p>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Preview:</p>
              <div 
                className="text-sm space-y-2"
                dangerouslySetInnerHTML={{ __html: paymentInstructions }}
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending || !paymentInstructions.trim()}
              className="w-full sm:w-auto"
            >
              {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
              <Save className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Default Template</CardTitle>
            <CardDescription>
              Copy this template to get started with common payment methods
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`<p><strong>Mobile Money:</strong> Send to +256 700 000000</p>
<p><strong>Bank Transfer:</strong> Centenary Bank</p>
<p>Account Name: Your Business Name</p>
<p>Account Number: 1234567890</p>
<p class="text-muted-foreground">After payment, enter your transaction details below</p>`}
            </pre>
            <Button
              variant="outline"
              className="mt-3"
              onClick={() => {
                setPaymentInstructions(`<p><strong>Mobile Money:</strong> Send to +256 700 000000</p>
<p><strong>Bank Transfer:</strong> Centenary Bank</p>
<p>Account Name: Your Business Name</p>
<p>Account Number: 1234567890</p>
<p class="text-muted-foreground">After payment, enter your transaction details below</p>`);
                setValidationError("");
              }}
            >
              Use Template
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSettings;
