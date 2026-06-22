-- Re-enable RLS with proper UPDATE policies
ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for ALL operations
CREATE POLICY "school_classes_select" ON public.school_classes FOR SELECT USING (true);
CREATE POLICY "school_classes_insert" ON public.school_classes FOR INSERT WITH CHECK (true);
CREATE POLICY "school_classes_update" ON public.school_classes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "school_classes_delete" ON public.school_classes FOR DELETE USING (true);

CREATE POLICY "subjects_select" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "subjects_insert" ON public.subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "subjects_update" ON public.subjects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "subjects_delete" ON public.subjects FOR DELETE USING (true);

CREATE POLICY "academic_terms_select" ON public.academic_terms FOR SELECT USING (true);
CREATE POLICY "academic_terms_insert" ON public.academic_terms FOR INSERT WITH CHECK (true);
CREATE POLICY "academic_terms_update" ON public.academic_terms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "academic_terms_delete" ON public.academic_terms FOR DELETE USING (true);

CREATE POLICY "students_select" ON public.students FOR SELECT USING (true);
CREATE POLICY "students_insert" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "students_update" ON public.students FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "students_delete" ON public.students FOR DELETE USING (true);
