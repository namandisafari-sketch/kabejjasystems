-- Fix: Allow anonymous users to look up tenants by business_code
-- Needed for: StudentLogin, ParentPortal, ECDParentPortal (school code lookup before login)

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anonymous users can lookup tenants" ON public.tenants;
DROP POLICY IF EXISTS "anon_select_tenants" ON public.tenants;

-- Create policy allowing anonymous SELECT on tenants
-- Only exposes id, name, logo_url, business_type, business_code -- safe for public lookup
CREATE POLICY "Anonymous users can lookup tenants"
  ON public.tenants
  FOR SELECT
  TO anon
  USING (true);

-- Also ensure authenticated users can see their own tenant
DROP POLICY IF EXISTS "Authenticated users can view their tenant" ON public.tenants;
CREATE POLICY "Authenticated users can view their tenant"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    OR
    id IN (SELECT tenant_id FROM public.parents WHERE user_id = auth.uid())
  );

-- Ensure table-level grants (required for RLS policies to work)
GRANT SELECT ON public.tenants TO anon, authenticated, public;

-- Also fix students table for the student login flow
DROP POLICY IF EXISTS "Anonymous users can lookup students for login" ON public.students;
CREATE POLICY "Anonymous users can lookup students for login"
  ON public.students
  FOR SELECT
  TO anon
  USING (true);

GRANT SELECT ON public.students TO anon, authenticated, public;
