-- Create a security definer function to link parent to student
-- This bypasses RLS since it runs with elevated privileges
CREATE OR REPLACE FUNCTION public.link_parent_to_student(
  p_parent_id UUID,
  p_student_id UUID,
  p_tenant_id UUID,
  p_relationship TEXT,
  p_is_primary_contact BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link_id UUID;
BEGIN
  INSERT INTO parent_students (
    parent_id,
    student_id,
    tenant_id,
    relationship,
    is_primary_contact
  ) VALUES (
    p_parent_id,
    p_student_id,
    p_tenant_id,
    p_relationship,
    p_is_primary_contact
  )
  RETURNING id INTO v_link_id;
  
  RETURN v_link_id;
END;
$$;