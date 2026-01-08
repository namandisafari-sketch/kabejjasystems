-- =====================================================
-- STEP 2: ADD PAYMENT TABLES (After base schema)
-- =====================================================

-- Subscription Packages Table
CREATE TABLE IF NOT EXISTS public.subscription_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Payments Table (for Pesapal transactions)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.subscription_packages(id),
  pesapal_tracking_id TEXT UNIQUE,
  pesapal_merchant_reference TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  confirmation_code TEXT,
  billing_email TEXT NOT NULL,
  billing_phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert Sample Subscription Packages
INSERT INTO public.subscription_packages (name, description, price_monthly, price_yearly, features) 
VALUES
  ('Starter', 'Perfect for small businesses', 50000, 540000, '["Up to 5 users", "Basic POS", "Sales reports"]'::jsonb),
  ('Professional', 'Ideal for growing businesses', 100000, 1080000, '["Up to 20 users", "Advanced POS", "Analytics"]'::jsonb),
  ('Enterprise', 'Complete solution', 200000, 2160000, '["Unlimited users", "All modules", "24/7 support"]'::jsonb)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_tracking_id ON public.payments(pesapal_tracking_id);

-- Enable RLS
ALTER TABLE public.subscription_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Packages viewable by authenticated users" ON public.subscription_packages;
CREATE POLICY "Packages viewable by authenticated users"
  ON public.subscription_packages FOR SELECT
  TO authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "Users can view tenant payments" ON public.payments;
CREATE POLICY "Users can view tenant payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create payments for their tenant" ON public.payments;
CREATE POLICY "Users can create payments for their tenant"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );
