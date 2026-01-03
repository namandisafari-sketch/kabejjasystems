-- Drop all existing INSERT policies on tenants
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;

-- Create a simple permissive INSERT policy that allows any authenticated user
CREATE POLICY "Allow authenticated users to insert tenants" 
ON public.tenants 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also ensure the profiles INSERT policy is correct
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);