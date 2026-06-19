-- Seed sample accounts for Eden High School
-- Run this in Supabase Dashboard > SQL Editor
-- Tenant: EDEN HIGH SCHOOL (id: 6d6a33e6-13c9-4559-a664-18f30c42cc95)

-- 1. Create auth users (with auto-confirmed emails)
-- Use the Supabase Dashboard > Authentication > Users or run:
-- Note: Auth users can only be created via the auth API, not SQL directly.
-- Go to Authentication > Users > Invite user or use the "Add User" button.

-- After creating auth users, get their IDs and run:

-- 2. Create profiles
INSERT INTO profiles (id, tenant_id, role, full_name) VALUES
  ('<teacher-user-id>', '6d6a33e6-13c9-4559-a664-18f30c42cc95', 'staff', 'Sarah Teacher'),
  ('<dos-user-id>', '6d6a33e6-13c9-4559-a664-18f30c42cc95', 'staff', 'James DOS'),
  ('<headteacher-user-id>', '6d6a33e6-13c9-4559-a664-18f30c42cc95', 'staff', 'Peter Headteacher');

-- 3. Create staff role assignment records
INSERT INTO staff_role_assignments (profile_id, tenant_id, role) VALUES
  ('<teacher-user-id>', '6d6a33e6-13c9-4559-a664-18f30c42cc95', 'class_teacher'),
  ('<dos-user-id>', '6d6a33e6-13c9-4559-a664-18f30c42cc95', 'director_of_studies'),
  ('<headteacher-user-id>', '6d6a33e6-13c9-4559-a664-18f30c42cc95', 'head_teacher');

-- 4. Create staff permissions (optional, for module access)
INSERT INTO staff_permissions (profile_id, tenant_id, staff_type, allowed_modules) VALUES
  ('<teacher-user-id>', '6d6a33e6-13c9-4559-a664-18f30c42cc95', 'teacher', '{dashboard,classes,attendance,marks,students,assignments,reports}'),
  ('<dos-user-id>', '6d6a33e6-13c9-4559-a664-18f30c42cc95', 'director_of_studies', '{dashboard,academics,exams,timetable,teachers,students,reports}'),
  ('<headteacher-user-id>', '6d6a33e6-13c9-4559-a664-18f30c42cc95', 'head_teacher', '{dashboard,admin,students,staff,academics,finance,infrastructure,reports}');
