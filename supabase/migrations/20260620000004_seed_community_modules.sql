-- Seed community hub modules into business_modules
INSERT INTO public.business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
VALUES
  ('suggestions', 'Suggestion Box', 'Collect and manage public suggestions', 'Lightbulb', 'school', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 100),
  ('staff_reviews', 'Staff Reviews', 'Public reviews and ratings for staff members', 'Star', 'school', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 101),
  ('notification_settings', 'Notification Settings', 'Configure SMS, WhatsApp, and email notification providers', 'Bell', 'admin', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 102),
  ('notification_log', 'Notification Log', 'View outgoing notification history', 'MessageSquare', 'admin', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 103),
  ('parent_notification_preferences', 'Parent Notifications', 'Manage parent notification preferences per channel', 'Bell', 'school', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 104)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  applicable_business_types = EXCLUDED.applicable_business_types,
  is_active = EXCLUDED.is_active;

-- Enable these modules for all existing school tenants
INSERT INTO public.tenant_modules (tenant_id, module_code, is_enabled, enabled_by, enabled_at)
SELECT
  t.id,
  m.code,
  true,
  (SELECT id FROM auth.users LIMIT 1),
  now()
FROM public.tenants t
CROSS JOIN (VALUES 
  ('suggestions'),
  ('staff_reviews'),
  ('notification_settings'),
  ('notification_log'),
  ('parent_notification_preferences')
) AS m(code)
WHERE t.business_type IN ('kindergarten', 'primary_school', 'secondary_school')
AND NOT EXISTS (
  SELECT 1 FROM public.tenant_modules tm
  WHERE tm.tenant_id = t.id AND tm.module_code = m.code
)
ON CONFLICT (tenant_id, module_code) DO UPDATE SET is_enabled = true;
