-- Add Letters module to business_modules for schools
INSERT INTO public.business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
VALUES (
  'letters',
  'Letters',
  'Create and manage official letters, announcements, and communications',
  'FileText',
  'school',
  ARRAY['school'],
  false,
  true,
  85
)
ON CONFLICT (code) DO NOTHING;