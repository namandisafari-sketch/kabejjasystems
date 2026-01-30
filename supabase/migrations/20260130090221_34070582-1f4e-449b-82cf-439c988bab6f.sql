-- Create teacher_class_assignments table for assigning teachers to specific classes
CREATE TABLE IF NOT EXISTS public.teacher_class_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES school_classes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_class_teacher boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  UNIQUE(teacher_id, class_id)
);

-- Create teacher_subject_assignments table for assigning teachers to specific subjects
CREATE TABLE IF NOT EXISTS public.teacher_subject_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id uuid REFERENCES school_classes(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES profiles(id),
  UNIQUE(teacher_id, subject_id, class_id)
);

-- Add staff_type column to staff_permissions to differentiate teacher from other staff
ALTER TABLE staff_permissions ADD COLUMN IF NOT EXISTS staff_type text DEFAULT 'general';

-- Enable RLS
ALTER TABLE teacher_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subject_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for teacher_class_assignments
CREATE POLICY "Users can view teacher class assignments for their tenant"
  ON teacher_class_assignments FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant owners can manage teacher class assignments"
  ON teacher_class_assignments FOR ALL
  USING (tenant_id = public.get_user_tenant_id());

-- RLS policies for teacher_subject_assignments
CREATE POLICY "Users can view teacher subject assignments for their tenant"
  ON teacher_subject_assignments FOR SELECT
  USING (tenant_id = public.get_user_tenant_id());

CREATE POLICY "Tenant owners can manage teacher subject assignments"
  ON teacher_subject_assignments FOR ALL
  USING (tenant_id = public.get_user_tenant_id());

-- Add more school modules to business_modules for comprehensive permission control
INSERT INTO business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
VALUES 
  ('marks_entry', 'Marks Entry', 'Enter and manage student examination marks', 'Edit', 'academics', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 50),
  ('attendance', 'Attendance', 'Take and manage student/staff attendance', 'UserCheck', 'academics', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 51),
  ('report_cards', 'Report Cards', 'Generate and manage student report cards', 'FileText', 'academics', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 52),
  ('student_cards', 'Student ID Cards', 'Generate student ID cards', 'CreditCard', 'academics', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 53),
  ('parents', 'Parents', 'Manage parent/guardian information', 'Users', 'academics', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 54),
  ('discipline', 'Discipline Cases', 'Track student discipline records', 'AlertTriangle', 'academics', ARRAY['primary_school', 'secondary_school'], false, true, 55),
  ('timetable', 'Timetable', 'Manage class timetables', 'Calendar', 'academics', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 56),
  ('gate_checkin', 'Gate Check-in', 'QR-based gate attendance system', 'QrCode', 'operations', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 57),
  ('fees', 'Fee Management', 'Manage student fees and payments', 'Wallet', 'finance', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 58),
  ('letters', 'Letters', 'Generate official school letters', 'Mail', 'operations', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 59)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  applicable_business_types = EXCLUDED.applicable_business_types,
  is_active = true;