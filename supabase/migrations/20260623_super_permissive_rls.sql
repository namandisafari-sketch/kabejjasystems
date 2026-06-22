-- SUPER PERMISSIVE RLS - Allow everyone (including authenticated users with no specific role requirement)
-- This bypasses the need for complex role checking

-- school_classes
ALTER TABLE public.school_classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on school_classes"
  ON public.school_classes
  AS PERMISSIVE
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- subjects
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on subjects"
  ON public.subjects
  AS PERMISSIVE
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- academic_terms
ALTER TABLE public.academic_terms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on academic_terms"
  ON public.academic_terms
  AS PERMISSIVE
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- students - Keep anonymous login but allow authenticated users
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on students"
  ON public.students
  AS PERMISSIVE
  FOR ALL
  USING (true)
  WITH CHECK (true);
