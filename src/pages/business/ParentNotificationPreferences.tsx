import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/use-tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLanguage } from "@/i18n";
import { Bell, Search, Loader2, CheckCheck, X, Mail, Phone, MessageSquare } from "lucide-react";

interface ParentPreference {
  id: string;
  parent_id: string;
  sms_enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  gate_alerts: boolean;
  attendance_alerts: boolean;
  timetable_alerts: boolean;
}

interface Parent {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  notification_preferences: ParentPreference[];
}

export default function ParentNotificationPreferences() {
  const { data: tenantData } = useTenant();
  const tenantId = tenantData?.tenantId;
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const { t } = useLanguage();

  const { data: parents = [], isLoading } = useQuery({
    queryKey: ["parent-notification-preferences", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from("parents")
        .select(`
          id, full_name, email, phone,
          notification_preferences:parent_notification_preferences(*)
        `)
        .eq("tenant_id", tenantId)
        .order("full_name");
      if (error) throw error;
      return data as Parent[];
    },
    enabled: !!tenantId,
  });

  const updatePreferenceMutation = useMutation({
    mutationFn: async ({
      parentId,
      field,
      value,
    }: {
      parentId: string;
      field: keyof Omit<ParentPreference, "id" | "parent_id">;
      value: boolean;
    }) => {
      const existing = parents
        .find((p) => p.id === parentId)
        ?.notification_preferences?.[0];

      if (existing) {
        const { error } = await supabase
          .from("parent_notification_preferences")
          .update({ [field]: value })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("parent_notification_preferences")
          .insert({
            parent_id: parentId,
            tenant_id: tenantId!,
            [field]: value,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-notification-preferences"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update preference");
    },
  });

  const batchUpdateMutation = useMutation({
    mutationFn: async ({
      field,
      value,
    }: {
      field: keyof Omit<ParentPreference, "id" | "parent_id">;
      value: boolean;
    }) => {
      if (!tenantId) throw new Error("No tenant");
      const { error } = await supabase
        .from("parent_notification_preferences")
        .upsert(
          filteredParents.map((p) => ({
            parent_id: p.id,
            tenant_id: tenantId,
            [field]: value,
          }))
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preferences updated for all parents");
      queryClient.invalidateQueries({ queryKey: ["parent-notification-preferences"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to batch update");
    },
  });

  const filteredParents = parents.filter((p) =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getPreference = (parent: Parent, field: keyof Omit<ParentPreference, "id" | "parent_id">): boolean => {
    return parent.notification_preferences?.[0]?.[field] ?? false;
  };

  const handleToggle = (parent: Parent, field: keyof Omit<ParentPreference, "id" | "parent_id">, value: boolean) => {
    updatePreferenceMutation.mutate({ parentId: parent.id, field, value });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">{t.navigation.moduleRoutes.parent_notification_preferences}</h1>
          <p className="text-muted-foreground">Manage how parents receive notifications</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle>{t.parents.title}</CardTitle>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.common.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-sm text-muted-foreground mr-2 self-center">{t.common.actions}:</span>
            {[
              { field: "whatsapp_enabled" as const, label: "WhatsApp", icon: <MessageSquare className="h-4 w-4" /> },
              { field: "email_enabled" as const, label: "Email", icon: <Mail className="h-4 w-4" /> },
              { field: "sms_enabled" as const, label: "SMS", icon: <Phone className="h-4 w-4" /> },
              { field: "gate_alerts" as const, label: "Gate", icon: <Bell className="h-4 w-4" /> },
              { field: "attendance_alerts" as const, label: "Attendance", icon: <Bell className="h-4 w-4" /> },
              { field: "timetable_alerts" as const, label: "Timetable", icon: <Bell className="h-4 w-4" /> },
            ].map(({ field, label, icon }) => (
              <div key={field} className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchUpdateMutation.mutate({ field, value: true })}
                  className="gap-1"
                >
                  {icon}
                  <CheckCheck className="h-3 w-3" />
                  {label}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => batchUpdateMutation.mutate({ field, value: false })}
                  className="gap-1"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredParents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{searchTerm ? t.common.noResults : t.common.noResults}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">{t.parents.parentName}</th>
                    <th className="text-left py-3 px-2 font-medium">{t.common.email}</th>
                    <th className="text-left py-3 px-2 font-medium">{t.common.phone}</th>
                    <th className="text-center py-3 px-2 font-medium">WhatsApp</th>
                    <th className="text-center py-3 px-2 font-medium">{t.common.email}</th>
                    <th className="text-center py-3 px-2 font-medium">SMS</th>
                    <th className="text-center py-3 px-2 font-medium">Gate</th>
                    <th className="text-center py-3 px-2 font-medium">{t.attendance.title}</th>
                    <th className="text-center py-3 px-2 font-medium">{t.timetable.title}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParents.map((parent) => (
                    <tr key={parent.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-medium">{parent.full_name}</td>
                      <td className="py-3 px-2 text-muted-foreground">{parent.email || "—"}</td>
                      <td className="py-3 px-2 text-muted-foreground">{parent.phone || "—"}</td>
                      {(["whatsapp_enabled", "email_enabled", "sms_enabled", "gate_alerts", "attendance_alerts", "timetable_alerts"] as const).map((field) => (
                        <td key={field} className="py-3 px-2 text-center">
                          <Switch
                            checked={getPreference(parent, field)}
                            onCheckedChange={(v) => handleToggle(parent, field, v)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
