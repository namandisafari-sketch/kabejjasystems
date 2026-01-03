-- Drop and recreate the create_tenant_for_signup function to start users with a free trial
DROP FUNCTION IF EXISTS public.create_tenant_for_signup(text, text, text, text, text, uuid, text);

CREATE FUNCTION public.create_tenant_for_signup(
  p_name TEXT,
  p_business_type TEXT,
  p_address TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_package_id UUID,
  p_referred_by_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_trial_days INT := 14;
BEGIN
  INSERT INTO tenants (
    name, 
    business_type, 
    address, 
    phone, 
    email, 
    package_id, 
    referred_by_code, 
    status,
    is_trial,
    trial_days,
    trial_end_date,
    activated_at
  )
  VALUES (
    p_name, 
    p_business_type, 
    p_address, 
    p_phone, 
    p_email, 
    p_package_id, 
    p_referred_by_code, 
    'active',
    true,
    v_trial_days,
    (now() + (v_trial_days || ' days')::interval)::date,
    now()
  )
  RETURNING id INTO v_tenant_id;
  
  RETURN v_tenant_id;
END;
$$;