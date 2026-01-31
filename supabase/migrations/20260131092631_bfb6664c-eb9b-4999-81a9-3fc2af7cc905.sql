-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Superadmins can insert roles" ON public.user_roles;

-- Create a new INSERT policy that allows both superadmins and admins to insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'superadmin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Also add UPDATE and DELETE policies for admin management
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Update SELECT policy to allow admins to view all roles
DROP POLICY IF EXISTS "Superadmins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'superadmin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  user_id = auth.uid()
);