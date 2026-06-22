-- Fix student auth with known-good bcrypt hash
-- Password: 'password123'
-- Hash: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86.CHyQ9L9m

-- Delete current bad accounts
DELETE FROM auth.users WHERE email LIKE '%@ttl.student';

-- Insert ONE test account with known-good bcrypt hash
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000'::uuid,
  '670033@ttl.student',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86.CHyQ9L9m',
  NOW(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"role": "student", "first_name": "Test", "last_name": "Student", "must_reset_password": true}'::jsonb,
  NOW(),
  NOW()
);

-- Link to student
UPDATE public.students SET user_id = (SELECT id FROM auth.users WHERE email = '670033@ttl.student')
WHERE admission_number = '670033';

-- Verify
SELECT id, email, encrypted_password FROM auth.users WHERE email = '670033@ttl.student';
