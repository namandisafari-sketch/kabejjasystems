-- =====================================================
-- Fix: Allow profile creation during signup
-- =====================================================
-- Problem: "permission denied for table profiles" during signup
-- Cause: RLS policy requires authentication, but signup happens before auth
-- Solution: Add policy to allow INSERT for new users during signup

-- Enable RLS if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON public.profiles;

-- Create new policy that allows both authenticated users AND new signups
-- This policy allows:
-- 1. Authenticated users to insert their own profile (auth.uid() = id)
-- 2. New users during signup (before they're fully authenticated)
CREATE POLICY "Allow profile creation during signup" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  -- Allow if user is authenticated and inserting their own profile
  (auth.uid() = id)
  OR
  -- Allow if this is a new signup (profile doesn't exist yet)
  (NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()))
);

-- Ensure UPDATE policy exists for authenticated users
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ensure SELECT policy exists
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Grant necessary permissions to authenticated and anon roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO anon;  -- Allow anon to insert during signup

-- Verify policies were created
SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;
