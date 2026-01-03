-- Add school-specific modules to business_modules
INSERT INTO business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
VALUES 
  ('students', 'Students', 'Manage student enrollment and records', 'Users', 'school', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 10),
  ('classes', 'Classes', 'Manage classes and sections', 'GraduationCap', 'school', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 15),
  ('attendance', 'Attendance', 'Track student attendance', 'ClipboardCheck', 'school', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 20),
  ('grades', 'Grades', 'Manage student grades and assessments', 'Award', 'school', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 25),
  ('subjects', 'Subjects', 'Manage subjects and curriculum', 'BookOpen', 'school', ARRAY['primary_school', 'secondary_school'], false, true, 30),
  ('fees', 'Fee Management', 'Manage student fees and payments', 'CreditCard', 'school', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 35),
  ('academic_terms', 'Academic Terms', 'Manage academic terms and sessions', 'Calendar', 'school', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 40)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  applicable_business_types = EXCLUDED.applicable_business_types,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;