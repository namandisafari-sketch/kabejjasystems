-- Add the Parents module to business_modules
INSERT INTO public.business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
VALUES (
  'parents',
  'Parents',
  'Manage parent accounts and link them to students',
  'Users',
  'school',
  ARRAY['school'],
  false,
  true,
  38
);

-- Enable the parents module for all school tenants
INSERT INTO public.tenant_modules (tenant_id, module_code, is_enabled, enabled_at)
SELECT t.id, 'parents', true, now()
FROM tenants t
WHERE t.business_type = 'school'
ON CONFLICT (tenant_id, module_code) DO NOTHING;