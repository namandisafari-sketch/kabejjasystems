import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, FileText, AlertTriangle, Clock, DollarSign } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AdmissionSettingsProps {
  tenantId: string;
}

interface AdmissionSettingsData {
  is_open: boolean;
  rules_and_regulations: string;
  disclaimer_text: string;
  require_photo: boolean;
  require_birth_certificate: boolean;
  require_previous_school_records: boolean;
  academic_year: string;
  admission_fee_amount: number;
  link_validity_hours: number;
}

const defaultSettings: AdmissionSettingsData = {
  is_open: false,
  rules_and_regulations: "",
  disclaimer_text: "WARNING: Providing false or misleading information during registration is strictly prohibited and will result in immediate denial of admission with NO REFUND of admission fees. By submitting this form, you confirm that all information provided is accurate and truthful.",
  require_photo: true,
  require_birth_certificate: false,
  require_previous_school_records: false,
  academic_year: new Date().getFullYear().toString(),
  admission_fee_amount: 0,
  link_validity_hours: 24,
};

export function AdmissionSettings({ tenantId }: AdmissionSettingsProps) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<AdmissionSettingsData>(defaultSettings);

  const { data: existingSettings, isLoading } = useQuery({
    queryKey: ["admission-settings", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admission_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (existingSettings) {
      setSettings({
        is_open: existingSettings.is_open ?? false,
        rules_and_regulations: existingSettings.rules_and_regulations ?? "",
        disclaimer_text: existingSettings.disclaimer_text ?? defaultSettings.disclaimer_text,
        require_photo: existingSettings.require_photo ?? true,
        require_birth_certificate: existingSettings.require_birth_certificate ?? false,
        require_previous_school_records: existingSettings.require_previous_school_records ?? false,
        academic_year: existingSettings.academic_year ?? defaultSettings.academic_year,
        admission_fee_amount: existingSettings.admission_fee_amount ?? 0,
        link_validity_hours: existingSettings.link_validity_hours ?? 24,
      });
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async (data: AdmissionSettingsData) => {
      const { error } = await supabase
        .from("admission_settings")
        .upsert({
          tenant_id: tenantId,
          ...data,
          updated_at: new Date().toISOString(),
        }, { onConflict: "tenant_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admission-settings", tenantId] });
      toast({ title: "Settings saved", description: "Self-admission settings have been updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Self-Admission Portal Settings
        </CardTitle>
        <CardDescription>
          Configure the online admission form that parents can use to register their children remotely
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Portal Status */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">Open Admission Portal</Label>
            <p className="text-sm text-muted-foreground">
              Enable parents to submit admission forms online using valid admission links
            </p>
          </div>
          <Switch
            checked={settings.is_open}
            onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, is_open: checked }))}
          />
        </div>

        <Separator />

        {/* Academic Year & Fee */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="academic_year">Academic Year</Label>
            <Input
              id="academic_year"
              value={settings.academic_year}
              onChange={(e) => setSettings((prev) => ({ ...prev, academic_year: e.target.value }))}
              placeholder="2025"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admission_fee" className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Admission Fee (UGX)
            </Label>
            <Input
              id="admission_fee"
              type="number"
              value={settings.admission_fee_amount}
              onChange={(e) => setSettings((prev) => ({ ...prev, admission_fee_amount: Number(e.target.value) }))}
              placeholder="50000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link_validity" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Link Validity (Hours)
            </Label>
            <Input
              id="link_validity"
              type="number"
              min={1}
              max={168}
              value={settings.link_validity_hours}
              onChange={(e) => setSettings((prev) => ({ ...prev, link_validity_hours: Number(e.target.value) }))}
            />
            <p className="text-xs text-muted-foreground">Default: 24 hours (max 168)</p>
          </div>
        </div>

        <Separator />

        {/* Required Documents */}
        <div className="space-y-4">
          <Label className="text-base">Required Documents</Label>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="require_photo" className="cursor-pointer">Passport Photo</Label>
              <Switch
                id="require_photo"
                checked={settings.require_photo}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, require_photo: checked }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="require_birth_cert" className="cursor-pointer">Birth Certificate</Label>
              <Switch
                id="require_birth_cert"
                checked={settings.require_birth_certificate}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, require_birth_certificate: checked }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="require_records" className="cursor-pointer">Previous School Records</Label>
              <Switch
                id="require_records"
                checked={settings.require_previous_school_records}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, require_previous_school_records: checked }))}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Rules and Regulations */}
        <div className="space-y-2">
          <Label htmlFor="rules" className="text-base">School Rules & Regulations</Label>
          <p className="text-sm text-muted-foreground">
            These will be displayed to parents during registration and must be agreed to
          </p>
          <Textarea
            id="rules"
            rows={8}
            value={settings.rules_and_regulations}
            onChange={(e) => setSettings((prev) => ({ ...prev, rules_and_regulations: e.target.value }))}
            placeholder="Enter your school's rules and regulations here...

Example:
1. All students must wear proper school uniform
2. Students must arrive by 7:30 AM
3. Respect for teachers and fellow students is mandatory
4. Mobile phones are not allowed on school premises
..."
          />
        </div>

        <Separator />

        {/* Disclaimer */}
        <div className="space-y-2">
          <Label htmlFor="disclaimer" className="flex items-center gap-1 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Fraud Warning Disclaimer
          </Label>
          <p className="text-sm text-muted-foreground">
            This warning will be prominently displayed before form submission
          </p>
          <Textarea
            id="disclaimer"
            rows={4}
            value={settings.disclaimer_text}
            onChange={(e) => setSettings((prev) => ({ ...prev, disclaimer_text: e.target.value }))}
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => saveMutation.mutate(settings)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
