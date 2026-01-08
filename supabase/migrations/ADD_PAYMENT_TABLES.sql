-- Add Payment Tables to Existing Database

CREATE TABLE public.subscription_packages (
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

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.subscription_packages(id),
  pesapal_tracking_id TEXT UNIQUE,
  pesapal_merchant_reference TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'UGX',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  billing_email TEXT NOT NULL,
  billing_phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.subscription_packages (name, description, price_monthly, price_yearly, features) VALUES
('Starter', 'Perfect for small businesses', 50000, 540000, '["Up to 5 users", "Basic POS", "Sales reports"]'::jsonb),
('Professional', 'Ideal for growing businesses', 100000, 1080000, '["Up to 20 users", "Advanced POS", "Analytics"]'::jsonb),
('Enterprise', 'Complete solution', 200000, 2160000, '["Unlimited users", "All modules", "24/7 support"]'::jsonb);
