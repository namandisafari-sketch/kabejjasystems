-- GRANT explicit permissions to all roles on these tables

-- Grant to anon role (unauthenticated users)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_classes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_terms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO anon;

-- Grant to authenticated role (logged-in users)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_terms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;

-- Grant to public role (general access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_classes TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_terms TO public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO public;

-- Also grant on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, public;
