-- Insert ECD-specific modules into business_modules
INSERT INTO public.business_modules (code, name, description, icon, category, is_core, is_active, display_order, applicable_business_types)
VALUES 
  ('ecd_pupils', 'ECD Pupils', 'Manage kindergarten learners and enrollment', 'Users', 'academics', false, true, 5, ARRAY['kindergarten']),
  ('ecd_progress', 'ECD Progress', 'Track developmental progress and report cards', 'Award', 'academics', false, true, 6, ARRAY['kindergarten']),
  ('ecd_roles', 'Class Roles', 'Manage class roles like Class Monitor, Line Leader', 'Sparkles', 'academics', false, true, 7, ARRAY['kindergarten']),
  ('ecd_learning_areas', 'Learning Areas', 'Manage learning areas for assessment', 'BookOpen', 'academics', false, true, 8, ARRAY['kindergarten'])
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  applicable_business_types = EXCLUDED.applicable_business_types,
  is_active = true;