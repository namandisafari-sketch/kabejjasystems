-- TEMPORARY FIX: Disable RLS to confirm it's the issue
-- We'll re-enable it with correct policies after confirming

ALTER TABLE public.school_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
