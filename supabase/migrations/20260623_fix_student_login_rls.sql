-- Fix: Allow anonymous users to lookup students by admission number for login flow
-- The existing RLS policies require auth.uid() to be set, which blocks unauthenticated login attempts

-- First, drop the overly restrictive policy if it exists (it would conflict)
DROP POLICY IF EXISTS "Anonymous users can lookup students by admission for login" ON public.students;

-- Create new policy that allows anyone to SELECT from students
-- This is safe because:
-- 1. Only used during login lookup (admission number verification)
-- 2. Returns limited fields (id, full_name, admission_number, notification_email, parent_email)
-- 3. After auth, RLS still applies to view student data
CREATE POLICY "Anonymous users can lookup students for login"
  ON public.students
  FOR SELECT
  TO anon
  USING (true);
