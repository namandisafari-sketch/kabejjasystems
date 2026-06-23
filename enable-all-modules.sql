-- Enable all missing modules for EDEN HIGH SCHOOL
INSERT INTO public.tenant_modules (tenant_id, module_code)
SELECT 'ef7a3391-cddd-434f-9422-e58ffda74953', m.module_code
FROM (VALUES 
  ('employees'), ('term_requirements'), ('ecd_pupils'), ('ecd_progress'), 
  ('ecd_roles'), ('ecd_learning_areas'), ('ecd_pupil_cards'),
  ('requisitions'), ('term_calendar'), ('exam_sessions'), 
  ('exam_results_import'), ('exam_import_permissions'),
  ('uneb_registration'), ('uneb_candidates'), ('admission_links'),
  ('admission_confirmations'), ('student_lifecycle'), ('promotion_rules'),
  ('school_holidays'), ('uneb_exam_results'), ('exam_access'),
  ('marks_entry'), ('academic_analytics'), ('suggestions'),
  ('notification_settings'), ('notification_log'), 
  ('parent_notification_preferences'), ('customer_payments'),
  ('sales'), ('customers'), ('employee_documents'),
  ('library'), ('transport'), ('maintenance'),
  ('staff_permissions'), ('send_home_records'),
  ('lesson_plans'), ('payment_uploads'), ('sale_items')
) AS m(module_code)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tenant_modules 
  WHERE tenant_id = 'ef7a3391-cddd-434f-9422-e58ffda74953' 
  AND module_code = m.module_code
);

-- Count total enabled modules
SELECT COUNT(*) AS total_enabled_modules FROM public.tenant_modules WHERE tenant_id = 'ef7a3391-cddd-434f-9422-e58ffda74953';
