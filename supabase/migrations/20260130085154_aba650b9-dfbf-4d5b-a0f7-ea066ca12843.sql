-- Fix the school_classes level constraint to include o-level and a-level
ALTER TABLE school_classes DROP CONSTRAINT IF EXISTS school_classes_level_check;
ALTER TABLE school_classes ADD CONSTRAINT school_classes_level_check 
  CHECK (level = ANY (ARRAY['kindergarten'::text, 'primary'::text, 'secondary'::text, 'o-level'::text, 'a-level'::text]));

-- Add UNEB Exam modules to business_modules
INSERT INTO business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
VALUES 
  ('uneb_candidates', 'UNEB Candidates', 'Manage UNEB candidate registration for UCE/UACE', 'GraduationCap', 'academics', ARRAY['secondary_school'], false, true, 60),
  ('exam_sessions', 'Exam Sessions', 'Configure UNEB and internal exam sessions', 'Calendar', 'academics', ARRAY['secondary_school'], false, true, 61),
  ('exam_results_import', 'Import Exam Results', 'Import and manage UNEB examination results', 'Upload', 'academics', ARRAY['secondary_school'], false, true, 62),
  ('exam_import_permissions', 'Import Permissions', 'Manage staff permissions for exam result imports', 'Shield', 'academics', ARRAY['secondary_school'], false, true, 63),
  ('exam_access', 'Exam Access Control', 'Manage blocked exam result access for students with balances', 'ShieldAlert', 'academics', ARRAY['secondary_school'], false, true, 64)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  applicable_business_types = EXCLUDED.applicable_business_types,
  is_active = true;