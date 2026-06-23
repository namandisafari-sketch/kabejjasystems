-- Add missing business_modules records for modules that exist in tenant_modules
-- but are not yet registered in business_modules
INSERT INTO public.business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
SELECT * FROM (VALUES
  ('marks_entry', 'Marks Entry', 'Enter and manage student marks', 'BookOpen', 'academics', ARRAY['secondary_school','primary_school','kindergarten','school'], false, true, 601),
  ('academic_analytics', 'Academic Analytics', 'Analyze academic performance data', 'BarChart3', 'academics', ARRAY['secondary_school','primary_school','school'], false, true, 602),
  ('exam_sessions', 'Exam Sessions', 'Manage exam timetables and sessions', 'Calendar', 'academics', ARRAY['secondary_school','primary_school','school'], false, true, 603),
  ('exam_results_import', 'Import Exam Results', 'Bulk import exam results from spreadsheets', 'Upload', 'academics', ARRAY['secondary_school','primary_school','school'], false, true, 604),
  ('exam_import_permissions', 'Exam Import Permissions', 'Control who can import exam results', 'Shield', 'academics', ARRAY['secondary_school','primary_school','school'], false, true, 605),
  ('school_holidays', 'School Holidays', 'Manage school holiday calendar', 'Calendar', 'academics', ARRAY['secondary_school','primary_school','kindergarten','school'], false, true, 606),
  ('promotion_rules', 'Promotion Rules', 'Configure student promotion criteria', 'TrendingUp', 'academics', ARRAY['secondary_school','primary_school','school'], false, true, 607),
  ('term_requirements', 'Term Requirements', 'Manage termly requirements for students', 'ClipboardList', 'academics', ARRAY['secondary_school','primary_school','school'], false, true, 608),
  -- Student Lifecycle & Admissions
  ('student_lifecycle', 'Student Lifecycle', 'Track student lifecycle from admission to graduation', 'Users', 'students', ARRAY['secondary_school','primary_school','kindergarten','school'], false, true, 409),
  ('admission_links', 'Admission Links', 'Generate self-admission links for new students', 'Link', 'students', ARRAY['secondary_school','primary_school','kindergarten','school'], false, true, 410),
  ('admission_confirmations', 'Admission Confirmations', 'Review and confirm new student admissions', 'UserPlus', 'students', ARRAY['secondary_school','primary_school','kindergarten','school'], false, true, 411),
  -- UNEB / National Exam modules
  ('uneb_registration', 'UNEB Registration', 'Register candidates for national exams', 'GraduationCap', 'academics', ARRAY['secondary_school','school'], false, true, 701),
  ('uneb_candidates', 'UNEB Candidates', 'Manage registered UNEB candidates', 'GraduationCap', 'academics', ARRAY['secondary_school','school'], false, true, 702),
  ('uneb_exam_results', 'UNEB Exam Results', 'View and manage UNEB exam results', 'ClipboardCheck', 'academics', ARRAY['secondary_school','school'], false, true, 703),
  ('exam_access', 'Exam Access', 'Block or grant student exam access', 'ShieldAlert', 'academics', ARRAY['secondary_school','primary_school','school'], false, true, 704),
  -- ECD
  ('ecd_pupil_cards', 'ECD Pupil Cards', 'Generate ID cards for ECD pupils', 'CreditCard', 'academics', ARRAY['kindergarten'], false, true, 501),
  -- Operations
  ('requisitions', 'Requisitions', 'Manage staff and department requisitions', 'FileText', 'operations', ARRAY['secondary_school','primary_school','kindergarten','school'], false, true, 801),
  -- Staff
  ('staff_permissions', 'Staff Permissions', 'Manage staff module access permissions', 'Shield', 'people', ARRAY['secondary_school','primary_school','kindergarten','school'], false, true, 902),
  -- Communication
  ('notification_settings', 'Notification Settings', 'Configure notification channels and templates', 'Bell', 'communication', ARRAY['secondary_school','primary_school','kindergarten','school'], false, true, 1001),
  ('notification_log', 'Notification Log', 'View sent notification history', 'MessageSquare', 'communication', ARRAY['secondary_school','primary_school','kindergarten','school'], false, true, 1002),
  ('parent_notification_preferences', 'Parent Notification Preferences', 'Manage parent notification preferences', 'Bell', 'communication', ARRAY['secondary_school','primary_school','kindergarten','school'], false, true, 1003),
  -- Community Hub
  ('suggestions', 'Suggestions', 'Collect and manage staff suggestions', 'Lightbulb', 'communication', ARRAY['secondary_school','primary_school','kindergarten','school'], false, true, 1004)
) AS m(code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.business_modules WHERE code = m.code
);

-- Enable all applicable modules for EDEN HIGH SCHOOL that aren't yet enabled
INSERT INTO public.tenant_modules (tenant_id, module_code, is_enabled)
SELECT 'ef7a3391-cddd-434f-9422-e58ffda74953', bm.code, true
FROM public.business_modules bm
WHERE (bm.applicable_business_types IS NULL OR bm.applicable_business_types = '{}' OR 'secondary_school' = ANY(bm.applicable_business_types) OR 'school' = ANY(bm.applicable_business_types))
AND NOT EXISTS (
  SELECT 1 FROM public.tenant_modules 
  WHERE tenant_id = 'ef7a3391-cddd-434f-9422-e58ffda74953' 
  AND module_code = bm.code
)
AND bm.is_core = false;

-- Update applicable_business_types for modules that should include secondary_school
UPDATE public.business_modules
SET applicable_business_types = ARRAY_APPEND(applicable_business_types, 'secondary_school')
WHERE code IN (
  'marks_entry', 'academic_analytics', 'exam_sessions', 'exam_results_import',
  'exam_import_permissions', 'school_holidays', 'promotion_rules', 'term_requirements',
  'student_lifecycle', 'admission_links', 'admission_confirmations',
  'uneb_registration', 'uneb_candidates', 'uneb_exam_results', 'exam_access',
  'requisitions', 'staff_permissions', 'suggestions',
  'notification_settings', 'notification_log', 'parent_notification_preferences'
) 
AND (applicable_business_types IS NULL OR NOT ('secondary_school' = ANY(applicable_business_types)));

-- Also update reports to include school
UPDATE public.business_modules
SET applicable_business_types = ARRAY_CAT(
  COALESCE(applicable_business_types, '{}'),
  ARRAY['secondary_school','primary_school','kindergarten','school']
)
WHERE code = 'reports'
AND (applicable_business_types IS NULL OR NOT ('school' = ANY(applicable_business_types)));

SELECT COUNT(*) AS total_business_modules FROM public.business_modules;
