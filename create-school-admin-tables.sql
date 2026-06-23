-- ================================================================
-- COMPLETE SCHOOL ADMIN + SYSTEM TABLES MIGRATION
-- Run this in Supabase Dashboard SQL Editor:
-- https://app.supabase.com/project/ljgbjiixeoxxqpejnmjx/sql/new
-- ================================================================

-- 1. STAFF_ROLE_ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.staff_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    staff_member_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
    role public.staff_role NOT NULL,
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(staff_member_id, role)
);
ALTER TABLE public.staff_role_assignments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_role_assignMENTS TO anon, authenticated;
CREATE POLICY "staff_role_assignments_all" ON public.staff_role_assignments FOR ALL USING (true) WITH CHECK (true);

-- 2. GOVERNING_BODIES
CREATE TABLE IF NOT EXISTS public.governing_bodies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    body_type TEXT NOT NULL CHECK (body_type IN ('board', 'pta', 'smc', 'academic_board', 'finance_committee', 'discipline_committee', 'other')),
    mandate TEXT,
    meeting_frequency TEXT,
    formed_date DATE,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.governing_bodies ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.governing_bodies TO anon, authenticated;
CREATE POLICY "governing_bodies_all" ON public.governing_bodies FOR ALL USING (true) WITH CHECK (true);

-- 3. GOVERNING_BODY_MEMBERS
CREATE TABLE IF NOT EXISTS public.governing_body_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    governing_body_id UUID NOT NULL REFERENCES public.governing_bodies(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    position TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    photo_url TEXT,
    appointment_date DATE,
    expiry_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.governing_body_members ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.governing_body_members TO anon, authenticated;
CREATE POLICY "governing_body_members_all" ON public.governing_body_members FOR ALL USING (true) WITH CHECK (true);

-- 4. GOVERNING_BODY_MEETINGS
CREATE TABLE IF NOT EXISTS public.governing_body_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    governing_body_id UUID NOT NULL REFERENCES public.governing_bodies(id) ON DELETE CASCADE,
    meeting_date TIMESTAMPTZ NOT NULL,
    venue TEXT,
    agenda TEXT,
    minutes TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'adjourned', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.governing_body_meetings ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.governing_body_meetings TO anon, authenticated;
CREATE POLICY "governing_body_meetings_all" ON public.governing_body_meetings FOR ALL USING (true) WITH CHECK (true);

-- 5. ACADEMIC_DEPARTMENTS
CREATE TABLE IF NOT EXISTS public.academic_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    head_of_department UUID REFERENCES public.staff_members(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);
ALTER TABLE public.academic_departments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.academic_departments TO anon, authenticated;
CREATE POLICY "academic_departments_all" ON public.academic_departments FOR ALL USING (true) WITH CHECK (true);

-- 6. SCHOOL_INSPECTIONS
CREATE TABLE IF NOT EXISTS public.school_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    inspection_date DATE NOT NULL,
    inspector_name TEXT NOT NULL,
    inspector_title TEXT,
    inspection_type TEXT NOT NULL CHECK (inspection_type IN ('routine', 'special', 'follow_up', 'complaint', 'other')),
    findings TEXT,
    recommendations TEXT,
    score NUMERIC CHECK (score >= 0 AND score <= 100),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'closed')),
    report_url TEXT,
    follow_up_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.school_inspections ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.school_inspections TO anon, authenticated;
CREATE POLICY "school_inspections_all" ON public.school_inspections FOR ALL USING (true) WITH CHECK (true);

-- 7. SYSTEM_BACKUPS (for backup history tracking)
CREATE TABLE IF NOT EXISTS public.system_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_type TEXT NOT NULL DEFAULT 'full',
    categories TEXT[],
    tables_included TEXT[],
    row_counts JSONB,
    format TEXT,
    file_name TEXT,
    storage_path TEXT,
    file_size_bytes BIGINT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.system_backups TO anon, authenticated;
CREATE POLICY "system_backups_all" ON public.system_backups FOR ALL USING (true) WITH CHECK (true);

-- 8. SUBJECT_COMBINATIONS (for A-Level combinations like PCM, BCM, HEG, MEG)
CREATE TABLE IF NOT EXISTS public.subject_combinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    principal_subjects TEXT[] DEFAULT '{}',
    subsidiary_subjects TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);
ALTER TABLE public.subject_combinations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.subject_combinations TO anon, authenticated;
CREATE POLICY "subject_combinations_all" ON public.subject_combinations FOR ALL USING (true) WITH CHECK (true);

-- 9. STUDENT_COMBINATIONS (links students to A-Level combinations)
CREATE TABLE IF NOT EXISTS public.student_combinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    combination_id UUID REFERENCES public.subject_combinations(id),
    academic_year TEXT NOT NULL,
    term TEXT,
    principal_subjects TEXT[] DEFAULT '{}',
    subsidiary_subjects TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, academic_year)
);
ALTER TABLE public.student_combinations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.student_combinations TO anon, authenticated;
CREATE POLICY "student_combinations_all" ON public.student_combinations FOR ALL USING (true) WITH CHECK (true);

-- 10. CONTINUOUS_ASSESSMENT (NCDC Competency-Based scoring)
CREATE TABLE IF NOT EXISTS public.continuous_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_id UUID REFERENCES public.school_classes(id),
    subject_id UUID REFERENCES public.subjects(id),
    term_id UUID REFERENCES public.academic_terms(id),
    assessment_type TEXT NOT NULL CHECK (assessment_type IN ('project', 'formative', 'summative', 'practical', 'homework', 'assignment', 'mid_term', 'end_of_term')),
    score NUMERIC,
    max_score NUMERIC DEFAULT 100,
    weight NUMERIC DEFAULT 100,
    feedback TEXT,
    assessed_by UUID REFERENCES auth.users(id),
    assessed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.continuous_assessments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.continuous_assessments TO anon, authenticated;
CREATE POLICY "continuous_assessments_all" ON public.continuous_assessments FOR ALL USING (true) WITH CHECK (true);

-- 11. Seed business modules for A-Level and NCDC features
INSERT INTO public.business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
VALUES
  ('subject_combinations', 'A-Level Combinations', 'Manage S5-S6 subject combinations (PCM, BCM, HEG, etc.)', 'BookOpen', 'school', ARRAY['secondary_school'], false, true, 75),
  ('continuous_assessment', 'NCDC Assessment', 'Continuous assessment scoring with A=5..E=1 grade scale', 'ClipboardCheck', 'school', ARRAY['secondary_school'], false, true, 76),
  ('olevel_enrollment', 'O-Level Enrollment', 'Subject-based threshold enrollment for O-Level progression', 'UserPlus', 'school', ARRAY['secondary_school'], false, true, 77)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description,
  icon = EXCLUDED.icon, category = EXCLUDED.category,
  applicable_business_types = EXCLUDED.applicable_business_types,
  is_active = EXCLUDED.is_active;

-- Verify
SELECT 'Migration complete' as status,
       (SELECT COUNT(*) FROM public.staff_role_assignments) as staff_role_assignments,
       (SELECT COUNT(*) FROM public.governing_bodies) as governing_bodies,
       (SELECT COUNT(*) FROM public.governing_body_members) as governing_body_members,
       (SELECT COUNT(*) FROM public.governing_body_meetings) as governing_body_meetings,
       (SELECT COUNT(*) FROM public.academic_departments) as academic_departments,
       (SELECT COUNT(*) FROM public.school_inspections) as school_inspections,
       (SELECT COUNT(*) FROM public.system_backups) as system_backups,
       (SELECT COUNT(*) FROM public.subject_combinations) as subject_combinations,
       (SELECT COUNT(*) FROM public.student_combinations) as student_combinations,
       (SELECT COUNT(*) FROM public.continuous_assessments) as continuous_assessments;
