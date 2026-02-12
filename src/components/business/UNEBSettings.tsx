import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { GraduationCap, Save, Loader2 } from "lucide-react";

interface UNEBSettingsProps {
  tenantId: string | null;
}

interface UNEBSettingsData {
  id: string;
  center_number: string | null;
  center_name: string | null;
  uce_registration_fee: number;
  uace_registration_fee: number;
  current_academic_year: number;
  registration_open: boolean;
  registration_deadline_uce: string | null;
  registration_deadline_uace: string | null;
}

export function UNEBSettings({ tenantId }: UNEBSettingsProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    center_number: '',
    center_name: '',
    uce_registration_fee: 80000,
    uace_registration_fee: 120000,
    current_academic_year: new Date().getFullYear(),
    registration_open: false,
    registration_deadline_uce: '',
    registration_deadline_uace: '',
  });

  // Fetch existing UNEB settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['uneb-settings', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uneb_school_settings')
        .select('*')
        .eq('tenant_id', tenantId!)
        .maybeSingle();
      
      if (error) throw error;
      return data as UNEBSettingsData | null;
    },
  });

  // Load existing settings into form
  useEffect(() => {
    if (settings) {
      setFormData({
        center_number: settings.center_number || '',
        center_name: settings.center_name || '',
        uce_registration_fee: settings.uce_registration_fee || 80000,
        uace_registration_fee: settings.uace_registration_fee || 120000,
        current_academic_year: settings.current_academic_year || new Date().getFullYear(),
        registration_open: settings.registration_open || false,
        registration_deadline_uce: settings.registration_deadline_uce || '',
        registration_deadline_uace: settings.registration_deadline_uace || '',
      });
    }
  }, [settings]);

  // Save settings mutation
  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");

      const { error } = await supabase
        .from('uneb_school_settings')
        .upsert({
          tenant_id: tenantId,
          center_number: formData.center_number || null,
          center_name: formData.center_name || null,
          uce_registration_fee: formData.uce_registration_fee,
          uace_registration_fee: formData.uace_registration_fee,
          current_academic_year: formData.current_academic_year,
          registration_open: formData.registration_open,
          registration_deadline_uce: formData.registration_deadline_uce || null,
          registration_deadline_uace: formData.registration_deadline_uace || null,
        }, { onConflict: 'tenant_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uneb-settings'] });
      toast.success("UNEB settings saved successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to save settings: " + error.message);
    },
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', { 
      style: 'currency', 
      currency: 'UGX', 
      minimumFractionDigits: 0 
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-500/20 bg-purple-500/5">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-purple-500/10 rounded-lg">
            <GraduationCap className="h-5 w-5 text-purple-600" />
          </div>
          <div className="flex-1 space-y-6">
            <div>
              <Label className="text-base font-semibold">UNEB Examination Settings</Label>
              <p className="text-sm text-muted-foreground">
                Configure your school's UNEB center details and registration fees for UCE (S.4) and UACE (S.6) candidates
              </p>
            </div>

            {/* Center Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="centerNumber">Center Number</Label>
                <Input
                  id="centerNumber"
                  value={formData.center_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, center_number: e.target.value.toUpperCase() }))}
                  placeholder="e.g., U0001"
                />
                <p className="text-xs text-muted-foreground">
                  Your official UNEB center registration number
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year</Label>
                <Input
                  id="academicYear"
                  type="number"
                  value={formData.current_academic_year}
                  onChange={(e) => setFormData(prev => ({ ...prev, current_academic_year: parseInt(e.target.value) || new Date().getFullYear() }))}
                  min={2020}
                  max={2050}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="centerName">Center Name (Official)</Label>
              <Input
                id="centerName"
                value={formData.center_name}
                onChange={(e) => setFormData(prev => ({ ...prev, center_name: e.target.value }))}
                placeholder="Your school name as registered with UNEB"
              />
              <p className="text-xs text-muted-foreground">
                This name appears on official UNEB documentation
              </p>
            </div>

            {/* Registration Fees */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Registration Fees</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="uceFee" className="text-sm">UCE (O-Level) Fee</Label>
                  <Input
                    id="uceFee"
                    type="number"
                    value={formData.uce_registration_fee}
                    onChange={(e) => setFormData(prev => ({ ...prev, uce_registration_fee: parseInt(e.target.value) || 0 }))}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Current: {formatCurrency(formData.uce_registration_fee)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uaceFee" className="text-sm">UACE (A-Level) Fee</Label>
                  <Input
                    id="uaceFee"
                    type="number"
                    value={formData.uace_registration_fee}
                    onChange={(e) => setFormData(prev => ({ ...prev, uace_registration_fee: parseInt(e.target.value) || 0 }))}
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    Current: {formatCurrency(formData.uace_registration_fee)}
                  </p>
                </div>
              </div>
            </div>

            {/* Registration Deadlines */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Registration Deadlines</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="uceDeadline" className="text-sm">UCE Deadline</Label>
                  <Input
                    id="uceDeadline"
                    type="date"
                    value={formData.registration_deadline_uce}
                    onChange={(e) => setFormData(prev => ({ ...prev, registration_deadline_uce: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uaceDeadline" className="text-sm">UACE Deadline</Label>
                  <Input
                    id="uaceDeadline"
                    type="date"
                    value={formData.registration_deadline_uace}
                    onChange={(e) => setFormData(prev => ({ ...prev, registration_deadline_uace: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Registration Open Switch */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Registration Open</Label>
                <p className="text-xs text-muted-foreground">
                  Allow new UNEB candidate registrations
                </p>
              </div>
              <Switch
                checked={formData.registration_open}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, registration_open: checked }))}
              />
            </div>

            <Button 
              onClick={() => saveSettings.mutate()} 
              disabled={saveSettings.isPending}
              className="w-full sm:w-auto"
            >
              {saveSettings.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save UNEB Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
