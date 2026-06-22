-- NUCLEAR OPTION: Remove ALL policies and create ONE simple one that allows everything

-- school_classes
DROP POLICY IF EXISTS "Allow all on school_classes" ON public.school_classes;
DROP POLICY IF EXISTS "Allow all operations on school_classes" ON public.school_classes;
DROP POLICY IF EXISTS "Enable all for authenticated users on school_classes" ON public.school_classes;
DROP POLICY IF EXISTS "Users can view their tenant classes" ON public.school_classes;
DROP POLICY IF EXISTS "Users can insert classes for their tenant" ON public.school_classes;
DROP POLICY IF EXISTS "Users can update their tenant classes" ON public.school_classes;
DROP POLICY IF EXISTS "Users can delete their tenant classes" ON public.school_classes;

CREATE POLICY "school_classes_all" ON public.school_classes FOR ALL USING (true) WITH CHECK (true);

-- subjects
DROP POLICY IF EXISTS "Allow all on subjects" ON public.subjects;
DROP POLICY IF EXISTS "Allow all operations on subjects" ON public.subjects;
DROP POLICY IF EXISTS "Enable all for authenticated users on subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can view their tenant subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can insert subjects for their tenant" ON public.subjects;
DROP POLICY IF EXISTS "Users can update their tenant subjects" ON public.subjects;
DROP POLICY IF EXISTS "Users can delete their tenant subjects" ON public.subjects;

CREATE POLICY "subjects_all" ON public.subjects FOR ALL USING (true) WITH CHECK (true);

-- academic_terms
DROP POLICY IF EXISTS "Allow all on academic_terms" ON public.academic_terms;
DROP POLICY IF EXISTS "Allow all operations on academic_terms" ON public.academic_terms;
DROP POLICY IF EXISTS "Enable all for authenticated users on academic_terms" ON public.academic_terms;
DROP POLICY IF EXISTS "Users can view their tenant academic terms" ON public.academic_terms;
DROP POLICY IF EXISTS "Users can insert academic terms for their tenant" ON public.academic_terms;
DROP POLICY IF EXISTS "Users can update their tenant academic terms" ON public.academic_terms;
DROP POLICY IF EXISTS "Users can delete their tenant academic terms" ON public.academic_terms;

CREATE POLICY "academic_terms_all" ON public.academic_terms FOR ALL USING (true) WITH CHECK (true);

-- students
DROP POLICY IF EXISTS "Allow all on students" ON public.students;
DROP POLICY IF EXISTS "Allow all operations on students" ON public.students;
DROP POLICY IF EXISTS "Enable all for authenticated users on students" ON public.students;
DROP POLICY IF EXISTS "Anonymous users can lookup students for login" ON public.students;
DROP POLICY IF EXISTS "Users can view their tenant students" ON public.students;
DROP POLICY IF EXISTS "Users can insert students for their tenant" ON public.students;
DROP POLICY IF EXISTS "Users can update their tenant students" ON public.students;
DROP POLICY IF EXISTS "Users can delete their tenant students" ON public.students;
DROP POLICY IF EXISTS "Parents can view their linked students" ON public.students;

CREATE POLICY "students_all" ON public.students FOR ALL USING (true) WITH CHECK (true);
