-- Insert missing lifecycle management modules for schools
INSERT INTO business_modules (code, name, description, category, applicable_business_types, is_core, is_active, display_order)
VALUES 
  ('student_lifecycle', 'Student Lifecycle', 'Manage student withdrawals, at-risk monitoring, and fee reconciliation', 'academic', ARRAY['kindergarten', 'primary_school', 'secondary_school', 'school'], false, true, 10),
  ('promotion_rules', 'Promotion Rules', 'Configure academic promotion criteria and rules', 'academic', ARRAY['kindergarten', 'primary_school', 'secondary_school', 'school'], false, true, 11),
  ('school_holidays', 'School Holidays', 'Manage holiday dates excluded from attendance calculations', 'academic', ARRAY['kindergarten', 'primary_school', 'secondary_school', 'school'], false, true, 12),
  ('admission_links', 'Admission Links', 'Create and manage online admission links', 'admission', ARRAY['kindergarten', 'primary_school', 'secondary_school', 'school'], false, true, 1),
  ('admission_confirmations', 'Admission Confirmations', 'Review and approve submitted admissions', 'admission', ARRAY['kindergarten', 'primary_school', 'secondary_school', 'school'], false, true, 2),
  ('admission_settings', 'Admission Settings', 'Configure admission form fields and requirements', 'admission', ARRAY['kindergarten', 'primary_school', 'secondary_school', 'school'], false, true, 3)
ON CONFLICT (code) DO NOTHING;