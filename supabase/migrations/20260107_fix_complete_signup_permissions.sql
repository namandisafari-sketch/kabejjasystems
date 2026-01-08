-- =====================================================
-- Complete Signup Permissions Fix
-- =====================================================
-- Problem: Signup fails with "permission denied" for profiles OR user_roles
-- Solution: Grant INSERT permissions to all signup-related tables

-- 1. FIX PROFILES TABLE
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.profiles;
CREATE POLICY "Allow profile creation during signup" 
ON public.profiles 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);  -- Allow all inserts during signup, validation done in app

DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
CREATE POLICY "Users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id OR role = 'superadmin');

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 2. FIX USER_ROLES TABLE
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow role creation during signup" ON public.user_roles;
CREATE POLICY "Allow role creation during signup" 
ON public.user_roles 
FOR INSERT 
TO anon, authenticated
WITH CHECK (true);  -- Allow all inserts during signup

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- 3. GRANT NECESSARY PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON public.profiles TO anon, authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.user_roles TO anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- 4. VERIFY POLICIES
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies 
WHERE tablename IN ('profiles', 'user_roles')
ORDER BY tablename, cmd;
