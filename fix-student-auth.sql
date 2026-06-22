-- COMPLETE SOLUTION: Fix student auth accounts and linking
-- Run this in Supabase SQL Editor in steps

-- STEP 1: Delete all problematic student auth accounts
DELETE FROM auth.users 
WHERE email LIKE '%@ttl.student'
  AND email IN (
    SELECT admission_number || '@ttl.student' FROM public.students
    WHERE tenant_id = 'ef7a3391-cddd-434f-9422-e58ffda74953'
  );

-- STEP 2: Clear user_id linking (we'll recreate it)
UPDATE public.students SET user_id = NULL
WHERE tenant_id = 'ef7a3391-cddd-434f-9422-e58ffda74953';

-- STEP 3: Create NEW auth accounts with proper password hashing
-- Using Supabase's standard bcrypt approach
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
SELECT
  gen_random_uuid() as id,
  '00000000-0000-0000-0000-000000000000'::uuid as instance_id,
  s.admission_number || '@ttl.student' as email,
  crypt('alwaystry!', gen_salt('bf')) as encrypted_password,
  NOW() as email_confirmed_at,
  NOW() as created_at,
  NOW() as updated_at,
  NOW() as last_sign_in_at,
  jsonb_build_object('provider', 'email', 'providers', ARRAY['email']) as raw_app_meta_data,
  jsonb_build_object(
    'role', 'student',
    'first_name', s.first_name,
    'last_name', s.last_name,
    'admission_number', s.admission_number,
    'tenant_id', s.tenant_id::text
  ) as raw_user_meta_data,
  false as is_super_admin,
  '' as confirmation_token,
  '' as email_change,
  '' as email_change_token_new,
  '' as recovery_token
FROM public.students s
WHERE s.tenant_id = 'ef7a3391-cddd-434f-9422-e58ffda74953'
  AND s.admission_number IS NOT NULL
ORDER BY s.admission_number;

-- STEP 4: Link students to their new auth accounts
UPDATE public.students s
SET user_id = au.id
FROM auth.users au
WHERE s.admission_number || '@ttl.student' = au.email
  AND s.tenant_id = 'ef7a3391-cddd-434f-9422-e58ffda74953';

-- STEP 5: Verify everything is correct
SELECT 
  COUNT(*) as total_students,
  COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as with_auth,
  COUNT(CASE WHEN user_id IS NULL THEN 1 END) as without_auth
FROM public.students
WHERE tenant_id = 'ef7a3391-cddd-434f-9422-e58ffda74953';

-- STEP 6: Check specific student (670033)
SELECT 
  s.id, 
  s.admission_number, 
  s.user_id,
  au.email,
  au.encrypted_password 
FROM public.students s
LEFT JOIN auth.users au ON s.user_id = au.id
WHERE s.admission_number = '670033';
