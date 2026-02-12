-- Drop existing INSERT policies on user_roles if they exist
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow admins to manage user roles" ON public.user_roles;

-- Create policy allowing admins/superadmins to insert user roles
CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Create policy for admins to update user roles
CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'admin')
);

-- Create policy for admins to delete user roles
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'superadmin') OR 
  public.has_role(auth.uid(), 'admin')
);