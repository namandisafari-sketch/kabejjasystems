import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useLanguage } from "@/i18n";
import { Bell, MessageSquare, Mail, Smartphone, Save, Send, Loader2 } from "lucide-react";

interface NotificationConfig {
  id: string;
  tenant_id: string;
  provider: string;
  api_key: string;
  username: string;
  sender_id: string;
  whatsapp_number: string;
  email_from: string;
  sms_enabled: boolean;
  whatsapp_enabled: boolean;
  email_enabled: boolean;
}

export default function NotificationSettings() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("sms");

  const { data: config, isLoading } = useQuery({
    queryKey: ["notification-config", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data } = await supabase
        .from("notification_config")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      return data as NotificationConfig | null;
    },
    enabled: !!tenantId,
  });

  const [form, setForm] = useState({
    provider: "africas_talking",
    api_key: "",
    username: "",
    sender_id: "TENNAHUB",
    whatsapp_number: "",
    email_from: "",
    sms_enabled: true,
    whatsapp_enabled: false,
    email_enabled: false,
  });

  const [testSending, setTestSending] = useState<string | null>(null);
  const { t } = useLanguage();

  const hasExistingConfig = !!config;

  useEffect(() => {
    if (config) {
      setForm({
        provider: config.provider || "africas_talking",
        api_key: config.api_key || "",
        username: config.username || "",
        sender_id: config.sender_id || "TENNAHUB",
        whatsapp_number: config.whatsapp_number || "",
        email_from: config.email_from || "",
        sms_enabled: config.sms_enabled ?? true,
        whatsapp_enabled: config.whatsapp_enabled ?? false,
        email_enabled: config.email_enabled ?? false,
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      if (!tenantId) throw new Error("No tenant");
      const payload = {
        tenant_id: tenantId,
        provider: values.provider,
        api_key: values.api_key,
        username: values.username,
        sender_id: values.sender_id,
        whatsapp_number: values.whatsapp_number,
        email_from: values.email_from,
        sms_enabled: values.sms_enabled,
        whatsapp_enabled: values.whatsapp_enabled,
        email_enabled: values.email_enabled,
      };
      const { error } = await supabase
        .from("notification_config")
        .upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t.messages.toastDescriptions.appWillReload);
      queryClient.invalidateQueries({ queryKey: ["notification-config"] });
    },
    onError: (error: any) => {
      toast.error(error.message || t.messages.toastTitles[30]);
    },
  });

  const testSendMutation = useMutation({
    mutationFn: async (channel: string) => {
      if (!tenantId) throw new Error("No tenant");
      const { error } = await supabase.functions.invoke("send-test-notification", {
        body: { tenant_id: tenantId, channel },
      });
      if (error) throw error;
    },
    onSuccess: (_data, channel) => {
      toast.success(t.messages.toastTitles[886]);
      setTestSending(null);
    },
    onError: (error: any) => {
      toast.error(error.message || t.messages.toastTitles[30]);
      setTestSending(null);
    },
  });

  const handleTestSend = (channel: string) => {
    setTestSending(channel);
    testSendMutation.mutate(channel);
  };

  const handleSave = () => {
    saveMutation.mutate(form);
  };

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">{t.navigation.moduleRoutes.notification_settings}</h1>
          <p className="text-muted-foreground">Configure your Africa&apos;s Talking notification provider</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>{t.settings.general}</CardTitle>
            <CardDescription>Set up your notification provider credentials</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={form.provider} onValueChange={(v) => updateField("provider", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="africas_talking">Africa&apos;s Talking</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sender ID</Label>
                <Input
                  value={form.sender_id}
                  onChange={(e) => updateField("sender_id", e.target.value)}
                  placeholder="TENNAHUB"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={form.api_key}
                  onChange={(e) => updateField("api_key", e.target.value)}
                  placeholder="Enter API key"
                />
              </div>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={form.username}
                  onChange={(e) => updateField("username", e.target.value)}
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>WhatsApp Number</Label>
                <Input
                  value={form.whatsapp_number}
                  onChange={(e) => updateField("whatsapp_number", e.target.value)}
                  placeholder="+2547XXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label>Email From Address</Label>
                <Input
                  type="email"
                  value={form.email_from}
                  onChange={(e) => updateField("email_from", e.target.value)}
                  placeholder="noreply@example.com"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.sms_enabled}
                  onCheckedChange={(v) => updateField("sms_enabled", v)}
                />
                  <Label className="cursor-pointer">SMS {t.common.active}</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.whatsapp_enabled}
                  onCheckedChange={(v) => updateField("whatsapp_enabled", v)}
                />
                  <Label className="cursor-pointer">WhatsApp {t.common.active}</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.email_enabled}
                  onCheckedChange={(v) => updateField("email_enabled", v)}
                />
                  <Label className="cursor-pointer">Email {t.common.active}</Label>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {hasExistingConfig ? t.common.save : t.common.save}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.settings.notifications}</CardTitle>
            <CardDescription>Send a test message to verify your configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="sms" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  SMS
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="gap-2">
                  <Smartphone className="h-4 w-4" />
                  WhatsApp
                </TabsTrigger>
                <TabsTrigger value="email" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sms">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Channel</p>
                    <p className="text-sm text-muted-foreground">Send a test SMS to your phone</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleTestSend("sms")}
                    disabled={testSending === "sms"}
                    className="gap-2"
                  >
                    {testSending === "sms" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Test Send
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="whatsapp">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">WhatsApp Channel</p>
                    <p className="text-sm text-muted-foreground">Send a test WhatsApp message</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleTestSend("whatsapp")}
                    disabled={testSending === "whatsapp"}
                    className="gap-2"
                  >
                    {testSending === "whatsapp" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Test Send
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="email">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Channel</p>
                    <p className="text-sm text-muted-foreground">Send a test email</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => handleTestSend("email")}
                    disabled={testSending === "email"}
                    className="gap-2"
                  >
                    {testSending === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Test Send
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
