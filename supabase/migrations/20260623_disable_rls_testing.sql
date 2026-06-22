-- AGGRESSIVE RLS FIX - Disable RLS for testing to identify the real problem
-- This will help us verify if RLS is the issue or if it's something else

-- Drop all restrictive RLS policies and enable unrestricted access for now
ALTER TABLE public.school_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms DISABLE ROW LEVEL SECURITY;

-- Keep students table with only the login policy
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anonymous users can lookup students for login" ON public.students;
CREATE POLICY "Anonymous users can lookup students for login"
  ON public.students FOR SELECT TO anon USING (true);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
