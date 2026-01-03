-- Add Student ID Cards module to business_modules for schools
INSERT INTO public.business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
VALUES (
  'student_cards',
  'Student ID Cards',
  'Generate and print student ID cards with payment barcodes for fee collection',
  'CreditCard',
  'school',
  ARRAY['school', 'kindergarten', 'primary_school', 'secondary_school'],
  false,
  true,
  86
)
ON CONFLICT (code) DO NOTHING;