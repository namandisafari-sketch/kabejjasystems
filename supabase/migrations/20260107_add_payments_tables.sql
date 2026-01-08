-- Create subscription packages table
CREATE TABLE IF NOT EXISTS subscription_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
  billing_cycle_months INTEGER NOT NULL DEFAULT 1,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_tracking_id ON payments(pesapal_tracking_id);
CREATE INDEX IF NOT EXISTS idx_payments_merchant_ref ON payments(pesapal_merchant_reference);

-- Insert sample subscription packages
INSERT INTO subscription_packages (name, description, price_monthly, price_yearly, billing_cycle_months, features) VALUES
('Starter', 'Perfect for small businesses getting started', 50000, 540000, 1, '["Up to 5 users", "Basic POS", "Inventory management", "Sales reports", "Email support"]'::jsonb),
('Professional', 'Ideal for growing businesses', 100000, 1080000, 1, '["Up to 20 users", "Advanced POS", "Full inventory control", "Advanced analytics", "Restaurant & Salon modules", "Priority support", "Custom branding"]'::jsonb),
('Enterprise', 'Complete solution for large organizations', 200000, 2160000, 1, '["Unlimited users", "All modules included", "School management", "Rental & repair tracking", "Multi-branch support", "API access", "Dedicated account manager", "24/7 support"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Add RLS (Row Level Security) policies
ALTER TABLE subscription_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Packages are readable by all authenticated users
CREATE POLICY "Packages are viewable by authenticated users"
  ON subscription_packages FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Payments are only viewable by tenant members and admins
CREATE POLICY "Payments viewable by tenant members"
  ON payments FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('superadmin', 'admin')
    )
  );

-- Payments can be inserted by authenticated users
CREATE POLICY "Users can create payments for their tenant"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Only system/admins can update payments (via backend functions)
CREATE POLICY "Admins can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('superadmin', 'admin')
    )
  );
