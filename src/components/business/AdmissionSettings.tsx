import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, Save, FileText, AlertTriangle, Clock, DollarSign,
  Plus, Trash2, GripVertical, ChevronUp, ChevronDown
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomFieldDefinition, CustomFieldType } from "@/types/admission-custom-fields";

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
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
  const [editingField, setEditingField] = useState<CustomFieldDefinition | null>(null);

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
      if (existingSettings.custom_fields) {
        setCustomFields(existingSettings.custom_fields as CustomFieldDefinition[]);
      }
    }
  }, [existingSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("admission_settings")
        .upsert({
          tenant_id: tenantId,
          ...settings,
          custom_fields: customFields,
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

  const generateFieldId = useCallback(() => {
    return `cf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  }, []);

  const addField = () => {
    const newField: CustomFieldDefinition = {
      id: generateFieldId(),
      label: "",
      type: "text",
      required: false,
      section: "Student Information",
      order: customFields.length,
    };
    setEditingField(newField);
  };

  const saveField = (field: CustomFieldDefinition) => {
    setCustomFields((prev) => {
      const idx = prev.findIndex((f) => f.id === field.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = field;
        return updated.map((f, i) => ({ ...f, order: i }));
      }
      return [...prev, { ...field, order: prev.length }].map((f, i) => ({ ...f, order: i }));
    });
    setEditingField(null);
  };

  const deleteField = (id: string) => {
    setCustomFields((prev) => prev.filter((f) => f.id !== id).map((f, i) => ({ ...f, order: i })));
  };

  const moveField = (id: string, direction: "up" | "down") => {
    setCustomFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const updated = [...prev];
      [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
      return updated.map((f, i) => ({ ...f, order: i }));
    });
  };

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

        <Separator />

        {/* Custom Form Fields Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Custom Form Fields</Label>
              <p className="text-sm text-muted-foreground">
                Add custom fields that parents must fill during self-registration
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={addField}>
              <Plus className="h-4 w-4 mr-1" /> Add Field
            </Button>
          </div>

          {customFields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
              No custom fields yet. Click "Add Field" to create one.
            </p>
          ) : (
            <div className="space-y-2">
              {customFields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center gap-2 rounded-lg border p-3"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {field.label || <span className="text-muted-foreground italic">Untitled field</span>}
                    </p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs bg-muted px-1.5 py-0.5 rounded capitalize">{field.type}</span>
                      <span className="text-xs text-muted-foreground">{field.section}</span>
                      {field.required && <span className="text-xs text-amber-600 font-medium">Required</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveField(field.id, "up")} disabled={field.order === 0}>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveField(field.id, "down")} disabled={field.order === customFields.length - 1}>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingField({ ...field })}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteField(field.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Field Editor Dialog */}
        {editingField && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditingField(null)}>
            <div className="bg-background rounded-lg shadow-lg max-w-md w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold text-lg">{customFields.find((f) => f.id === editingField.id) ? "Edit Field" : "Add New Field"}</h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Field Label</Label>
                  <Input
                    value={editingField.label}
                    onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                    placeholder="e.g. Mother's Name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Field Type</Label>
                  <Select
                    value={editingField.type}
                    onValueChange={(v) => setEditingField({ ...editingField, type: v as CustomFieldType })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="textarea">Textarea</SelectItem>
                      <SelectItem value="select">Select (Dropdown)</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                      <SelectItem value="tel">Phone</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="checkbox">Checkbox</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Section</Label>
                  <Select
                    value={editingField.section}
                    onValueChange={(v) => setEditingField({ ...editingField, section: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Student Information">Student Information</SelectItem>
                      <SelectItem value="Parent/Guardian Information">Parent/Guardian Information</SelectItem>
                      <SelectItem value="Emergency Contact">Emergency Contact</SelectItem>
                      <SelectItem value="Medical Information">Medical Information</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editingField.type === 'select' && (
                  <div className="space-y-1.5">
                    <Label>Options (one per line)</Label>
                    <Textarea
                      value={editingField.options?.join('\n') || ''}
                      onChange={(e) => setEditingField({ ...editingField, options: e.target.value.split('\n').filter(Boolean) })}
                      placeholder={`Option 1\nOption 2\nOption 3`}
                      rows={4}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Placeholder (optional)</Label>
                  <Input
                    value={editingField.placeholder || ''}
                    onChange={(e) => setEditingField({ ...editingField, placeholder: e.target.value })}
                    placeholder="e.g. Enter mother's full name"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="field-required"
                    checked={editingField.required}
                    onCheckedChange={(v) => setEditingField({ ...editingField, required: v })}
                  />
                  <Label htmlFor="field-required">Required field</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingField(null)}>Cancel</Button>
                <Button onClick={() => saveField(editingField)} disabled={!editingField.label.trim()}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={() => saveMutation.mutate()}
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
