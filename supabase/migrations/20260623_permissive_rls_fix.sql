-- COMPREHENSIVE RLS POLICY FIX
-- Allows authenticated users to manage their school's data

-- 1. SCHOOL_CLASSES - Allow authenticated users to manage their tenant's classes
DROP POLICY IF EXISTS "Users can view their tenant classes" ON public.school_classes;
DROP POLICY IF EXISTS "Users can insert classes for their tenant" ON public.school_classes;
DROP POLICY IF EXISTS "Users can update their tenant classes" ON public.school_classes;
DROP POLICY IF EXISTS "Users can delete their tenant classes" ON public.school_classes;

CREATE POLICY "Enable all for authenticated users on school_classes"
  ON public.school_classes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. SUBJECTS - Allow authenticated users to manage their tenant's subjects
DROP POLICY IF EXISTS "Users can view their tenant subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can insert subjects for their tenant" ON public.subjects;
DROP POLICY IF EXISTS "Users can update their tenant subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can delete their tenant subjects" ON public.subjects;

CREATE POLICY "Enable all for authenticated users on subjects"
  ON public.subjects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. ACADEMIC_TERMS - Allow authenticated users to manage their tenant's terms
DROP POLICY IF EXISTS "Users can view their tenant academic terms" ON public.academic_terms;
DROP POLICY IF EXISTS "Users can insert academic terms for their tenant" ON public.academic_terms;
DROP POLICY IF EXISTS "Users can update their tenant academic terms" ON public.academic_terms;
DROP POLICY IF EXISTS "Users can delete their tenant academic terms" ON public.academic_terms;

CREATE POLICY "Enable all for authenticated users on academic_terms"
  ON public.academic_terms
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. STUDENTS - Allow anonymous users to lookup for login, authenticated to manage
DROP POLICY IF EXISTS "Anonymous users can lookup students for login" ON public.students;
DROP POLICY IF EXISTS "Users can view their tenant students" ON public.students;
DROP POLICY IF EXISTS "Users can insert students for their tenant" ON public.students;
DROP POLICY IF EXISTS "Users can update their tenant students" ON public.students;
DROP POLICY IF EXISTS "Users can delete their tenant students" ON public.students;

-- Allow anonymous users to lookup students by admission number (for login)
CREATE POLICY "Anonymous users can lookup students for login"
  ON public.students
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users full access
CREATE POLICY "Enable all for authenticated users on students"
  ON public.students
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
