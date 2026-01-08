-- Create rental packages table for tier-based pricing
CREATE TABLE public.rental_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  -- Tier limits
  max_properties INTEGER NOT NULL DEFAULT 5,
  max_units INTEGER NOT NULL DEFAULT 20,
  -- Base pricing (monthly)
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  -- Per-user add-on pricing
  included_users INTEGER NOT NULL DEFAULT 1,
  price_per_additional_user NUMERIC NOT NULL DEFAULT 10000,
  -- Features
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rental subscriptions table to track landlord subscriptions
CREATE TABLE public.rental_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.rental_packages(id),
  -- Current usage
  current_properties INTEGER DEFAULT 0,
  current_units INTEGER DEFAULT 0,
  additional_users INTEGER DEFAULT 0,
  -- Billing
  monthly_amount NUMERIC NOT NULL DEFAULT 0,
  addon_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  next_billing_date DATE,
  -- Status
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.rental_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for rental_packages (viewable by all, managed by admins)
CREATE POLICY "Anyone can view active rental packages"
  ON public.rental_packages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage rental packages"
  ON public.rental_packages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('superadmin', 'admin')
  ));

-- RLS policies for rental_subscriptions
CREATE POLICY "Users can view their tenant subscription"
  ON public.rental_subscriptions FOR SELECT
  USING (tenant_id IN (
    SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
  ));

CREATE POLICY "Users can update their tenant subscription"
  ON public.rental_subscriptions FOR UPDATE
  USING (tenant_id IN (
    SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
  ));

CREATE POLICY "Admins can manage all rental subscriptions"
  ON public.rental_subscriptions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('superadmin', 'admin')
  ));

-- Insert default rental packages
INSERT INTO public.rental_packages (name, description, max_properties, max_units, monthly_price, included_users, price_per_additional_user, features, display_order) VALUES
('Starter', 'Perfect for individual landlords', 3, 10, 50000, 1, 15000, '["Property tracking", "Tenant management", "Rent collection", "Basic reports"]', 1),
('Growth', 'For growing portfolios', 10, 50, 150000, 2, 12000, '["All Starter features", "Lease management", "Maintenance tracking", "Financial reports", "Email notifications"]', 2),
('Professional', 'For property managers', 25, 150, 350000, 5, 10000, '["All Growth features", "Multiple property managers", "Advanced analytics", "Automated reminders", "Priority support"]', 3),
('Enterprise', 'For large portfolios', 100, 500, 750000, 10, 8000, '["All Professional features", "Unlimited staff users", "API access", "Custom branding", "Dedicated support"]', 4);

-- Add indexes
CREATE INDEX idx_rental_subscriptions_tenant ON public.rental_subscriptions(tenant_id);
CREATE INDEX idx_rental_subscriptions_status ON public.rental_subscriptions(status);
CREATE INDEX idx_rental_packages_active ON public.rental_packages(is_active, display_order);