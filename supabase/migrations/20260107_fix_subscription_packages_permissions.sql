-- =====================================================
-- Fix: Grant public read access to subscription_packages
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE public.subscription_packages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can view subscription packages" ON public.subscription_packages;
DROP POLICY IF EXISTS "Allow public read access to active packages" ON public.subscription_packages;
DROP POLICY IF EXISTS "Public can view active packages" ON public.subscription_packages;

-- Create a new policy that allows ANYONE (including anon users) to view active packages
CREATE POLICY "Public can view active subscription packages" 
ON public.subscription_packages 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);

-- Grant necessary permissions to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.subscription_packages TO anon, authenticated;

-- Verify the policy was created
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'subscription_packages';
