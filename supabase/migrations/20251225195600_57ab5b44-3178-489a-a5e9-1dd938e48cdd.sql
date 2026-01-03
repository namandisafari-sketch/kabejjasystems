-- Create a function to create academic term and school subscription for signup (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_school_signup_data(
  p_tenant_id UUID,
  p_package_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_term_id UUID;
  v_current_year INTEGER;
BEGIN
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  -- Create academic term
  INSERT INTO academic_terms (
    tenant_id,
    name,
    term_number,
    year,
    start_date,
    end_date,
    is_current
  )
  VALUES (
    p_tenant_id,
    'Term 1 ' || v_current_year,
    1,
    v_current_year,
    CURRENT_DATE,
    (v_current_year || '-12-31')::DATE,
    true
  )
  RETURNING id INTO v_term_id;
  
  -- Create school subscription
  INSERT INTO school_subscriptions (
    tenant_id,
    package_id,
    term_id,
    amount_paid,
    payment_status
  )
  VALUES (
    p_tenant_id,
    p_package_id,
    v_term_id,
    0,
    'pending'
  );
  
  RETURN v_term_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_school_signup_data(UUID, UUID) TO authenticated;