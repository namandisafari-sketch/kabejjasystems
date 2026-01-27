-- Enable requisitions module for all existing tenants that have applicable business types
INSERT INTO public.tenant_modules (tenant_id, module_code, is_enabled, enabled_at)
SELECT 
  t.id,
  'requisitions',
  true,
  now()
FROM tenants t
WHERE t.business_type IN ('school', 'kindergarten', 'restaurant', 'hotel', 'pharmacy', 'repair', 'salon', 'retail', 'rental', 'primary_school', 'secondary_school')
ON CONFLICT (tenant_id, module_code) DO UPDATE SET is_enabled = true;

-- Also ensure assets module is enabled for school-type tenants
INSERT INTO public.tenant_modules (tenant_id, module_code, is_enabled, enabled_at)
SELECT 
  t.id,
  'assets',
  true,
  now()
FROM tenants t
WHERE t.business_type IN ('kindergarten', 'primary_school', 'secondary_school', 'school')
ON CONFLICT (tenant_id, module_code) DO UPDATE SET is_enabled = true;