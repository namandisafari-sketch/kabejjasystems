-- Fix RLS for authenticated students to read their own records
-- Drop existing problematic policies
DROP POLICY IF EXISTS "students_select" ON public.students;
DROP POLICY IF EXISTS "students_insert" ON public.students;
DROP POLICY IF EXISTS "students_update" ON public.students;
DROP POLICY IF EXISTS "students_delete" ON public.students;

-- Create new policies that allow authenticated users to access their own student record
-- 1. SELECT: Users can read their own student record (matched by user_id)
CREATE POLICY "students_select_authenticated" ON public.students
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR
  -- Also allow if user is staff/admin for tenant (can extend later)
  EXISTS (
    SELECT 1 FROM public.staff_members
    WHERE staff_members.user_id = auth.uid()
    AND staff_members.tenant_id = students.tenant_id
  )
);

-- 2. Also allow anonymous for initial lookup during login (RLS won't apply to service role)
CREATE POLICY "students_select_anon" ON public.students
FOR SELECT
TO anon
USING (true);

-- 3. INSERT: Only service role (via backend)
-- Authenticated users cannot insert directly

-- 4. UPDATE: Users can update their own record
CREATE POLICY "students_update_self" ON public.students
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. DELETE: Disable for now
-- Authenticated users cannot delete

-- Ensure table has RLS enabled
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, UPDATE ON public.students TO authenticated, anon;
