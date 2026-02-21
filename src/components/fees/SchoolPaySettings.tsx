import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, Copy, ExternalLink, ShieldCheck, Webhook } from "lucide-react";

interface SchoolPaySettingsProps {
  tenantId: string;
}

export function SchoolPaySettings({ tenantId }: SchoolPaySettingsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [schoolCode, setSchoolCode] = useState("");
  const [apiPassword, setApiPassword] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [autoReconcile, setAutoReconcile] = useState(true);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["schoolpay-settings", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("schoolpay_settings") as any)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setSchoolCode(settings.school_code || "");
      setApiPassword(settings.api_password || "");
      setWebhookEnabled(settings.webhook_enabled ?? true);
      setAutoReconcile(settings.auto_reconcile ?? true);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!schoolCode.trim() || !apiPassword.trim()) {
        throw new Error("School code and API password are required");
      }

      const payload = {
        tenant_id: tenantId,
        school_code: schoolCode.trim(),
        api_password: apiPassword.trim(),
        webhook_enabled: webhookEnabled,
        auto_reconcile: autoReconcile,
        updated_at: new Date().toISOString(),
      };

      if (settings?.id) {
        const { error } = await (supabase
          .from("schoolpay_settings") as any)
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from("schoolpay_settings") as any)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schoolpay-settings"] });
      toast({ title: "SchoolPay settings saved!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/schoolpay-webhook`;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: "Webhook URL copied to clipboard" });
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
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <img
              src="https://www.schoolpay.co.ug/assets/images/logo.png"
              alt="SchoolPay"
              className="h-6"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            SchoolPay Integration
            {settings && <Badge variant="outline" className="ml-2 text-green-600 border-green-600">Connected</Badge>}
          </CardTitle>
          <CardDescription>
            Connect your SchoolPay account to automatically receive and reconcile fee payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Credentials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="schoolCode">School Code *</Label>
              <Input
                id="schoolCode"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                placeholder="e.g. 123456"
              />
              <p className="text-xs text-muted-foreground">
                Your numeric school code from SchoolPay
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiPassword">API Password *</Label>
              <Input
                id="apiPassword"
                type="password"
                value={apiPassword}
                onChange={(e) => setApiPassword(e.target.value)}
                placeholder="Your SchoolPay API password"
              />
              <p className="text-xs text-muted-foreground">
                Found in your SchoolPay portal settings
              </p>
            </div>
          </div>

          {/* Webhook URL */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Webhook className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1 space-y-2">
                  <Label className="font-semibold">Webhook URL</Label>
                  <p className="text-sm text-muted-foreground">
                    Paste this URL in your SchoolPay portal's webhook configuration
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background border rounded px-3 py-2 text-xs font-mono break-all">
                      {webhookUrl}
                    </code>
                    <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Once configured, payments will be recorded automatically in real-time
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Toggles */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Webhook Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive real-time payment notifications from SchoolPay
                </p>
              </div>
              <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  Auto-Reconciliation
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically apply payments to student fee balances when a match is found
                </p>
              </div>
              <Switch checked={autoReconcile} onCheckedChange={setAutoReconcile} />
            </div>
          </div>

          {settings?.last_sync_at && (
            <p className="text-xs text-muted-foreground">
              Last synced: {new Date(settings.last_sync_at).toLocaleString()}
            </p>
          )}

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
            Save SchoolPay Settings
          </Button>
        </CardContent>
      </Card>

      {/* Setup Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Setup Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <Badge variant="outline" className="shrink-0">1</Badge>
            <p>Enter your SchoolPay <strong>School Code</strong> and <strong>API Password</strong> above</p>
          </div>
          <div className="flex gap-3">
            <Badge variant="outline" className="shrink-0">2</Badge>
            <p>Copy the <strong>Webhook URL</strong> and paste it in your SchoolPay portal under webhook settings</p>
          </div>
          <div className="flex gap-3">
            <Badge variant="outline" className="shrink-0">3</Badge>
            <p>Assign <strong>SchoolPay Payment Codes</strong> to your students (Students → Edit → SchoolPay Code)</p>
          </div>
          <div className="flex gap-3">
            <Badge variant="outline" className="shrink-0">4</Badge>
            <p>Payments will now be <strong>automatically recorded</strong> and student balances updated in real-time</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
