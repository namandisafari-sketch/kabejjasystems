-- Comprehensive RLS Policy Fix for School Management Tables
-- Fixes permission denied errors for school_classes, subjects, and academic_terms

-- =====================================================================
-- 1. ANONYMOUS/LOGIN POLICIES
-- =====================================================================

-- Allow anonymous users to lookup students by admission number for login
DROP POLICY IF EXISTS "Anonymous users can lookup students for login" ON public.students;
CREATE POLICY "Anonymous users can lookup students for login"
  ON public.students 
  FOR SELECT 
  TO anon 
  USING (true);

-- =====================================================================
-- 2. SCHOOL ADMIN POLICIES FOR SCHOOL_CLASSES
-- =====================================================================

DROP POLICY IF EXISTS "Users can view their tenant classes" ON public.school_classes;
CREATE POLICY "Users can view their tenant classes" 
  ON public.school_classes 
  FOR SELECT 
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert classes for their tenant" ON public.school_classes;
CREATE POLICY "Users can insert classes for their tenant" 
  ON public.school_classes 
  FOR INSERT 
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their tenant classes" ON public.school_classes;
CREATE POLICY "Users can update their tenant classes" 
  ON public.school_classes 
  FOR UPDATE 
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their tenant classes" ON public.school_classes;
CREATE POLICY "Users can delete their tenant classes" 
  ON public.school_classes 
  FOR DELETE 
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- =====================================================================
-- 3. SCHOOL ADMIN POLICIES FOR SUBJECTS
-- =====================================================================

DROP POLICY IF EXISTS "Users can view their tenant subjects" ON public.subjects;
CREATE POLICY "Users can view their tenant subjects" 
  ON public.subjects 
  FOR SELECT 
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert subjects for their tenant" ON public.subjects;
CREATE POLICY "Users can insert subjects for their tenant" 
  ON public.subjects 
  FOR INSERT 
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their tenant subjects" ON public.subjects;
CREATE POLICY "Users can update their tenant subjects" 
  ON public.subjects 
  FOR UPDATE 
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their tenant subjects" ON public.subjects;
CREATE POLICY "Users can delete their tenant subjects" 
  ON public.subjects 
  FOR DELETE 
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- =====================================================================
-- 4. SCHOOL ADMIN POLICIES FOR ACADEMIC_TERMS
-- =====================================================================

DROP POLICY IF EXISTS "Users can view their tenant academic terms" ON public.academic_terms;
CREATE POLICY "Users can view their tenant academic terms" 
  ON public.academic_terms 
  FOR SELECT 
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert academic terms for their tenant" ON public.academic_terms;
CREATE POLICY "Users can insert academic terms for their tenant" 
  ON public.academic_terms 
  FOR INSERT 
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their tenant academic terms" ON public.academic_terms;
CREATE POLICY "Users can update their tenant academic terms" 
  ON public.academic_terms 
  FOR UPDATE 
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their tenant academic terms" ON public.academic_terms;
CREATE POLICY "Users can delete their tenant academic terms" 
  ON public.academic_terms 
  FOR DELETE 
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
