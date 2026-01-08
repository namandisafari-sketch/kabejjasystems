-- =====================================================
-- KABEJJA SYSTEMS - COMPLETE DATABASE SCHEMA
-- Properly ordered for Supabase execution
-- Run this entire SQL file in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Enable Required Extensions
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- STEP 2: Create Custom Types (ENUMs)
-- =====================================================
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM (
        'superadmin',
        'admin',
        'tenant_owner',
        'branch_manager',
        'staff',
        'accountant',
        'marketer',
        'customer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_status AS ENUM (
        'pending',
        'approved',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.tenant_status AS ENUM (
        'pending',
        'active',
        'suspended',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- STEP 3: Create Base Tables (No Foreign Keys)
-- =====================================================

-- Packages table (no dependencies)
CREATE TABLE IF NOT EXISTS public.packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    price numeric(10,2) NOT NULL,
    currency text DEFAULT 'UGX'::text,
    user_limit integer DEFAULT 5,
    modules_allowed jsonb DEFAULT '[]'::jsonb,
    validity_days integer DEFAULT 30,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Tenants table (references packages)
CREATE TABLE IF NOT EXISTS public.tenants (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    business_type text,
    address text,
    phone text,
    email text,
    package_id uuid REFERENCES public.packages(id),
    status public.tenant_status DEFAULT 'pending'::public.tenant_status,
    referral_code text UNIQUE,
    referred_by_code text,
    activated_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Profiles table (references tenants)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL PRIMARY KEY,
    tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
    role public.app_role DEFAULT 'customer'::public.app_role,
    full_name text,
    phone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Branches table
CREATE TABLE IF NOT EXISTS public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    location text,
    phone text,
    email text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text,
    phone text,
    address text,
    customer_type text DEFAULT 'retail'::text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    sku text,
    description text,
    category text,
    unit_price numeric(10,2) DEFAULT 0 NOT NULL,
    cost_price numeric(10,2),
    stock_quantity integer DEFAULT 0,
    min_stock_level integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Sales table
CREATE TABLE IF NOT EXISTS public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    customer_id uuid REFERENCES public.customers(id),
    sale_date timestamp with time zone DEFAULT now(),
    total_amount numeric(10,2) DEFAULT 0 NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    payment_method text,
    payment_status text DEFAULT 'paid'::text,
    notes text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Sale items table
CREATE TABLE IF NOT EXISTS public.sale_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id),
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- Marketers table
CREATE TABLE IF NOT EXISTS public.marketers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid,
    name text NOT NULL,
    phone text,
    email text,
    referral_code text NOT NULL UNIQUE,
    daily_rate numeric(10,2) DEFAULT 0,
    total_referrals integer DEFAULT 0,
    approved_signups integer DEFAULT 0,
    total_earned numeric(10,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Payment uploads table
CREATE TABLE IF NOT EXISTS public.payment_uploads (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    uploader_id uuid NOT NULL,
    package_id uuid NOT NULL REFERENCES public.packages(id),
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'UGX'::text,
    payment_method text,
    transaction_ref text,
    receipt_url text,
    status public.payment_status DEFAULT 'pending'::public.payment_status,
    admin_notes text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

-- Settings table
CREATE TABLE IF NOT EXISTS public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    key text NOT NULL UNIQUE,
    value text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    actor_id uuid,
    tenant_id uuid REFERENCES public.tenants(id),
    action text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);

-- Subscription packages (for Pesapal)
CREATE TABLE IF NOT EXISTS public.subscription_packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    description text,
    price_monthly numeric(10,2) NOT NULL DEFAULT 0,
    price_yearly numeric(10,2) NOT NULL DEFAULT 0,
    billing_cycle_months integer NOT NULL DEFAULT 1,
    features jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Payments table (Pesapal)
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    package_id uuid REFERENCES public.subscription_packages(id),
    pesapal_tracking_id text UNIQUE,
    pesapal_merchant_reference text UNIQUE NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency text NOT NULL DEFAULT 'UGX',
    payment_status text NOT NULL DEFAULT 'pending',
    billing_email text NOT NULL,
    billing_phone text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- =====================================================
-- STEP 4: Create Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_branches_tenant ON public.branches USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items USING btree (sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales USING btree (sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_tenant ON public.sales USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON public.payments USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments USING btree (payment_status);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants USING btree (status);

-- =====================================================
-- STEP 5: Create Functions (AFTER tables exist)
-- =====================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Generate referral code function
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    code := 'KBT' || UPPER(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM tenants WHERE referral_code = code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN code;
END;
$$;

-- Set tenant referral code trigger function
CREATE OR REPLACE FUNCTION public.set_tenant_referral_code()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

-- Check if user has role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id 
    AND role IN ('superadmin', 'admin')
  );
$$;

-- =====================================================
-- STEP 6: Create Triggers
-- =====================================================
DROP TRIGGER IF EXISTS update_tenants_updated_at ON public.tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_tenant_referral_code_trigger ON public.tenants;
CREATE TRIGGER set_tenant_referral_code_trigger BEFORE INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_referral_code();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_packages_updated_at ON public.packages;
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_branches_updated_at ON public.branches;
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON public.customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_marketers_updated_at ON public.marketers;
CREATE TRIGGER update_marketers_updated_at BEFORE UPDATE ON public.marketers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_packages_updated_at ON public.subscription_packages;
CREATE TRIGGER update_subscription_packages_updated_at BEFORE UPDATE ON public.subscription_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- STEP 7: Enable Row Level Security
-- =====================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 8: Create RLS Policies
-- =====================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

-- Tenants policies
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;
CREATE POLICY "Authenticated users can create tenants" ON public.tenants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Tenant owners can view their tenant" ON public.tenants;
CREATE POLICY "Tenant owners can view their tenant" ON public.tenants
  FOR SELECT USING (
    id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage all tenants" ON public.tenants;
CREATE POLICY "Admins can manage all tenants" ON public.tenants
  USING (public.is_admin(auth.uid()));

-- Packages policies
DROP POLICY IF EXISTS "Anyone can view active packages" ON public.packages;
CREATE POLICY "Anyone can view active packages" ON public.packages
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage packages" ON public.packages;
CREATE POLICY "Admins can manage packages" ON public.packages
  USING (public.is_admin(auth.uid()));

-- Subscription packages policies
DROP POLICY IF EXISTS "Anyone can view subscription packages" ON public.subscription_packages;
CREATE POLICY "Anyone can view subscription packages" ON public.subscription_packages
  FOR SELECT USING (is_active = true);

-- Products policies
DROP POLICY IF EXISTS "Users can view their tenant products" ON public.products;
CREATE POLICY "Users can view their tenant products" ON public.products
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert products for their tenant" ON public.products;
CREATE POLICY "Users can insert products for their tenant" ON public.products
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their tenant products" ON public.products;
CREATE POLICY "Users can update their tenant products" ON public.products
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their tenant products" ON public.products;
CREATE POLICY "Users can delete their tenant products" ON public.products
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Sales policies
DROP POLICY IF EXISTS "Users can view their tenant sales" ON public.sales;
CREATE POLICY "Users can view their tenant sales" ON public.sales
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert sales for their tenant" ON public.sales;
CREATE POLICY "Users can insert sales for their tenant" ON public.sales
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their tenant sales" ON public.sales;
CREATE POLICY "Users can update their tenant sales" ON public.sales
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Sale items policies
DROP POLICY IF EXISTS "Users can view sale items" ON public.sale_items;
CREATE POLICY "Users can view sale items" ON public.sale_items
  FOR SELECT USING (sale_id IN (
    SELECT id FROM sales WHERE tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  ));

DROP POLICY IF EXISTS "Users can insert sale items" ON public.sale_items;
CREATE POLICY "Users can insert sale items" ON public.sale_items
  FOR INSERT WITH CHECK (sale_id IN (
    SELECT id FROM sales WHERE tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Customers policies
DROP POLICY IF EXISTS "Users can view their tenant customers" ON public.customers;
CREATE POLICY "Users can view their tenant customers" ON public.customers
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert customers for their tenant" ON public.customers;
CREATE POLICY "Users can insert customers for their tenant" ON public.customers
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their tenant customers" ON public.customers;
CREATE POLICY "Users can update their tenant customers" ON public.customers
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their tenant customers" ON public.customers;
CREATE POLICY "Users can delete their tenant customers" ON public.customers
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Branches policies
DROP POLICY IF EXISTS "Users can view their tenant branches" ON public.branches;
CREATE POLICY "Users can view their tenant branches" ON public.branches
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert branches for their tenant" ON public.branches;
CREATE POLICY "Users can insert branches for their tenant" ON public.branches
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their tenant branches" ON public.branches;
CREATE POLICY "Users can update their tenant branches" ON public.branches
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their tenant branches" ON public.branches;
CREATE POLICY "Users can delete their tenant branches" ON public.branches
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Marketers policies
DROP POLICY IF EXISTS "Marketers can view their own data" ON public.marketers;
CREATE POLICY "Marketers can view their own data" ON public.marketers
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage marketers" ON public.marketers;
CREATE POLICY "Admins can manage marketers" ON public.marketers
  USING (public.is_admin(auth.uid()));

-- Payment uploads policies
DROP POLICY IF EXISTS "Tenant owners can upload payments" ON public.payment_uploads;
CREATE POLICY "Tenant owners can upload payments" ON public.payment_uploads
  FOR INSERT WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM profiles 
    WHERE id = auth.uid() AND role = 'tenant_owner'
  ));

DROP POLICY IF EXISTS "Users can view their tenant payments" ON public.payment_uploads;
CREATE POLICY "Users can view their tenant payments" ON public.payment_uploads
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payment_uploads;
CREATE POLICY "Admins can manage all payments" ON public.payment_uploads
  USING (public.is_admin(auth.uid()));

-- Payments policies (Pesapal)
DROP POLICY IF EXISTS "Users can view tenant payments" ON public.payments;
CREATE POLICY "Users can view tenant payments" ON public.payments
  FOR SELECT TO authenticated USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create payments for their tenant" ON public.payments;
CREATE POLICY "Users can create payments for their tenant" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "System can update payments" ON public.payments;
CREATE POLICY "System can update payments" ON public.payments
  FOR UPDATE TO authenticated USING (true);

-- Settings policies
DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;
CREATE POLICY "Anyone can view settings" ON public.settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;
CREATE POLICY "Admins can manage settings" ON public.settings
  USING (public.is_admin(auth.uid()));

-- Audit logs policies
DROP POLICY IF EXISTS "Admins can view all logs" ON public.audit_logs;
CREATE POLICY "Admins can view all logs" ON public.audit_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

-- User roles policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Superadmins can view all roles" ON public.user_roles;
CREATE POLICY "Superadmins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));

DROP POLICY IF EXISTS "Superadmins can insert roles" ON public.user_roles;
CREATE POLICY "Superadmins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'superadmin'));

-- =====================================================
-- STEP 9: Insert Sample Data
-- =====================================================

-- Insert default packages
INSERT INTO public.packages (name, description, price, currency, user_limit, validity_days, is_active) VALUES
('Starter', 'Perfect for small businesses getting started', 50000, 'UGX', 5, 30, true),
('Professional', 'Ideal for growing businesses', 100000, 'UGX', 20, 30, true),
('Enterprise', 'Complete solution for large organizations', 200000, 'UGX', 100, 30, true)
ON CONFLICT DO NOTHING;

-- Insert subscription packages (for Pesapal)
INSERT INTO public.subscription_packages (name, description, price_monthly, price_yearly, features, is_active) VALUES
('Starter', 'Perfect for small businesses', 50000, 540000, '["Up to 5 users", "Basic POS", "Inventory management", "Sales reports", "Email support"]', true),
('Professional', 'Ideal for growing businesses', 100000, 1080000, '["Up to 20 users", "Advanced POS", "Full inventory control", "Advanced analytics", "Restaurant & Salon modules", "Priority support", "Custom branding"]', true),
('Enterprise', 'Complete solution for large organizations', 200000, 2160000, '["Unlimited users", "All modules included", "School management", "Rental & repair tracking", "Multi-branch support", "API access", "Dedicated account manager", "24/7 support"]', true)
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMPLETE! Your database is now ready.
-- Total tables created: 15
-- =====================================================
-- Tables:
-- 1. packages
-- 2. tenants
-- 3. profiles
-- 4. user_roles
-- 5. branches
-- 6. customers
-- 7. products
-- 8. sales
-- 9. sale_items
-- 10. marketers
-- 11. payment_uploads
-- 12. settings
-- 13. audit_logs
-- 14. subscription_packages
-- 15. payments
-- =====================================================
