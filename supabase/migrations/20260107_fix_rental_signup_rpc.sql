-- =====================================================
-- Fix Rental Signup Packages
-- =====================================================

-- 1. Create function to handle rental signup data
CREATE OR REPLACE FUNCTION public.create_rental_signup_data(
  p_tenant_id UUID,
  p_package_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_monthly_price NUMERIC;
BEGIN
  -- Get the base price from the package
  SELECT monthly_price INTO v_monthly_price
  FROM rental_packages
  WHERE id = p_package_id;

  INSERT INTO rental_subscriptions (
    tenant_id,
    package_id,
    monthly_amount,
    total_amount,
    payment_status,
    next_billing_date
  )
  VALUES (
    p_tenant_id,
    p_package_id,
    COALESCE(v_monthly_price, 0),
    COALESCE(v_monthly_price, 0),
    'pending',
    (CURRENT_DATE + INTERVAL '30 days')::DATE
  );
END;
$$;

-- 2. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_rental_signup_data(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_rental_signup_data(UUID, UUID) TO anon;

-- 3. Verify function exists
SELECT has_function_privilege('anon', 'create_rental_signup_data(UUID, UUID)', 'execute');
