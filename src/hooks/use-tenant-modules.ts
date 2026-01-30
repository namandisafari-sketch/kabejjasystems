import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getBusinessTypeConfig } from "@/config/businessTypes";

export interface BusinessModule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  applicable_business_types: string[];
  is_core: boolean;
  is_active: boolean;
  display_order: number;
}

export interface TenantModule {
  id: string;
  tenant_id: string;
  module_code: string;
  is_enabled: boolean;
  enabled_at: string;
}

export function useTenantModules(tenantId?: string | null, devBusinessType?: string | null, tenantBusinessType?: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Determine the business type to use for filtering
  const businessType = devBusinessType || tenantBusinessType;

  // Fetch all available modules
  const { data: allModules = [], isLoading: isLoadingModules } = useQuery({
    queryKey: ['business-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_modules')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as BusinessModule[];
    },
  });

  // Fetch tenant's enabled modules
  const { data: tenantModules = [], isLoading: isLoadingTenantModules } = useQuery({
    queryKey: ['tenant-modules', tenantId],
    enabled: !!tenantId && !devBusinessType,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_modules')
        .select('*')
        .eq('tenant_id', tenantId!)
        .eq('is_enabled', true);
      
      if (error) throw error;
      return data as TenantModule[];
    },
  });

  // Get enabled module codes - use dev business type config if in dev mode
  let enabledModuleCodes: string[];
  
  if (import.meta.env.DEV && devBusinessType) {
    const config = getBusinessTypeConfig(devBusinessType);
    enabledModuleCodes = config?.defaultModules || [];
  } else {
    enabledModuleCodes = tenantModules.map(tm => tm.module_code);
  }

  // Filter modules by business type applicability
  const applicableModules = allModules.filter(m => {
    // If applicable_business_types is defined, check if tenant's business type matches
    if (m.applicable_business_types && m.applicable_business_types.length > 0) {
      if (!businessType) return false;
      return m.applicable_business_types.includes(businessType);
    }
    
    // If no applicable_business_types defined, it's universal (applies to all business types)
    return true;
  });

  // Get modules that are enabled for this tenant AND applicable to their business type
  const enabledModules = applicableModules.filter(
    m => m.is_core || enabledModuleCodes.includes(m.code)
  );

  // Check if a specific module is enabled
  const isModuleEnabled = (moduleCode: string): boolean => {
    const module = allModules.find(m => m.code === moduleCode);
    if (module?.is_core) return true;
    return enabledModuleCodes.includes(moduleCode);
  };

  // Toggle module mutation
  const toggleModuleMutation = useMutation({
    mutationFn: async ({ moduleCode, enable }: { moduleCode: string; enable: boolean }) => {
      if (!tenantId) throw new Error("No tenant ID");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (enable) {
        const { error } = await supabase
          .from('tenant_modules')
          .upsert({
            tenant_id: tenantId,
            module_code: moduleCode,
            is_enabled: true,
            enabled_by: user.id,
            enabled_at: new Date().toISOString(),
          }, {
            onConflict: 'tenant_id,module_code',
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tenant_modules')
          .update({ is_enabled: false })
          .eq('tenant_id', tenantId)
          .eq('module_code', moduleCode);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-modules', tenantId] });
      toast({
        title: "Module updated",
        description: "Your module settings have been saved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initialize modules for a new tenant
  const initializeModules = async (newTenantId: string, moduleCodes: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const moduleInserts = moduleCodes
      .filter(code => !allModules.find(m => m.code === code)?.is_core) // Don't insert core modules
      .map(code => ({
        tenant_id: newTenantId,
        module_code: code,
        is_enabled: true,
        enabled_by: user?.id,
      }));

    if (moduleInserts.length > 0) {
      const { error } = await supabase
        .from('tenant_modules')
        .insert(moduleInserts);
      
      if (error) throw error;
    }
  };

  return {
    allModules,
    tenantModules,
    enabledModules,
    enabledModuleCodes,
    isModuleEnabled,
    isLoading: isLoadingModules || isLoadingTenantModules,
    toggleModule: toggleModuleMutation.mutate,
    isToggling: toggleModuleMutation.isPending,
    initializeModules,
  };
}

// Module routes mapping
export const moduleRoutes: Record<string, { url: string; icon: string }> = {
  dashboard: { url: '/business', icon: 'LayoutDashboard' },
  pos: { url: '/business/pos', icon: 'ShoppingCart' },
  products: { url: '/business/products', icon: 'Package' },
  sales: { url: '/business/sales', icon: 'Receipt' },
  customers: { url: '/business/customers', icon: 'Users' },
  employees: { url: '/business/employees', icon: 'UserCircle' },
  expenses: { url: '/business/expenses', icon: 'Wallet' },
  reports: { url: '/business/reports', icon: 'BarChart3' },
  settings: { url: '/business/settings', icon: 'Settings' },
  menu: { url: '/business/menu', icon: 'UtensilsCrossed' },
  tables: { url: '/business/tables', icon: 'MapPin' },
  qr_menu: { url: '/business/qr-codes', icon: 'QrCode' },
  kitchen: { url: '/business/kitchen', icon: 'ChefHat' },
  rooms: { url: '/business/rooms', icon: 'Bed' },
  bookings: { url: '/business/bookings', icon: 'CalendarDays' },
  services: { url: '/business/services', icon: 'Sparkles' },
  jobs: { url: '/business/jobs', icon: 'Wrench' },
  parts: { url: '/business/spare-parts', icon: 'Cog' },
  appointments: { url: '/business/appointments', icon: 'Calendar' },
  prescriptions: { url: '/business/prescriptions', icon: 'Pill' },
  patients: { url: '/business/patients', icon: 'HeartPulse' },
  internal_usage: { url: '/business/internal-usage', icon: 'PackageMinus' },
  suppliers: { url: '/business/suppliers', icon: 'Truck' },
  categories: { url: '/business/categories', icon: 'Tags' },
  stock_alerts: { url: '/business/stock-alerts', icon: 'AlertTriangle' },
  purchase_orders: { url: '/business/purchase-orders', icon: 'ClipboardList' },
  business_cards: { url: '/business/business-cards', icon: 'CreditCard' },
  payroll: { url: '/business/payroll', icon: 'Wallet2' },
  accounting: { url: '/business/accounting', icon: 'Calculator' },
  // School modules
  students: { url: '/business/students', icon: 'Users' },
  classes: { url: '/business/classes', icon: 'GraduationCap' },
  attendance: { url: '/business/attendance', icon: 'ClipboardCheck' },
  gate_checkin: { url: '/business/gate-checkin', icon: 'ScanLine' },
  visitor_register: { url: '/business/visitor-register', icon: 'ClipboardList' },
  grades: { url: '/business/grades', icon: 'Award' },
  subjects: { url: '/business/subjects', icon: 'BookOpen' },
  fees: { url: '/business/fees', icon: 'CreditCard' },
  academic_terms: { url: '/business/academic-terms', icon: 'Calendar' },
  inventory: { url: '/business/inventory', icon: 'Package' },
  letters: { url: '/business/letters', icon: 'FileText' },
  student_cards: { url: '/business/student-cards', icon: 'CreditCard' },
  term_requirements: { url: '/business/term-requirements', icon: 'ClipboardList' },
  report_cards: { url: '/business/report-cards', icon: 'FileText' },
  parents: { url: '/business/parents', icon: 'Users' },
  assets: { url: '/business/assets', icon: 'Package' },
  // ECD/Kindergarten modules
  ecd_pupils: { url: '/business/ecd-pupils', icon: 'Users' },
  ecd_progress: { url: '/business/ecd-progress', icon: 'Award' },
  ecd_roles: { url: '/business/ecd-roles', icon: 'Sparkles' },
  ecd_learning_areas: { url: '/business/ecd-learning-areas', icon: 'BookOpen' },
  ecd_pupil_cards: { url: '/business/ecd-pupil-cards', icon: 'CreditCard' },
  // Discipline module
  discipline: { url: '/business/discipline-cases', icon: 'ShieldAlert' },
  // Requisitions module
  requisitions: { url: '/business/requisitions', icon: 'FileText' },
  // Academics Phase 2
  timetable: { url: '/business/timetable', icon: 'CalendarDays' },
  exams: { url: '/business/exams', icon: 'ClipboardCheck' },
  term_calendar: { url: '/business/term-calendar', icon: 'Calendar' },
  exam_sessions: { url: '/business/exam-sessions', icon: 'Calendar' },
  exam_results_import: { url: '/business/exam-results-import', icon: 'Upload' },
  exam_import_permissions: { url: '/business/exam-import-permissions', icon: 'Shield' },
  // UNEB Candidates
  uneb_registration: { url: '/business/uneb-candidates', icon: 'GraduationCap' },
  uneb_candidates: { url: '/business/uneb-candidates', icon: 'GraduationCap' },
  // Self-Admission modules
  admission_links: { url: '/business/admission-links', icon: 'Link' },
  admission_confirmations: { url: '/business/admission-confirmations', icon: 'UserPlus' },
  // Student Lifecycle Management modules
  student_lifecycle: { url: '/business/student-lifecycle', icon: 'Users' },
  promotion_rules: { url: '/business/promotion-rules', icon: 'TrendingUp' },
  school_holidays: { url: '/business/school-holidays', icon: 'Calendar' },
  // UNEB Exam modules
  uneb_exam_results: { url: '/business/exam-results-lookup', icon: 'ClipboardCheck' },
  exam_access: { url: '/business/exam-access', icon: 'ShieldAlert' },
  // Additional school modules (marks_entry maps to exams page)
  marks_entry: { url: '/business/exams', icon: 'Edit' },
  // Rental Management modules
  rental_dashboard: { url: '/business/rental-dashboard', icon: 'LayoutDashboard' },
  rental_properties: { url: '/business/rental-properties', icon: 'Building2' },
  rental_units: { url: '/business/rental-units', icon: 'DoorOpen' },
  rental_tenants: { url: '/business/rental-tenants', icon: 'Users' },
  rental_leases: { url: '/business/rental-leases', icon: 'FileText' },
  rental_payments: { url: '/business/rental-payments', icon: 'Wallet' },
  rental_maintenance: { url: '/business/rental-maintenance', icon: 'Wrench' },
  rental_id_cards: { url: '/business/rental-id-cards', icon: 'CreditCard' },
  rental_payment_proofs: { url: '/business/rental-payment-proofs', icon: 'Receipt' },
};

// ECD route overrides - when business is kindergarten, use these routes instead
export const ecdRouteOverrides: Record<string, string> = {
  students: '/business/ecd-pupils',
  report_cards: '/business/ecd-progress',
};

// ECD name overrides
export const ecdNameOverrides: Record<string, string> = {
  students: 'ECD Pupils',
  report_cards: 'ECD Progress',
  gate_checkin: 'Pupil Check-In',
};
