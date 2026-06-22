-- Fix permissions for school_subjects and create missing tables

-- ============================================================
-- 1. Fix school_subjects permissions (permission denied)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_subjects TO anon, authenticated, public;

-- ============================================================
-- 2. Create exam_types table (missing)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exam_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    weight NUMERIC DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_types TO anon, authenticated, public;
CREATE POLICY "exam_types_all" ON public.exam_types FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Create school_assets table (missing)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.school_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    value NUMERIC DEFAULT 0,
    quantity INTEGER DEFAULT 1,
    status TEXT DEFAULT 'available',
    location TEXT,
    acquired_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_assets ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_assets TO anon, authenticated, public;
CREATE POLICY "school_assets_all" ON public.school_assets FOR ALL TO public USING (true) WITH CHECK (true);

-- ============================================================
-- 4. Add address fields to students table
-- ============================================================
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS county TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS subcounty TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parish TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS village TEXT;

-- ============================================================
-- 5. Also fix other school_ tables that might have permission issues
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_classes TO anon, authenticated, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_terms TO anon, authenticated, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_buildings TO anon, authenticated, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_attendance TO anon, authenticated, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_fees TO anon, authenticated, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_grades TO anon, authenticated, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_report_cards TO anon, authenticated, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_results TO anon, authenticated, public;

-- Ensure all these tables have basic RLS policies if they have RLS enabled
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('school_classes', 'academic_terms', 'school_buildings', 'student_attendance', 'student_fees', 'student_grades', 'student_report_cards', 'exam_results')
    LOOP
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname=tbl AND relrowsecurity=true) THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tbl||'_all', tbl);
            EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO public USING (true) WITH CHECK (true)', tbl||'_all', tbl);
        END IF;
    END LOOP;
END;
$$;
