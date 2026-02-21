import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Save, Loader2, GraduationCap, Copy, Users, CreditCard, Hash } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { UNEBSettings } from "./UNEBSettings";
import { SchoolPaySettings } from "@/components/fees/SchoolPaySettings";
import { AdmissionSettings } from "./AdmissionSettings";
import { useTenant } from "@/hooks/use-tenant";

interface SchoolSettingsProps {
  tenantId: string | null;
}

export function SchoolSettings({ tenantId }: SchoolSettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tenantData } = useTenant();
  const isSecondarySchool = tenantData?.businessType === 'secondary_school';
  const isSchool = ['kindergarten', 'primary_school', 'secondary_school'].includes(tenantData?.businessType || '');
  
  const [streams, setStreams] = useState<string[]>([]);
  const [newStream, setNewStream] = useState("");
  const [studentIdPrefix, setStudentIdPrefix] = useState("STU");
  const [studentIdDigits, setStudentIdDigits] = useState(4);
  const [admissionPrefix, setAdmissionPrefix] = useState("ADM");
  const [admissionFormat, setAdmissionFormat] = useState("ADM/{YY}/{NUMBER}");
  const [feeBalanceThreshold, setFeeBalanceThreshold] = useState(0);

  // Fetch parent login code and fee threshold
  const { data: tenantInfo } = useQuery({
    queryKey: ['tenant-parent-code', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('tenants') as any)
        .select('parent_login_code, name, fee_balance_threshold')
        .eq('id', tenantId!)
        .single();
      
      if (error) throw error;
      return data as { parent_login_code: string; name: string; fee_balance_threshold: number };
    },
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['school-settings', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .eq('tenant_id', tenantId!)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings?.streams) {
      setStreams(settings.streams);
    } else {
      // Default streams
      setStreams(['East', 'West', 'North', 'South', 'A', 'B', 'C', 'D']);
    }
    // ID format settings
    if (settings?.student_id_prefix) setStudentIdPrefix(settings.student_id_prefix);
    if (settings?.student_id_digits) setStudentIdDigits(settings.student_id_digits);
    if (settings?.admission_prefix) setAdmissionPrefix(settings.admission_prefix);
    if (settings?.admission_format) setAdmissionFormat(settings.admission_format);
  }, [settings]);

  useEffect(() => {
    if (tenantInfo?.fee_balance_threshold !== undefined) {
      setFeeBalanceThreshold(tenantInfo.fee_balance_threshold);
    }
  }, [tenantInfo]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      
      // Save fee balance threshold to tenants table
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({ fee_balance_threshold: feeBalanceThreshold })
        .eq('id', tenantId);
      
      if (tenantError) throw tenantError;

      const settingsData = {
        streams,
        student_id_prefix: studentIdPrefix,
        student_id_digits: studentIdDigits,
        admission_prefix: admissionPrefix,
        admission_format: admissionFormat,
      };
      
      if (settings?.id) {
        // Update existing
        const { error } = await supabase
          .from('school_settings')
          .update(settingsData)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('school_settings')
          .insert({ tenant_id: tenantId, ...settingsData });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-settings'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-parent-code'] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addStream = () => {
    if (newStream.trim() && !streams.includes(newStream.trim())) {
      setStreams([...streams, newStream.trim()]);
      setNewStream("");
    }
  };

  const removeStream = (stream: string) => {
    setStreams(streams.filter(s => s !== stream));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          School Settings
        </CardTitle>
        <CardDescription>
          Customize streams/sections for your classes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Parent Portal Code Section */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <Label className="text-base font-semibold">Parent Portal Code</Label>
                  <p className="text-sm text-muted-foreground">
                    Share this code with parents so they can log in to the Parent Portal
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-background border rounded-lg px-4 py-2 font-mono text-lg tracking-widest font-bold">
                    {tenantInfo?.parent_login_code || '------'}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (tenantInfo?.parent_login_code) {
                        navigator.clipboard.writeText(tenantInfo.parent_login_code);
                        toast({ title: "Code copied to clipboard" });
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Parents will enter this code at <span className="font-medium">{window.location.origin}/parent</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fee Balance Threshold */}
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <Label className="text-base font-semibold">Fee Balance Threshold</Label>
                  <p className="text-sm text-muted-foreground">
                    Parents will not be able to view report cards if their child's balance exceeds this amount. Set to 0 to disable this restriction.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feeThreshold">Threshold Amount (UGX)</Label>
                  <Input
                    id="feeThreshold"
                    type="number"
                    value={feeBalanceThreshold}
                    onChange={(e) => setFeeBalanceThreshold(Number(e.target.value))}
                    placeholder="0"
                    min={0}
                  />
                  <p className="text-xs text-muted-foreground">
                    {feeBalanceThreshold > 0 
                      ? `Parents with balances above UGX ${feeBalanceThreshold.toLocaleString()} won't see reports`
                      : "No restriction - all parents can view reports"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student ID Format Settings */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <Label className="text-base font-semibold">Student ID Card Format</Label>
                  <p className="text-sm text-muted-foreground">
                    Customize how student IDs appear on ID cards
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentIdPrefix">ID Prefix</Label>
                    <Input
                      id="studentIdPrefix"
                      value={studentIdPrefix}
                      onChange={(e) => setStudentIdPrefix(e.target.value.toUpperCase())}
                      placeholder="STU"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="studentIdDigits">Number Digits</Label>
                    <Select 
                      value={String(studentIdDigits)} 
                      onValueChange={(v) => setStudentIdDigits(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 digits (001)</SelectItem>
                        <SelectItem value="4">4 digits (0001)</SelectItem>
                        <SelectItem value="5">5 digits (00001)</SelectItem>
                        <SelectItem value="6">6 digits (000001)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="bg-background border rounded-lg px-4 py-3">
                  <Label className="text-xs text-muted-foreground">Preview</Label>
                  <p className="font-mono text-lg font-bold">
                    {studentIdPrefix}-{"0".repeat(studentIdDigits - 1)}1
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admission Number Format */}
        <Card className="border-orange-500/20 bg-orange-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Hash className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <Label className="text-base font-semibold">Admission Number Format</Label>
                  <p className="text-sm text-muted-foreground">
                    Customize how admission numbers are generated
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="admissionPrefix">Prefix</Label>
                    <Input
                      id="admissionPrefix"
                      value={admissionPrefix}
                      onChange={(e) => setAdmissionPrefix(e.target.value.toUpperCase())}
                      placeholder="ADM"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admissionFormat">Format Template</Label>
                    <Select 
                      value={admissionFormat} 
                      onValueChange={setAdmissionFormat}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="{PREFIX}/{YY}/{NUMBER}">{admissionPrefix}/25/0001</SelectItem>
                        <SelectItem value="{PREFIX}-{YYYY}-{NUMBER}">{admissionPrefix}-2025-0001</SelectItem>
                        <SelectItem value="{PREFIX}{YY}{NUMBER}">{admissionPrefix}250001</SelectItem>
                        <SelectItem value="{PREFIX}/{NUMBER}">{admissionPrefix}/0001</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="bg-background border rounded-lg px-4 py-3">
                  <Label className="text-xs text-muted-foreground">Preview</Label>
                  <p className="font-mono text-lg font-bold">
                    {admissionFormat
                      .replace('{PREFIX}', admissionPrefix)
                      .replace('{YY}', '25')
                      .replace('{YYYY}', '2025')
                      .replace('{NUMBER}', '0001')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* UNEB Settings for Secondary Schools */}
        {isSecondarySchool && (
          <>
            <UNEBSettings tenantId={tenantId} />
            <Separator />
          </>
        )}

        {/* Self-Admission Portal Settings */}
        {isSchool && tenantId && (
          <>
            <AdmissionSettings tenantId={tenantId} />
            <Separator />
          </>
        )}

        {/* SchoolPay Integration */}
        {isSchool && tenantId && (
          <>
            <SchoolPaySettings tenantId={tenantId} />
            <Separator />
          </>
        )}

        {/* Class Streams */}
        <div className="space-y-4">
          <div>
            <Label>Class Streams</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Streams are used to divide classes (e.g., Senior 1 East, Senior 1 West)
            </p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {streams.map((stream) => (
                <Badge key={stream} variant="secondary" className="text-sm py-1 px-3">
                  {stream}
                  <button
                    type="button"
                    onClick={() => removeStream(stream)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {streams.length === 0 && (
                <p className="text-sm text-muted-foreground">No streams added</p>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={newStream}
                onChange={(e) => setNewStream(e.target.value)}
                placeholder="Add new stream (e.g., Red, Blue)"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addStream())}
              />
              <Button type="button" variant="outline" onClick={addStream}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Button 
          onClick={() => saveMutation.mutate()} 
          disabled={saveMutation.isPending}
          className="w-full sm:w-auto"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
