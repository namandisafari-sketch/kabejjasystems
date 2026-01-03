-- Drop the problematic policy
DROP POLICY IF EXISTS "Tenant owners can view tenant profiles" ON public.profiles;

-- Create a security definer function to get user's tenant_id and role
CREATE OR REPLACE FUNCTION public.get_user_tenant_info(user_id uuid)
RETURNS TABLE(tenant_id uuid, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.tenant_id, p.role::text 
  FROM public.profiles p 
  WHERE p.id = user_id
$$;

-- Create proper policy for tenant owners to view profiles in their tenant
CREATE POLICY "Tenant owners can view tenant profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.get_user_tenant_info(auth.uid()) AS u
    WHERE u.role = 'tenant_owner' 
    AND profiles.tenant_id = u.tenant_id
  )
);