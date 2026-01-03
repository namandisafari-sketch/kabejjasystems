-- Create a function to create tenant that bypasses RLS
CREATE OR REPLACE FUNCTION public.create_tenant_for_signup(
  p_name TEXT,
  p_business_type TEXT,
  p_address TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_package_id UUID DEFAULT NULL,
  p_referred_by_code TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  INSERT INTO tenants (name, business_type, address, phone, email, package_id, referred_by_code, status)
  VALUES (p_name, p_business_type, p_address, p_phone, p_email, p_package_id, p_referred_by_code, 'pending')
  RETURNING id INTO v_tenant_id;
  
  RETURN v_tenant_id;
END;
$$;

-- Create a function to create profile that bypasses RLS
CREATE OR REPLACE FUNCTION public.create_profile_for_signup(
  p_user_id UUID,
  p_tenant_id UUID,
  p_full_name TEXT,
  p_phone TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, tenant_id, role, full_name, phone)
  VALUES (p_user_id, p_tenant_id, 'tenant_owner', p_full_name, p_phone);
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_tenant_for_signup TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_profile_for_signup TO authenticated;