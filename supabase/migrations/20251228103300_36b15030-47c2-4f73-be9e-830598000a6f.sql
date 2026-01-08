-- Drop and recreate policies to ensure INSERT works correctly
DROP POLICY IF EXISTS "Staff can manage parent-student links" ON parent_students;

-- Create separate policies for each operation
CREATE POLICY "Staff can view parent-student links" 
ON parent_students 
FOR SELECT 
USING (tenant_id IN (
  SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
));

CREATE POLICY "Staff can insert parent-student links" 
ON parent_students 
FOR INSERT 
WITH CHECK (tenant_id IN (
  SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
));

CREATE POLICY "Staff can update parent-student links" 
ON parent_students 
FOR UPDATE 
USING (tenant_id IN (
  SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
));

CREATE POLICY "Staff can delete parent-student links" 
ON parent_students 
FOR DELETE 
USING (tenant_id IN (
  SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
));