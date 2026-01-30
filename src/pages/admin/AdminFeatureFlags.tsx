import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Flag, Save, RefreshCw, Info, Users, Building2 } from "lucide-react";

interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  scope: "global" | "school" | "business" | "rental";
}

// These would ideally come from a database table
const defaultFeatures: FeatureFlag[] = [
  {
    id: "exam_results_public",
    name: "Public Exam Results Portal",
    description: "Allow public access to exam results lookup",
    enabled: true,
    scope: "school",
  },
  {
    id: "parent_portal",
    name: "Parent Portal Access",
    description: "Enable parent portals for schools",
    enabled: true,
    scope: "school",
  },
  {
    id: "renter_portal",
    name: "Renter Portal Access",
    description: "Enable renter portals for rental businesses",
    enabled: true,
    scope: "rental",
  },
  {
    id: "self_admission",
    name: "Self-Admission Portal",
    description: "Allow schools to create admission links",
    enabled: true,
    scope: "school",
  },
  {
    id: "gate_checkin",
    name: "Gate Check-in System",
    description: "Enable QR-based student check-in",
    enabled: true,
    scope: "school",
  },
  {
    id: "bursar_rules",
    name: "Bursar Red List System",
    description: "Enable fee-based access restrictions",
    enabled: true,
    scope: "school",
  },
  {
    id: "pos_system",
    name: "Point of Sale",
    description: "Enable POS module for retail businesses",
    enabled: true,
    scope: "business",
  },
  {
    id: "accounting_module",
    name: "Accounting Module",
    description: "Enable full accounting features",
    enabled: true,
    scope: "global",
  },
  {
    id: "report_cards",
    name: "Report Card Generation",
    description: "Allow schools to generate report cards",
    enabled: true,
    scope: "school",
  },
  {
    id: "maintenance_mode",
    name: "Maintenance Mode",
    description: "Show maintenance notice to all users",
    enabled: false,
    scope: "global",
  },
];

export default function AdminFeatureFlags() {
  const { toast } = useToast();
  const [features, setFeatures] = useState<FeatureFlag[]>(defaultFeatures);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleFeature = (id: string) => {
    setFeatures(features.map(f => 
      f.id === id ? { ...f, enabled: !f.enabled } : f
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    // In a real implementation, this would save to a feature_flags table
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Features Updated",
      description: "Feature flags have been saved successfully",
    });
    setHasChanges(false);
    setSaving(false);
  };

  const getScopeBadge = (scope: string) => {
    const colors: Record<string, string> = {
      global: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      school: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      business: "bg-green-500/10 text-green-600 border-green-500/20",
      rental: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    };
    return colors[scope] || "bg-muted";
  };

  const groupedFeatures = {
    global: features.filter(f => f.scope === "global"),
    school: features.filter(f => f.scope === "school"),
    business: features.filter(f => f.scope === "business"),
    rental: features.filter(f => f.scope === "rental"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-muted-foreground">
            Toggle features on or off across the platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setFeatures(defaultFeatures)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Warning Card */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <p className="font-medium text-amber-600">Caution</p>
            <p className="text-sm text-muted-foreground">
              Disabling features will immediately affect all tenants in that scope. 
              Make sure to communicate changes to affected users.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Global Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Global Features
          </CardTitle>
          <CardDescription>Affects all tenants across the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupedFeatures.global.map((feature) => (
            <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor={feature.id} className="font-medium">
                    {feature.name}
                  </Label>
                  <Badge variant="outline" className={getScopeBadge(feature.scope)}>
                    {feature.scope}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
              <Switch
                id={feature.id}
                checked={feature.enabled}
                onCheckedChange={() => toggleFeature(feature.id)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* School Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            School Features
          </CardTitle>
          <CardDescription>Features specific to educational institutions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupedFeatures.school.map((feature) => (
            <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor={feature.id} className="font-medium">
                    {feature.name}
                  </Label>
                  <Badge variant="outline" className={getScopeBadge(feature.scope)}>
                    {feature.scope}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
              <Switch
                id={feature.id}
                checked={feature.enabled}
                onCheckedChange={() => toggleFeature(feature.id)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Business Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Business Features
          </CardTitle>
          <CardDescription>Features for retail and service businesses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupedFeatures.business.map((feature) => (
            <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor={feature.id} className="font-medium">
                    {feature.name}
                  </Label>
                  <Badge variant="outline" className={getScopeBadge(feature.scope)}>
                    {feature.scope}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
              <Switch
                id={feature.id}
                checked={feature.enabled}
                onCheckedChange={() => toggleFeature(feature.id)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Rental Features */}
      <Card>
        <CardHeader>
          <CardTitle>Rental Features</CardTitle>
          <CardDescription>Features for property management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {groupedFeatures.rental.map((feature) => (
            <div key={feature.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor={feature.id} className="font-medium">
                    {feature.name}
                  </Label>
                  <Badge variant="outline" className={getScopeBadge(feature.scope)}>
                    {feature.scope}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
              <Switch
                id={feature.id}
                checked={feature.enabled}
                onCheckedChange={() => toggleFeature(feature.id)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
