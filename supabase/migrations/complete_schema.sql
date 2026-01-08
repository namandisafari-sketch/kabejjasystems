-- =====================================================
-- COMPLETE SUPABASE DATABASE SCHEMA FOR KABEJJA SYSTEMS
-- Run this entire SQL file in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. TENANTS TABLE (Organizations/Companies)
-- =====================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'expired', 'cancelled')),
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  is_trial BOOLEAN DEFAULT true,
  trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '14 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. PROFILES TABLE (Users)
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. SUBSCRIPTION PACKAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscription_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_cycle_months INTEGER NOT NULL DEFAULT 1,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. PAYMENTS TABLE (Pesapal Transactions)
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  package_id UUID REFERENCES subscription_packages(id),
  pesapal_tracking_id TEXT UNIQUE,
  pesapal_merchant_reference TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled', 'reversed')),
  payment_method TEXT,
  confirmation_code TEXT,
  billing_email TEXT NOT NULL,
  billing_phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_tracking_id ON payments(pesapal_tracking_id);
CREATE INDEX IF NOT EXISTS idx_payments_merchant_ref ON payments(pesapal_merchant_reference);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Tenants: Users can read their own tenant
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Tenants: Admins can update their own tenant
CREATE POLICY "Admins can update their tenant"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT tenant_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'superadmin')
    )
  );

-- Profiles: Users can view profiles in their tenant
CREATE POLICY "Users can view profiles in their tenant"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
    OR id = auth.uid()
  );

-- Profiles: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Subscription Packages: Readable by all authenticated users
CREATE POLICY "Packages are viewable by authenticated users"
  ON subscription_packages FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Payments: Users can view their tenant's payments
CREATE POLICY "Users can view tenant payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Payments: Users can create payments for their tenant
CREATE POLICY "Users can create payments for their tenant"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Payments: System can update payment status (handled via service role)
CREATE POLICY "System can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (true);

-- =====================================================
-- SAMPLE DATA: SUBSCRIPTION PACKAGES
-- =====================================================
INSERT INTO subscription_packages (name, description, price_monthly, price_yearly, billing_cycle_months, features) 
VALUES
  (
    'Starter',
    'Perfect for small businesses getting started',
    50000,
    540000,
    1,
    '["Up to 5 users", "Basic POS", "Inventory management", "Sales reports", "Email support"]'::jsonb
  ),
  (
    'Professional',
    'Ideal for growing businesses',
    100000,
    1080000,
    1,
    '["Up to 20 users", "Advanced POS", "Full inventory control", "Advanced analytics", "Restaurant & Salon modules", "Priority support", "Custom branding"]'::jsonb
  ),
  (
    'Enterprise',
    'Complete solution for large organizations',
    200000,
    2160000,
    1,
    '["Unlimited users", "All modules included", "School management", "Rental & repair tracking", "Multi-branch support", "API access", "Dedicated account manager", "24/7 support"]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- FUNCTIONS: Auto-update timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_packages_updated_at BEFORE UPDATE ON subscription_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMPLETE! Your Supabase database is now ready
-- =====================================================
