-- =============================================
-- COMPLETE DATABASE SETUP FOR BIZTRACK
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- CUSTOM TYPES
-- =============================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'tenant_owner', 'staff', 'parent', 'renter');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- CORE TABLES
-- =============================================

-- Packages table
CREATE TABLE IF NOT EXISTS public.packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  yearly_price NUMERIC,
  features JSONB,
  max_users INTEGER DEFAULT 5,
  max_branches INTEGER DEFAULT 1,
  max_products INTEGER,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  business_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  business_type TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  package_id UUID REFERENCES public.packages(id),
  status TEXT DEFAULT 'pending',
  is_trial BOOLEAN DEFAULT true,
  trial_days INTEGER DEFAULT 14,
  trial_end_date DATE,
  activated_at TIMESTAMPTZ,
  subscription_end_date DATE,
  referral_code TEXT UNIQUE,
  referred_by_code TEXT,
  business_code TEXT UNIQUE,
  parent_login_code TEXT UNIQUE,
  renter_login_code TEXT UNIQUE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id),
  role TEXT DEFAULT 'staff',
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}',
  branch_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Branches table
CREATE TABLE IF NOT EXISTS public.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  phone TEXT,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- PRODUCTS & INVENTORY
-- =============================================

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  barcode TEXT,
  cost_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- CUSTOMERS & SALES
-- =============================================

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  credit_limit NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  order_number INTEGER,
  total NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'completed',
  sold_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RENTAL MANAGEMENT
-- =============================================

CREATE TABLE IF NOT EXISTS public.rental_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  property_type TEXT DEFAULT 'apartment',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rental_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  unit_type TEXT DEFAULT 'residential',
  bedrooms INTEGER,
  bathrooms INTEGER,
  monthly_rent NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'available',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rental_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.rental_units(id) ON DELETE CASCADE,
  rental_tenant_id UUID NOT NULL REFERENCES public.rental_tenants(id) ON DELETE CASCADE,
  lease_number TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent NUMERIC NOT NULL,
  payment_due_day INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  outstanding_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rental_id_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rental_tenant_id UUID NOT NULL REFERENCES public.rental_tenants(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.rental_units(id),
  card_number TEXT NOT NULL,
  qr_code_data TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rental_payment_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  card_id UUID REFERENCES public.rental_id_cards(id),
  lease_id UUID REFERENCES public.leases(id),
  payer_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  payment_provider TEXT,
  transaction_reference TEXT,
  payment_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role IN ('superadmin', 'admin'));
$$;

-- =============================================
-- ENABLE RLS
-- =============================================

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_id_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_payment_proofs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

CREATE POLICY "Packages viewable by all" ON public.packages FOR SELECT USING (true);
CREATE POLICY "Profiles access" ON public.profiles FOR ALL USING (id = auth.uid() OR is_admin(auth.uid()));
CREATE POLICY "Allow profile creation" ON public.profiles FOR INSERT WITH CHECK (true);

-- Tenant-based policies
CREATE POLICY "Tenant access" ON public.tenants FOR SELECT USING (id = get_user_tenant_id() OR is_admin(auth.uid()));
CREATE POLICY "Branches access" ON public.branches FOR ALL USING (tenant_id = get_user_tenant_id() OR is_admin(auth.uid()));
CREATE POLICY "Products access" ON public.products FOR ALL USING (tenant_id = get_user_tenant_id() OR is_admin(auth.uid()));
CREATE POLICY "Customers access" ON public.customers FOR ALL USING (tenant_id = get_user_tenant_id() OR is_admin(auth.uid()));
CREATE POLICY "Sales access" ON public.sales FOR ALL USING (tenant_id = get_user_tenant_id() OR is_admin(auth.uid()));
CREATE POLICY "Rental properties access" ON public.rental_properties FOR ALL USING (tenant_id = get_user_tenant_id() OR is_admin(auth.uid()));
CREATE POLICY "Rental units access" ON public.rental_units FOR ALL USING (tenant_id = get_user_tenant_id() OR is_admin(auth.uid()));
CREATE POLICY "Rental tenants access" ON public.rental_tenants FOR ALL USING (tenant_id = get_user_tenant_id() OR is_admin(auth.uid()));
CREATE POLICY "Leases access" ON public.leases FOR ALL USING (tenant_id = get_user_tenant_id() OR is_admin(auth.uid()));
CREATE POLICY "Rental ID cards access" ON public.rental_id_cards FOR ALL USING (tenant_id = get_user_tenant_id() OR is_admin(auth.uid()));
CREATE POLICY "Payment proofs access" ON public.rental_payment_proofs FOR ALL USING (tenant_id = get_user_tenant_id() OR is_admin(auth.uid()));

-- =============================================
-- SEED DATA
-- =============================================

INSERT INTO public.packages (name, description, monthly_price, max_users, max_branches, business_type, display_order)
VALUES 
  ('Starter', 'Perfect for small businesses', 50000, 3, 1, 'retail', 1),
  ('Professional', 'For growing businesses', 100000, 10, 3, 'retail', 2),
  ('Rental Basic', 'For small landlords', 50000, 3, 1, 'rental', 1)
ON CONFLICT DO NOTHING;

SELECT 'Database setup complete!' as status;
