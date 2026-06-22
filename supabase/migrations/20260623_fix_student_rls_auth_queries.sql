-- Fix RLS policies for authenticated student login
-- The 406 error means RLS is blocking authenticated user queries

-- Drop all existing student policies to start fresh
DROP POLICY IF EXISTS "students_select" ON public.students;
DROP POLICY IF EXISTS "students_insert" ON public.students;
DROP POLICY IF EXISTS "students_update" ON public.students;
DROP POLICY IF EXISTS "students_delete" ON public.students;
DROP POLICY IF EXISTS "Anonymous users can lookup students for login" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can view own student record" ON public.students;

-- Policy 1: Authenticated users can select their own student record
CREATE POLICY "students_authenticated_select_own" ON public.students
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Anonymous can select (needed for login OTP flow)
CREATE POLICY "students_anon_select" ON public.students
FOR SELECT
TO anon
USING (true);

-- Policy 3: Authenticated users can update their own record
CREATE POLICY "students_authenticated_update_own" ON public.students
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure RLS is enabled
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Grant table permissions (must have this for policies to work)
GRANT SELECT ON public.students TO authenticated, anon, public;
GRANT UPDATE ON public.students TO authenticated;
