-- Add policy for tenant owners to view all profiles within their tenant
CREATE POLICY "Tenant owners can view tenant profiles"
ON public.profiles
FOR SELECT
USING (
  tenant_id = (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
  AND (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) = 'tenant_owner'
);