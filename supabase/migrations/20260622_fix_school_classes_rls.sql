-- Comprehensive fix for school_classes RLS permissions
-- Issue: Users cannot insert school_classes due to RLS policy failure
-- Root cause: User profile's tenant_id might be NULL or admin user needs special handling

-- Step 1: Review and update the INSERT policy to be more lenient for admins
DROP POLICY IF EXISTS "Users can insert classes for their tenant" ON public.school_classes;

CREATE POLICY "Users can insert classes for their tenant" ON public.school_classes 
  FOR INSERT WITH CHECK (
    -- Regular users: must match their tenant_id
    (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND tenant_id IS NOT NULL)
    OR
    -- Admins/superadmins: can insert for any tenant
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- Step 2: Ensure UPDATE policy also allows admins
DROP POLICY IF EXISTS "Users can update their tenant classes" ON public.school_classes;

CREATE POLICY "Users can update their tenant classes" ON public.school_classes 
  FOR UPDATE USING (
    (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND tenant_id IS NOT NULL)
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- Step 3: Ensure DELETE policy also allows admins
DROP POLICY IF EXISTS "Users can delete their tenant classes" ON public.school_classes;

CREATE POLICY "Users can delete their tenant classes" ON public.school_classes 
  FOR DELETE USING (
    (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND tenant_id IS NOT NULL)
    OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin'))
  );

-- Step 4: Keep the SELECT policy as is since it's already working
-- DROP POLICY IF EXISTS "Users can view their tenant classes" ON public.school_classes;
-- (This one should remain unchanged)
