
-- Create subscription_packages table
CREATE TABLE IF NOT EXISTS public.subscription_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC NOT NULL DEFAULT 0,
  price_yearly NUMERIC NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  billing_cycle_months INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.subscription_packages(id),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'UGX',
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  confirmation_code TEXT,
  billing_email TEXT,
  billing_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create device_fingerprints table
CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_agent TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  language TEXT,
  platform TEXT,
  trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  trial_ended_at TIMESTAMP WITH TIME ZONE,
  is_blocked BOOLEAN DEFAULT false,
  blocked_at TIMESTAMP WITH TIME ZONE,
  block_reason TEXT,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add email column to profiles if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
END $$;

-- Create check_device_trial_status function
CREATE OR REPLACE FUNCTION public.check_device_trial_status(p_device_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_device RECORD;
BEGIN
  SELECT * INTO v_device FROM device_fingerprints WHERE device_id = p_device_id;
  
  IF v_device IS NULL THEN
    RETURN jsonb_build_object('exists', false, 'blocked', false);
  END IF;
  
  RETURN jsonb_build_object(
    'exists', true,
    'blocked', COALESCE(v_device.is_blocked, false),
    'tenant_id', v_device.tenant_id,
    'trial_started_at', v_device.trial_started_at
  );
END;
$$;

-- Create create_rental_signup_data function
CREATE OR REPLACE FUNCTION public.create_rental_signup_data(p_tenant_id UUID, p_package_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For rental businesses, we just return the tenant_id as there's no special setup needed
  RETURN p_tenant_id;
END;
$$;

-- Enable RLS on new tables
ALTER TABLE public.subscription_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_fingerprints ENABLE ROW LEVEL SECURITY;

-- RLS for subscription_packages (public read)
CREATE POLICY "Anyone can view active packages" ON public.subscription_packages
  FOR SELECT USING (is_active = true);

-- RLS for payments
CREATE POLICY "Users can view own tenant payments" ON public.payments
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert own tenant payments" ON public.payments
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own tenant payments" ON public.payments
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS for device_fingerprints (service role only, but allow public insert for tracking)
CREATE POLICY "Allow insert for device tracking" ON public.device_fingerprints
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select own device" ON public.device_fingerprints
  FOR SELECT USING (true);

CREATE POLICY "Allow update own device" ON public.device_fingerprints
  FOR UPDATE USING (true);

-- Seed subscription packages
INSERT INTO public.subscription_packages (name, description, price_monthly, price_yearly, features, billing_cycle_months)
VALUES 
  ('Starter', 'Perfect for small businesses', 50000, 500000, '["Up to 100 products", "1 user", "Basic reports"]', 1),
  ('Professional', 'For growing businesses', 100000, 1000000, '["Unlimited products", "5 users", "Advanced reports", "Priority support"]', 1),
  ('Enterprise', 'For large organizations', 250000, 2500000, '["Everything in Pro", "Unlimited users", "Custom integrations", "Dedicated support"]', 1)
ON CONFLICT DO NOTHING;
