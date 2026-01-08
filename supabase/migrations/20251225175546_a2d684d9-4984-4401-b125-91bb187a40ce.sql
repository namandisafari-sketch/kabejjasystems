-- Drop the restrictive admin policy and recreate as permissive
DROP POLICY IF EXISTS "Admins can manage all tenants" ON public.tenants;

-- Create permissive admin policy for all operations
CREATE POLICY "Admins can manage all tenants" 
ON public.tenants 
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('superadmin', 'admin')
  )
);

-- Also fix the profiles admin policy to be permissive
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));