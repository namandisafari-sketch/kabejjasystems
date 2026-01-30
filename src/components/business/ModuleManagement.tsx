import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useTenantModules } from "@/hooks/use-tenant-modules";
import { Loader2, Puzzle } from "lucide-react";

interface ModuleManagementProps {
  tenantId: string | null;
  businessType: string | null;
}

const categoryLabels: Record<string, string> = {
  core: 'Core Features',
  academic: 'Academic',
  academics: 'Academic',
  admission: 'Admissions',
  communication: 'Communication',
  education: 'Education',
  finance: 'Finance',
  restaurant: 'Restaurant & Bar',
  hotel: 'Hotel & Lodge',
  salon: 'Salon & Spa',
  pharmacy: 'Healthcare',
  repair: 'Repair & Workshop',
};

export function ModuleManagement({ tenantId, businessType }: ModuleManagementProps) {
  const { allModules, isModuleEnabled, toggleModule, isLoading, isToggling } = useTenantModules(tenantId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // Filter modules to only show those applicable to this business type
  const applicableModules = allModules.filter(module => {
    // Core modules are always shown
    if (module.is_core) return true;
    
    // If no applicable_business_types defined, it's universal
    const applicableTypes = module.applicable_business_types || [];
    if (applicableTypes.length === 0) return true;
    
    // Only show modules that match the business type
    return businessType && applicableTypes.includes(businessType);
  });

  // Group applicable modules by category
  const modulesByCategory: Record<string, typeof allModules> = {};
  applicableModules.forEach(module => {
    const cat = module.category;
    if (!modulesByCategory[cat]) {
      modulesByCategory[cat] = [];
    }
    modulesByCategory[cat].push(module);
  });

  // Sort categories to show core first, then relevant to business type
  const sortedCategories = Object.keys(modulesByCategory).sort((a, b) => {
    if (a === 'core') return -1;
    if (b === 'core') return 1;
    return 0;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Puzzle className="h-5 w-5" />
          Feature Modules
        </CardTitle>
        <CardDescription>
          Enable or disable features for your business. Core features are always available.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {sortedCategories.map(category => (
          <div key={category} className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              {categoryLabels[category] || category}
            </h3>
            <div className="grid gap-3">
              {modulesByCategory[category].map(module => {
                const isEnabled = isModuleEnabled(module.code);

                return (
                  <div
                    key={module.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isEnabled ? 'bg-primary/5 border-primary/20' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{module.name}</span>
                        {module.is_core && (
                          <Badge variant="secondary" className="text-xs">Core</Badge>
                        )}
                      </div>
                      {module.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {module.description}
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => toggleModule({ moduleCode: module.code, enable: checked })}
                      disabled={module.is_core || isToggling}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
