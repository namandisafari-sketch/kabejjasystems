CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

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


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


--
-- Name: tenant_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tenant_status AS ENUM (
    'pending',
    'active',
    'suspended',
    'rejected'
);


--
-- Name: generate_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.generate_referral_code() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := 'KBT' || UPPER(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM tenants WHERE referral_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id 
    AND role IN ('superadmin', 'admin')
  );
$$;


--
-- Name: register_platform_admin(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.register_platform_admin(admin_email text, admin_password text, admin_name text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- This function should be called after the user signs up via Supabase Auth
  -- We'll just update their profile here
  
  -- Find the user by email
  SELECT id INTO new_user_id
  FROM auth.users
  WHERE email = admin_email;
  
  IF new_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User must sign up first through the normal signup flow'
    );
  END IF;
  
  -- Update or insert their profile as superadmin with no tenant
  INSERT INTO profiles (id, full_name, role, tenant_id)
  VALUES (new_user_id, admin_name, 'superadmin', NULL)
  ON CONFLICT (id) 
  DO UPDATE SET 
    role = 'superadmin',
    tenant_id = NULL,
    full_name = admin_name;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Admin user configured successfully',
    'user_id', new_user_id
  );
END;
$$;


--
-- Name: set_tenant_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_tenant_referral_code() RETURNS trigger
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


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    actor_id uuid,
    tenant_id uuid,
    action text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    location text,
    phone text,
    email text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
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


--
-- Name: marketers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketers (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    user_id uuid,
    name text NOT NULL,
    phone text,
    email text,
    referral_code text NOT NULL,
    daily_rate numeric(10,2) DEFAULT 0,
    total_referrals integer DEFAULT 0,
    approved_signups integer DEFAULT 0,
    total_earned numeric(10,2) DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.packages (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
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


--
-- Name: payment_uploads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_uploads (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    tenant_id uuid NOT NULL,
    uploader_id uuid NOT NULL,
    package_id uuid NOT NULL,
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


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
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


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    tenant_id uuid,
    role public.app_role DEFAULT 'customer'::public.app_role,
    full_name text,
    phone text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: sale_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sale_id uuid NOT NULL,
    product_id uuid,
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    total_price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    customer_id uuid,
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


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    description text,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: tenants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tenants (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    business_type text,
    address text,
    phone text,
    email text,
    package_id uuid,
    status public.tenant_status DEFAULT 'pending'::public.tenant_status,
    referral_code text,
    referred_by_code text,
    activated_at timestamp with time zone,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: marketers marketers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketers
    ADD CONSTRAINT marketers_pkey PRIMARY KEY (id);


--
-- Name: marketers marketers_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketers
    ADD CONSTRAINT marketers_referral_code_key UNIQUE (referral_code);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: payment_uploads payment_uploads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_uploads
    ADD CONSTRAINT payment_uploads_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: sale_items sale_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_pkey PRIMARY KEY (id);


--
-- Name: tenants tenants_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_referral_code_key UNIQUE (referral_code);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: idx_branches_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branches_tenant ON public.branches USING btree (tenant_id);


--
-- Name: idx_customers_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_tenant ON public.customers USING btree (tenant_id);


--
-- Name: idx_products_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_products_tenant ON public.products USING btree (tenant_id);


--
-- Name: idx_sale_items_sale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sale_items_sale ON public.sale_items USING btree (sale_id);


--
-- Name: idx_sales_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_date ON public.sales USING btree (sale_date);


--
-- Name: idx_sales_tenant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_tenant ON public.sales USING btree (tenant_id);


--
-- Name: tenants set_tenant_referral_code_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_tenant_referral_code_trigger BEFORE INSERT ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.set_tenant_referral_code();


--
-- Name: branches update_branches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: marketers update_marketers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_marketers_updated_at BEFORE UPDATE ON public.marketers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: packages update_packages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: products update_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sales update_sales_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: settings update_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tenants update_tenants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: audit_logs audit_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id);


--
-- Name: audit_logs audit_logs_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id);


--
-- Name: branches branches_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: customers customers_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: customers customers_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: marketers marketers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketers
    ADD CONSTRAINT marketers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payment_uploads payment_uploads_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_uploads
    ADD CONSTRAINT payment_uploads_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id);


--
-- Name: payment_uploads payment_uploads_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_uploads
    ADD CONSTRAINT payment_uploads_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: payment_uploads payment_uploads_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_uploads
    ADD CONSTRAINT payment_uploads_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: payment_uploads payment_uploads_uploader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_uploads
    ADD CONSTRAINT payment_uploads_uploader_id_fkey FOREIGN KEY (uploader_id) REFERENCES auth.users(id);


--
-- Name: products products_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: products products_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: sale_items sale_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: sale_items sale_items_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE CASCADE;


--
-- Name: sales sales_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: sales sales_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: sales sales_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;


--
-- Name: settings settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);


--
-- Name: tenants tenants_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tenants
    ADD CONSTRAINT tenants_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: payment_uploads Admins can manage all payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all payments" ON public.payment_uploads USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['superadmin'::public.app_role, 'admin'::public.app_role]))))));


--
-- Name: tenants Admins can manage all tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage all tenants" ON public.tenants USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['superadmin'::public.app_role, 'admin'::public.app_role]))))));


--
-- Name: marketers Admins can manage marketers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage marketers" ON public.marketers USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['superadmin'::public.app_role, 'admin'::public.app_role]))))));


--
-- Name: packages Admins can manage packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage packages" ON public.packages USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['superadmin'::public.app_role, 'admin'::public.app_role]))))));


--
-- Name: settings Admins can manage settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage settings" ON public.settings USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['superadmin'::public.app_role, 'admin'::public.app_role]))))));


--
-- Name: profiles Admins can update all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: audit_logs Admins can view all logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all logs" ON public.audit_logs FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['superadmin'::public.app_role, 'admin'::public.app_role]))))));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: packages Anyone can view active packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active packages" ON public.packages FOR SELECT USING ((is_active = true));


--
-- Name: settings Anyone can view settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view settings" ON public.settings FOR SELECT USING (true);


--
-- Name: tenants Authenticated users can create tenants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create tenants" ON public.tenants FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: marketers Marketers can view their own data; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Marketers can view their own data" ON public.marketers FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: user_roles Superadmins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Superadmins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'superadmin'::public.app_role));


--
-- Name: user_roles Superadmins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Superadmins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'superadmin'::public.app_role));


--
-- Name: payment_uploads Tenant owners can upload payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant owners can upload payments" ON public.payment_uploads FOR INSERT WITH CHECK ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'tenant_owner'::public.app_role)))));


--
-- Name: tenants Tenant owners can view their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Tenant owners can view their tenant" ON public.tenants FOR SELECT USING (((id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['superadmin'::public.app_role, 'admin'::public.app_role])))))));


--
-- Name: branches Users can delete their tenant branches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their tenant branches" ON public.branches FOR DELETE USING ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: customers Users can delete their tenant customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their tenant customers" ON public.customers FOR DELETE USING ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: products Users can delete their tenant products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their tenant products" ON public.products FOR DELETE USING ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: branches Users can insert branches for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert branches for their tenant" ON public.branches FOR INSERT WITH CHECK ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: customers Users can insert customers for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert customers for their tenant" ON public.customers FOR INSERT WITH CHECK ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: products Users can insert products for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert products for their tenant" ON public.products FOR INSERT WITH CHECK ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: sale_items Users can insert sale items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert sale items" ON public.sale_items FOR INSERT WITH CHECK ((sale_id IN ( SELECT sales.id
   FROM public.sales
  WHERE (sales.tenant_id IN ( SELECT profiles.tenant_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: sales Users can insert sales for their tenant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert sales for their tenant" ON public.sales FOR INSERT WITH CHECK ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id));


--
-- Name: branches Users can update their tenant branches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their tenant branches" ON public.branches FOR UPDATE USING ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: customers Users can update their tenant customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their tenant customers" ON public.customers FOR UPDATE USING ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: products Users can update their tenant products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their tenant products" ON public.products FOR UPDATE USING ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: sales Users can update their tenant sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their tenant sales" ON public.sales FOR UPDATE USING ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: sale_items Users can view sale items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view sale items" ON public.sale_items FOR SELECT USING ((sale_id IN ( SELECT sales.id
   FROM public.sales
  WHERE (sales.tenant_id IN ( SELECT profiles.tenant_id
           FROM public.profiles
          WHERE (profiles.id = auth.uid()))))));


--
-- Name: profiles Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: branches Users can view their tenant branches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their tenant branches" ON public.branches FOR SELECT USING ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: customers Users can view their tenant customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their tenant customers" ON public.customers FOR SELECT USING ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: payment_uploads Users can view their tenant payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their tenant payments" ON public.payment_uploads FOR SELECT USING (((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['superadmin'::public.app_role, 'admin'::public.app_role])))))));


--
-- Name: products Users can view their tenant products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their tenant products" ON public.products FOR SELECT USING ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: sales Users can view their tenant sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their tenant sales" ON public.sales FOR SELECT USING ((tenant_id IN ( SELECT profiles.tenant_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: branches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: marketers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketers ENABLE ROW LEVEL SECURITY;

--
-- Name: packages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_uploads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.payment_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: sale_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

--
-- Name: sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

--
-- Name: settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

--
-- Name: tenants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


-- Create restaurant tables for table management
CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  capacity INTEGER DEFAULT 4,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
  location TEXT, -- e.g., 'indoor', 'outdoor', 'patio'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, table_number)
);

-- Enable RLS
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant_tables
CREATE POLICY "Users can view their tenant tables"
ON public.restaurant_tables FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert tables for their tenant"
ON public.restaurant_tables FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant tables"
ON public.restaurant_tables FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant tables"
ON public.restaurant_tables FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create menu categories table
CREATE TABLE public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for menu_categories
CREATE POLICY "Users can view their tenant categories"
ON public.menu_categories FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert categories for their tenant"
ON public.menu_categories FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant categories"
ON public.menu_categories FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant categories"
ON public.menu_categories FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Add restaurant-specific columns to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES restaurant_tables(id),
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'counter' CHECK (order_type IN ('dine_in', 'takeaway', 'counter')),
ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'pending' CHECK (order_status IN ('pending', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS order_number INTEGER;

-- Add category_id to products for menu organization
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES menu_categories(id);

-- CREATE OR REPLACE FUNCTION to generate order numbers per tenant per day
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  today_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO today_count
  FROM sales
  WHERE tenant_id = NEW.tenant_id
  AND DATE(created_at) = CURRENT_DATE;
  
  NEW.order_number := today_count;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for order numbers
DROP TRIGGER IF EXISTS set_order_number ON sales;
CREATE TRIGGER set_order_number
BEFORE INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION generate_order_number();

-- Update restaurant_tables updated_at trigger
CREATE TRIGGER update_restaurant_tables_updated_at
BEFORE UPDATE ON restaurant_tables
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Update menu_categories updated_at trigger  
CREATE TRIGGER update_menu_categories_updated_at
BEFORE UPDATE ON menu_categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
-- Allow public read access to tenants for menu display
CREATE POLICY "Anyone can view active tenants for menu" 
ON public.tenants 
FOR SELECT 
USING (status = 'active');

-- Allow public read access to menu categories
CREATE POLICY "Anyone can view active menu categories" 
ON public.menu_categories 
FOR SELECT 
USING (is_active = true);

-- Allow public read access to products (menu items)
CREATE POLICY "Anyone can view active menu items" 
ON public.products 
FOR SELECT 
USING (is_active = true);

-- Allow public read access to restaurant tables for table info display
CREATE POLICY "Anyone can view active tables" 
ON public.restaurant_tables 
FOR SELECT 
USING (is_active = true);
-- Create expenses table for all business types
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  receipt_url TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create hotel rooms table
CREATE TABLE public.hotel_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  room_type TEXT NOT NULL DEFAULT 'standard',
  capacity INTEGER DEFAULT 2,
  price_per_night NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'available',
  amenities JSONB DEFAULT '[]',
  floor TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create room bookings table
CREATE TABLE public.room_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.hotel_rooms(id) ON DELETE CASCADE,
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  guest_email TEXT,
  guest_id_number TEXT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  actual_check_in TIMESTAMP WITH TIME ZONE,
  actual_check_out TIMESTAMP WITH TIME ZONE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'reserved',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employees table for better staff management
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  department TEXT,
  salary NUMERIC DEFAULT 0,
  hire_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIME,
  check_out TIME,
  status TEXT DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- RLS for expenses
CREATE POLICY "Users can view their tenant expenses" ON public.expenses FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert expenses for their tenant" ON public.expenses FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update their tenant expenses" ON public.expenses FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete their tenant expenses" ON public.expenses FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS for hotel_rooms
CREATE POLICY "Users can view their tenant rooms" ON public.hotel_rooms FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert rooms for their tenant" ON public.hotel_rooms FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update their tenant rooms" ON public.hotel_rooms FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete their tenant rooms" ON public.hotel_rooms FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS for room_bookings
CREATE POLICY "Users can view their tenant bookings" ON public.room_bookings FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert bookings for their tenant" ON public.room_bookings FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update their tenant bookings" ON public.room_bookings FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete their tenant bookings" ON public.room_bookings FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS for employees
CREATE POLICY "Users can view their tenant employees" ON public.employees FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert employees for their tenant" ON public.employees FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update their tenant employees" ON public.employees FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete their tenant employees" ON public.employees FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS for attendance
CREATE POLICY "Users can view their tenant attendance" ON public.attendance FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert attendance for their tenant" ON public.attendance FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update their tenant attendance" ON public.attendance FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Add triggers for updated_at
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_hotel_rooms_updated_at BEFORE UPDATE ON public.hotel_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_room_bookings_updated_at BEFORE UPDATE ON public.room_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;

-- Create a permissive INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create tenants" 
ON public.tenants 
FOR INSERT 
TO authenticated
WITH CHECK (true);
-- Create business_modules table (available modules in the system)
CREATE TABLE public.business_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  applicable_business_types TEXT[] DEFAULT '{}',
  is_core BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tenant_modules table (modules enabled for each tenant)
CREATE TABLE public.tenant_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  enabled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  enabled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, module_code)
);

-- Enable RLS
ALTER TABLE public.business_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

-- RLS for business_modules (anyone can view active modules)
CREATE POLICY "Anyone can view active modules"
ON public.business_modules FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage modules"
ON public.business_modules FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('superadmin', 'admin')
));

-- RLS for tenant_modules
CREATE POLICY "Users can view their tenant modules"
ON public.tenant_modules FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant owners can manage modules"
ON public.tenant_modules FOR ALL
USING (tenant_id IN (
  SELECT tenant_id FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('tenant_owner', 'superadmin', 'admin')
));

-- Insert default modules
INSERT INTO public.business_modules (code, name, description, icon, category, applicable_business_types, is_core, display_order) VALUES
-- Core modules (all businesses)
('dashboard', 'Dashboard', 'Business overview and analytics', 'LayoutDashboard', 'core', '{}', true, 1),
('pos', 'Point of Sale', 'Process sales and transactions', 'ShoppingCart', 'core', '{}', true, 2),
('products', 'Products & Inventory', 'Manage products and stock', 'Package', 'core', '{}', true, 3),
('sales', 'Sales & Orders', 'View and manage orders', 'Receipt', 'core', '{}', true, 4),
('customers', 'Customers', 'Customer management', 'Users', 'core', '{}', true, 5),
('employees', 'Employees', 'Staff management', 'UserCircle', 'core', '{}', true, 6),
('expenses', 'Expenses', 'Track business expenses', 'Wallet', 'core', '{}', true, 7),
('reports', 'Reports', 'Business reports and analytics', 'BarChart3', 'core', '{}', true, 8),
('settings', 'Settings', 'Business settings', 'Settings', 'core', '{}', true, 100),

-- Restaurant/Bar/Cafe modules
('menu', 'Menu Management', 'Create and manage food/drink menus', 'UtensilsCrossed', 'restaurant', ARRAY['restaurant', 'bar', 'cafe'], false, 10),
('tables', 'Table Management', 'Manage restaurant tables', 'MapPin', 'restaurant', ARRAY['restaurant', 'bar', 'cafe'], false, 11),
('qr_menu', 'QR Code Menus', 'Digital menus with QR codes', 'QrCode', 'restaurant', ARRAY['restaurant', 'bar', 'cafe'], false, 12),
('kitchen', 'Kitchen Display', 'Kitchen order management', 'ChefHat', 'restaurant', ARRAY['restaurant', 'bar', 'cafe'], false, 13),

-- Hotel/Lodge modules
('rooms', 'Room Management', 'Manage hotel rooms', 'Bed', 'hotel', ARRAY['hotel', 'lodge', 'guest_house'], false, 20),
('bookings', 'Room Bookings', 'Manage reservations', 'CalendarDays', 'hotel', ARRAY['hotel', 'lodge', 'guest_house'], false, 21),

-- Salon/Spa modules
('services', 'Services', 'Manage service offerings', 'Scissors', 'salon', ARRAY['salon', 'spa', 'barber'], false, 30),
('appointments', 'Appointments', 'Schedule and manage appointments', 'Calendar', 'salon', ARRAY['salon', 'spa', 'barber'], false, 31),

-- Pharmacy/Healthcare modules
('prescriptions', 'Prescriptions', 'Manage prescriptions', 'Pill', 'pharmacy', ARRAY['pharmacy', 'hospital', 'clinic'], false, 40),
('patients', 'Patients', 'Patient records management', 'HeartPulse', 'pharmacy', ARRAY['pharmacy', 'hospital', 'clinic'], false, 41),

-- Repair/Workshop modules
('jobs', 'Job Cards', 'Track repair jobs', 'Wrench', 'repair', ARRAY['garage', 'repair_shop', 'tech_repair'], false, 50),
('parts', 'Spare Parts', 'Parts inventory', 'Cog', 'repair', ARRAY['garage', 'repair_shop', 'tech_repair', 'car_spares'], false, 51);

-- Create trigger for updated_at
CREATE TRIGGER update_business_modules_updated_at
BEFORE UPDATE ON public.business_modules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Add credit fields to customers table
ALTER TABLE public.customers 
ADD COLUMN credit_limit NUMERIC DEFAULT 0,
ADD COLUMN current_balance NUMERIC DEFAULT 0;

-- Create customer_payments table for payment collection tracking
CREATE TABLE public.customer_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  reference_number TEXT,
  notes TEXT,
  received_by UUID REFERENCES auth.users(id),
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_payments
CREATE POLICY "Users can view their tenant payments"
ON public.customer_payments FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert payments for their tenant"
ON public.customer_payments FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant payments"
ON public.customer_payments FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant payments"
ON public.customer_payments FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_customer_payments_customer ON public.customer_payments(customer_id);
CREATE INDEX idx_customer_payments_tenant ON public.customer_payments(tenant_id);
CREATE INDEX idx_customers_balance ON public.customers(tenant_id, current_balance) WHERE current_balance > 0;
-- Add branch_limit to packages table
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS branch_limit integer DEFAULT 1;

-- Update existing packages with branch limits
UPDATE public.packages SET branch_limit = 1 WHERE name = 'Starter';
UPDATE public.packages SET branch_limit = 3 WHERE name = 'Business';
UPDATE public.packages SET branch_limit = 10 WHERE name = 'Enterprise';

-- Add branch_id to employees table for department assignment
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Create staff_permissions table for controlling page access
CREATE TABLE IF NOT EXISTS public.staff_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
    allowed_modules text[] NOT NULL DEFAULT '{}',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid REFERENCES public.profiles(id),
    UNIQUE(profile_id, tenant_id)
);

-- Enable RLS on staff_permissions
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff_permissions
CREATE POLICY "Tenant owners and admins can manage staff permissions"
ON public.staff_permissions
FOR ALL
USING (
    tenant_id IN (
        SELECT profiles.tenant_id FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('tenant_owner', 'superadmin', 'admin')
    )
);

CREATE POLICY "Staff can view their own permissions"
ON public.staff_permissions
FOR SELECT
USING (profile_id = auth.uid());

-- Add branch_id to sales for department-based reports
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Add branch_id to expenses for department-based reports
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL;

-- Trigger for updated_at on staff_permissions
CREATE TRIGGER update_staff_permissions_updated_at
BEFORE UPDATE ON public.staff_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create staff_invitations table
CREATE TABLE public.staff_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  allowed_modules TEXT[] NOT NULL DEFAULT '{}',
  invited_by UUID REFERENCES public.profiles(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Policies for staff_invitations
CREATE POLICY "Tenant owners can manage invitations"
ON public.staff_invitations
FOR ALL
USING (tenant_id IN (
  SELECT profiles.tenant_id FROM profiles
  WHERE profiles.id = auth.uid()
  AND profiles.role IN ('tenant_owner', 'superadmin', 'admin')
));

CREATE POLICY "Anyone can view invitation by token"
ON public.staff_invitations
FOR SELECT
USING (true);

-- Update trigger
CREATE TRIGGER update_staff_invitations_updated_at
  BEFORE UPDATE ON public.staff_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Create testimonials table for real customer feedback
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  submitter_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  business_name TEXT,
  role TEXT,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  photo_url TEXT,
  proof_description TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Anyone can view approved testimonials (for public landing page)
CREATE POLICY "Anyone can view approved testimonials"
  ON public.testimonials
  FOR SELECT
  USING (is_approved = true);

-- Authenticated users can submit testimonials
CREATE POLICY "Authenticated users can submit testimonials"
  ON public.testimonials
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND submitter_id = auth.uid());

-- Users can update their own pending testimonials
CREATE POLICY "Users can update their own pending testimonials"
  ON public.testimonials
  FOR UPDATE
  USING (submitter_id = auth.uid() AND is_approved = false);

-- Admins can manage all testimonials
CREATE POLICY "Admins can manage all testimonials"
  ON public.testimonials
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('superadmin', 'admin')
  ));

-- Create updated_at trigger
CREATE TRIGGER update_testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Split payments table to track multiple payment methods per sale
CREATE TABLE public.sale_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert sale payments for their tenant sales"
ON public.sale_payments FOR INSERT
WITH CHECK (sale_id IN (
  SELECT id FROM sales WHERE tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
));

CREATE POLICY "Users can view sale payments for their tenant sales"
ON public.sale_payments FOR SELECT
USING (sale_id IN (
  SELECT id FROM sales WHERE tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
));

-- Layaway/Installment plans table
CREATE TABLE public.layaway_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  total_amount NUMERIC NOT NULL,
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  installment_count INTEGER NOT NULL DEFAULT 1,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.layaway_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage layaway plans for their tenant"
ON public.layaway_plans FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Installment payments for layaway
CREATE TABLE public.installment_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  layaway_id UUID NOT NULL REFERENCES public.layaway_plans(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  received_by UUID,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.installment_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage installment payments"
ON public.installment_payments FOR ALL
USING (layaway_id IN (
  SELECT id FROM layaway_plans WHERE tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
));

-- Layaway items table
CREATE TABLE public.layaway_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  layaway_id UUID NOT NULL REFERENCES public.layaway_plans(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.layaway_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage layaway items"
ON public.layaway_items FOR ALL
USING (layaway_id IN (
  SELECT id FROM layaway_plans WHERE tenant_id IN (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
));

-- Customer favorites table
CREATE TABLE public.customer_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  times_purchased INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(customer_id, product_id)
);

ALTER TABLE public.customer_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage customer favorites for their tenant"
ON public.customer_favorites FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- POS queue for bulk sales
CREATE TABLE public.pos_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  queue_number INTEGER NOT NULL,
  customer_name TEXT,
  status TEXT NOT NULL DEFAULT 'waiting',
  items JSONB NOT NULL DEFAULT '[]',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  called_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.pos_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage POS queue for their tenant"
ON public.pos_queue FOR ALL
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Enable realtime for POS queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.pos_queue;
ALTER TABLE public.pos_queue REPLICA IDENTITY FULL;

-- Enable realtime for sales (for dashboard)
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER TABLE public.sales REPLICA IDENTITY FULL;

-- Create trigger for layaway updated_at
CREATE TRIGGER update_layaway_plans_updated_at
BEFORE UPDATE ON public.layaway_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for customer favorites updated_at
CREATE TRIGGER update_customer_favorites_updated_at
BEFORE UPDATE ON public.customer_favorites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Add sale_id column to customer_payments to link payments to specific sales
ALTER TABLE public.customer_payments 
ADD COLUMN sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX idx_customer_payments_sale_id ON public.customer_payments(sale_id);

-- Add a comment explaining the column
COMMENT ON COLUMN public.customer_payments.sale_id IS 'Optional link to the original credit sale this payment is for';
-- Create receipt_settings table for tenant-specific receipt customization
CREATE TABLE public.receipt_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Numbering
  receipt_prefix TEXT DEFAULT 'RCP',
  next_receipt_number INTEGER DEFAULT 1,
  
  -- Layout
  logo_alignment TEXT DEFAULT 'center' CHECK (logo_alignment IN ('left', 'center', 'right')),
  show_logo BOOLEAN DEFAULT true,
  
  -- Contact info
  show_phone BOOLEAN DEFAULT true,
  show_email BOOLEAN DEFAULT true,
  show_address BOOLEAN DEFAULT true,
  
  -- WhatsApp QR
  whatsapp_number TEXT,
  show_whatsapp_qr BOOLEAN DEFAULT false,
  
  -- Seasonal/Custom remarks
  seasonal_remark TEXT,
  show_seasonal_remark BOOLEAN DEFAULT false,
  
  -- Footer customization
  footer_message TEXT DEFAULT 'Thank you for shopping with us!',
  show_footer_message BOOLEAN DEFAULT true,
  
  -- Additional fields visibility
  show_cashier BOOLEAN DEFAULT true,
  show_customer BOOLEAN DEFAULT true,
  show_date_time BOOLEAN DEFAULT true,
  show_payment_method BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_tenant_receipt_settings UNIQUE (tenant_id)
);

-- Enable RLS
ALTER TABLE public.receipt_settings ENABLE ROW LEVEL SECURITY;

-- Policies for tenant access
CREATE POLICY "Tenant owners can manage their receipt settings"
  ON public.receipt_settings
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_receipt_settings_updated_at
  BEFORE UPDATE ON public.receipt_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get next receipt number and increment
CREATE OR REPLACE FUNCTION public.get_next_receipt_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix TEXT;
  v_number INTEGER;
  v_receipt_number TEXT;
BEGIN
  -- Get or create settings for tenant
  INSERT INTO receipt_settings (tenant_id)
  VALUES (p_tenant_id)
  ON CONFLICT (tenant_id) DO NOTHING;
  
  -- Get and increment the receipt number atomically
  UPDATE receipt_settings
  SET next_receipt_number = next_receipt_number + 1
  WHERE tenant_id = p_tenant_id
  RETURNING receipt_prefix, next_receipt_number - 1 INTO v_prefix, v_number;
  
  -- Format: PREFIX-YYYYMMDD-NNNNNN
  v_receipt_number := v_prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_number::TEXT, 6, '0');
  
  RETURN v_receipt_number;
END;
$$;
-- Create storage bucket for business logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos for their tenant
CREATE POLICY "Tenant owners can upload logos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'business-logos' 
  AND auth.role() = 'authenticated'
);

-- Allow anyone to view logos (public bucket)
CREATE POLICY "Logos are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'business-logos');

-- Allow owners to update/delete their logos
CREATE POLICY "Tenant owners can update logos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Tenant owners can delete logos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'business-logos' AND auth.role() = 'authenticated');

-- Add logo_url column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS logo_url TEXT;
-- Create internal stock usage table
CREATE TABLE public.internal_stock_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  reason TEXT NOT NULL,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  usage_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.internal_stock_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their tenant usage records"
  ON public.internal_stock_usage
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert usage records for their tenant"
  ON public.internal_stock_usage
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant usage records"
  ON public.internal_stock_usage
  FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant usage records"
  ON public.internal_stock_usage
  FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_internal_stock_usage_tenant ON public.internal_stock_usage(tenant_id);
CREATE INDEX idx_internal_stock_usage_product ON public.internal_stock_usage(product_id);
CREATE INDEX idx_internal_stock_usage_date ON public.internal_stock_usage(usage_date);
-- Add new fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS barcode text,
ADD COLUMN IF NOT EXISTS unit_of_measure text DEFAULT 'piece',
ADD COLUMN IF NOT EXISTS supplier text,
ADD COLUMN IF NOT EXISTS brand text,
ADD COLUMN IF NOT EXISTS expiry_date date;

-- Create index on barcode for quick lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL;
-- Create suppliers table
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Suppliers RLS policies
CREATE POLICY "Users can view their tenant suppliers" ON public.suppliers
FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert suppliers for their tenant" ON public.suppliers
FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant suppliers" ON public.suppliers
FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant suppliers" ON public.suppliers
FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create product_categories table with built-in categories
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  name text NOT NULL,
  description text,
  business_type text,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on product_categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Categories RLS policies
CREATE POLICY "Users can view system categories" ON public.product_categories
FOR SELECT USING (is_system = true OR tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert categories for their tenant" ON public.product_categories
FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND is_system = false);

CREATE POLICY "Users can update their tenant categories" ON public.product_categories
FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND is_system = false);

CREATE POLICY "Users can delete their tenant categories" ON public.product_categories
FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND is_system = false);

-- Insert system categories for different business types
INSERT INTO public.product_categories (name, business_type, is_system, display_order) VALUES
-- Restaurant categories
('Appetizers', 'restaurant', true, 1),
('Main Course', 'restaurant', true, 2),
('Beverages', 'restaurant', true, 3),
('Desserts', 'restaurant', true, 4),
('Sides', 'restaurant', true, 5),
('Soups & Salads', 'restaurant', true, 6),

-- Supermarket categories
('Groceries', 'supermarket', true, 1),
('Fresh Produce', 'supermarket', true, 2),
('Dairy & Eggs', 'supermarket', true, 3),
('Meat & Poultry', 'supermarket', true, 4),
('Beverages', 'supermarket', true, 5),
('Snacks & Confectionery', 'supermarket', true, 6),
('Household Items', 'supermarket', true, 7),
('Personal Care', 'supermarket', true, 8),
('Frozen Foods', 'supermarket', true, 9),
('Bakery', 'supermarket', true, 10),

-- Hotel categories
('Room Service', 'hotel', true, 1),
('Mini Bar', 'hotel', true, 2),
('Spa Products', 'hotel', true, 3),
('Gift Shop', 'hotel', true, 4),
('Restaurant Menu', 'hotel', true, 5),

-- Pharmacy categories
('Prescription Drugs', 'pharmacy', true, 1),
('Over-the-Counter', 'pharmacy', true, 2),
('Vitamins & Supplements', 'pharmacy', true, 3),
('Personal Care', 'pharmacy', true, 4),
('Medical Devices', 'pharmacy', true, 5),
('Baby Care', 'pharmacy', true, 6),

-- Salon categories
('Hair Services', 'salon', true, 1),
('Nail Services', 'salon', true, 2),
('Skincare', 'salon', true, 3),
('Hair Products', 'salon', true, 4),
('Beauty Products', 'salon', true, 5),

-- Hardware categories
('Tools', 'hardware', true, 1),
('Electrical', 'hardware', true, 2),
('Plumbing', 'hardware', true, 3),
('Building Materials', 'hardware', true, 4),
('Paint & Finishes', 'hardware', true, 5),
('Garden & Outdoor', 'hardware', true, 6),

-- General/Other categories
('General', 'other', true, 1),
('Electronics', 'other', true, 2),
('Clothing', 'other', true, 3),
('Accessories', 'other', true, 4),
('Services', 'other', true, 5);

-- Add trigger for updated_at on suppliers
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create purchase_orders table
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  order_number TEXT NOT NULL,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase_order_items table
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  received_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on purchase_orders
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchase_orders
CREATE POLICY "Users can view their tenant purchase orders"
ON public.purchase_orders FOR SELECT
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert purchase orders for their tenant"
ON public.purchase_orders FOR INSERT
WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update their tenant purchase orders"
ON public.purchase_orders FOR UPDATE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete their tenant purchase orders"
ON public.purchase_orders FOR DELETE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Enable RLS on purchase_order_items
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchase_order_items
CREATE POLICY "Users can manage purchase order items"
ON public.purchase_order_items FOR ALL
USING (purchase_order_id IN (
  SELECT po.id FROM purchase_orders po
  WHERE po.tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())
));

-- Create trigger for updated_at
CREATE TRIGGER update_purchase_orders_updated_at
BEFORE UPDATE ON public.purchase_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create payroll_records table for monthly salary payments
CREATE TABLE public.payroll_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  deductions NUMERIC NOT NULL DEFAULT 0,
  advances_deducted NUMERIC NOT NULL DEFAULT 0,
  bonuses NUMERIC NOT NULL DEFAULT 0,
  net_salary NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE,
  payment_method TEXT DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create salary_advances table
CREATE TABLE public.salary_advances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  is_deducted BOOLEAN NOT NULL DEFAULT false,
  deducted_in_payroll_id UUID REFERENCES public.payroll_records(id),
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;

-- RLS policies for payroll_records
CREATE POLICY "Users can view their tenant payroll records" ON public.payroll_records
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert payroll records for their tenant" ON public.payroll_records
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant payroll records" ON public.payroll_records
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant payroll records" ON public.payroll_records
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS policies for salary_advances
CREATE POLICY "Users can view their tenant salary advances" ON public.salary_advances
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert salary advances for their tenant" ON public.salary_advances
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant salary advances" ON public.salary_advances
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant salary advances" ON public.salary_advances
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_payroll_records_updated_at
  BEFORE UPDATE ON public.payroll_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salary_advances_updated_at
  BEFORE UPDATE ON public.salary_advances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-generate SKU for products
CREATE OR REPLACE FUNCTION public.generate_product_sku()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  seq_num INTEGER;
  new_sku TEXT;
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    -- Get first 3 chars of category or 'PRD' as default
    prefix := UPPER(COALESCE(LEFT(REGEXP_REPLACE(NEW.category, '[^a-zA-Z]', '', 'g'), 3), 'PRD'));
    IF LENGTH(prefix) < 3 THEN
      prefix := RPAD(prefix, 3, 'X');
    END IF;
    
    -- Get next sequence number for this tenant
    SELECT COALESCE(MAX(CAST(SUBSTRING(sku FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO seq_num
    FROM products
    WHERE tenant_id = NEW.tenant_id AND sku LIKE prefix || '-%';
    
    new_sku := prefix || '-' || LPAD(seq_num::TEXT, 6, '0');
    NEW.sku := new_sku;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-generating SKU
CREATE TRIGGER generate_sku_on_insert
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.generate_product_sku();
-- Create patients table for pharmacy
CREATE TABLE public.patients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  allergies TEXT,
  medical_notes TEXT,
  insurance_provider TEXT,
  insurance_number TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  prescription_number TEXT NOT NULL,
  doctor_name TEXT,
  doctor_phone TEXT,
  hospital_clinic TEXT,
  prescription_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  dispensed_by UUID,
  dispensed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create prescription_items table
CREATE TABLE public.prescription_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  medication_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  dispensed_quantity INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for patients
CREATE POLICY "Users can view their tenant patients" ON public.patients
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert patients for their tenant" ON public.patients
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update their tenant patients" ON public.patients
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete their tenant patients" ON public.patients
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS policies for prescriptions
CREATE POLICY "Users can view their tenant prescriptions" ON public.prescriptions
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert prescriptions for their tenant" ON public.prescriptions
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update their tenant prescriptions" ON public.prescriptions
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete their tenant prescriptions" ON public.prescriptions
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS policies for prescription_items
CREATE POLICY "Users can manage prescription items" ON public.prescription_items
  FOR ALL USING (prescription_id IN (
    SELECT id FROM prescriptions WHERE tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- Add triggers for updated_at
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add pharmacy to applicable business types for relevant modules
UPDATE business_modules SET applicable_business_types = array_append(applicable_business_types, 'pharmacy') 
WHERE code IN ('products', 'customers', 'sales', 'pos', 'expenses', 'reports', 'stock_alerts')
AND NOT ('pharmacy' = ANY(applicable_business_types));
-- Create academic terms table for term-based billing
CREATE TABLE public.academic_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  term_number INTEGER NOT NULL CHECK (term_number BETWEEN 1 AND 3),
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, term_number, year)
);

-- Create school classes table
CREATE TABLE public.school_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('kindergarten', 'primary', 'secondary')),
  grade TEXT NOT NULL,
  section TEXT,
  class_teacher_id UUID REFERENCES public.employees(id),
  capacity INTEGER DEFAULT 40,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  admission_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  class_id UUID REFERENCES public.school_classes(id),
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  address TEXT,
  admission_date DATE DEFAULT CURRENT_DATE,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, admission_number)
);

-- Create student attendance table
CREATE TABLE public.student_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.school_classes(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  level TEXT NOT NULL CHECK (level IN ('kindergarten', 'primary', 'secondary', 'all')),
  is_core BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student grades/marks table
CREATE TABLE public.student_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  term_id UUID NOT NULL REFERENCES public.academic_terms(id),
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('exam', 'test', 'assignment', 'practical', 'project')),
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL DEFAULT 100,
  grade TEXT,
  remarks TEXT,
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fee structure table
CREATE TABLE public.fee_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('kindergarten', 'primary', 'secondary', 'all')),
  term_id UUID REFERENCES public.academic_terms(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('tuition', 'boarding', 'transport', 'meals', 'uniform', 'books', 'activity', 'other')),
  is_mandatory BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student fees table (individual student fee records)
CREATE TABLE public.student_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, term_id)
);

-- Create fee payments table
CREATE TABLE public.fee_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_fee_id UUID NOT NULL REFERENCES public.student_fees(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  reference_number TEXT,
  receipt_number TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  received_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create school subscription packages table (per-term pricing)
CREATE TABLE public.school_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  school_level TEXT NOT NULL CHECK (school_level IN ('kindergarten', 'primary', 'secondary', 'all')),
  price_per_term NUMERIC NOT NULL,
  student_limit INTEGER,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create school subscriptions table
CREATE TABLE public.school_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.school_packages(id),
  term_id UUID NOT NULL REFERENCES public.academic_terms(id),
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'expired')),
  activated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, term_id)
);

-- Enable RLS on all tables
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for academic_terms
CREATE POLICY "Users can view their tenant terms" ON public.academic_terms FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert terms for their tenant" ON public.academic_terms FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant terms" ON public.academic_terms FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant terms" ON public.academic_terms FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for school_classes
CREATE POLICY "Users can view their tenant classes" ON public.school_classes FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert classes for their tenant" ON public.school_classes FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant classes" ON public.school_classes FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant classes" ON public.school_classes FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for students
CREATE POLICY "Users can view their tenant students" ON public.students FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert students for their tenant" ON public.students FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant students" ON public.students FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant students" ON public.students FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for student_attendance
CREATE POLICY "Users can view their tenant attendance" ON public.student_attendance FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert attendance for their tenant" ON public.student_attendance FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant attendance" ON public.student_attendance FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant attendance" ON public.student_attendance FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for subjects
CREATE POLICY "Users can view their tenant subjects" ON public.subjects FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert subjects for their tenant" ON public.subjects FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant subjects" ON public.subjects FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant subjects" ON public.subjects FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for student_grades
CREATE POLICY "Users can view their tenant grades" ON public.student_grades FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert grades for their tenant" ON public.student_grades FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant grades" ON public.student_grades FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant grades" ON public.student_grades FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for fee_structures
CREATE POLICY "Users can view their tenant fee structures" ON public.fee_structures FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert fee structures for their tenant" ON public.fee_structures FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant fee structures" ON public.fee_structures FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant fee structures" ON public.fee_structures FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for student_fees
CREATE POLICY "Users can view their tenant student fees" ON public.student_fees FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert student fees for their tenant" ON public.student_fees FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant student fees" ON public.student_fees FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant student fees" ON public.student_fees FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for fee_payments
CREATE POLICY "Users can view their tenant fee payments" ON public.fee_payments FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert fee payments for their tenant" ON public.fee_payments FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant fee payments" ON public.fee_payments FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant fee payments" ON public.fee_payments FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for school_packages (admin managed, anyone can view active)
CREATE POLICY "Admins can manage school packages" ON public.school_packages FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'admin')));
CREATE POLICY "Anyone can view active school packages" ON public.school_packages FOR SELECT USING (is_active = true);

-- RLS Policies for school_subscriptions
CREATE POLICY "Users can view their tenant subscriptions" ON public.school_subscriptions FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert subscriptions for their tenant" ON public.school_subscriptions FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Admins can manage all subscriptions" ON public.school_subscriptions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'admin')));

-- Add triggers for updated_at
CREATE TRIGGER update_academic_terms_updated_at BEFORE UPDATE ON public.academic_terms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_classes_updated_at BEFORE UPDATE ON public.school_classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_grades_updated_at BEFORE UPDATE ON public.student_grades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fee_structures_updated_at BEFORE UPDATE ON public.fee_structures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_fees_updated_at BEFORE UPDATE ON public.student_fees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_packages_updated_at BEFORE UPDATE ON public.school_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_subscriptions_updated_at BEFORE UPDATE ON public.school_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Drop the restrictive policy and recreate as permissive
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;

-- Create a permissive INSERT policy for authenticated users
CREATE POLICY "Authenticated users can create tenants" 
ON public.tenants 
FOR INSERT 
TO authenticated
WITH CHECK (true);
-- Drop the restrictive admin policy and recreate as permissive
DROP POLICY IF EXISTS "Admins can manage all tenants" ON public.tenants;

-- Create permissive admin policy for all operations
CREATE POLICY "Admins can manage all tenants" 
ON public.tenants 
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('superadmin', 'admin')
  )
);

-- Also fix the profiles admin policy to be permissive
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));
-- Drop all existing INSERT policies on tenants
DROP POLICY IF EXISTS "Authenticated users can create tenants" ON public.tenants;

-- Create a simple permissive INSERT policy that allows any authenticated user
CREATE POLICY "Allow authenticated users to insert tenants" 
ON public.tenants 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Also ensure the profiles INSERT policy is correct
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = id);
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
-- Create a function to create academic term and school subscription for signup (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_school_signup_data(
  p_tenant_id UUID,
  p_package_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_term_id UUID;
  v_current_year INTEGER;
BEGIN
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  
  -- Create academic term
  INSERT INTO academic_terms (
    tenant_id,
    name,
    term_number,
    year,
    start_date,
    end_date,
    is_current
  )
  VALUES (
    p_tenant_id,
    'Term 1 ' || v_current_year,
    1,
    v_current_year,
    CURRENT_DATE,
    (v_current_year || '-12-31')::DATE,
    true
  )
  RETURNING id INTO v_term_id;
  
  -- Create school subscription
  INSERT INTO school_subscriptions (
    tenant_id,
    package_id,
    term_id,
    amount_paid,
    payment_status
  )
  VALUES (
    p_tenant_id,
    p_package_id,
    v_term_id,
    0,
    'pending'
  );
  
  RETURN v_term_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_school_signup_data(UUID, UUID) TO authenticated;
-- Add school-specific modules to business_modules
INSERT INTO business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
VALUES 
  ('students', 'Students', 'Manage student enrollment and records', 'Users', 'school', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 10),
  ('classes', 'Classes', 'Manage classes and sections', 'GraduationCap', 'school', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 15),
  ('attendance', 'Attendance', 'Track student attendance', 'ClipboardCheck', 'school', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 20),
  ('grades', 'Grades', 'Manage student grades and assessments', 'Award', 'school', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 25),
  ('subjects', 'Subjects', 'Manage subjects and curriculum', 'BookOpen', 'school', ARRAY['primary_school', 'secondary_school'], false, true, 30),
  ('fees', 'Fee Management', 'Manage student fees and payments', 'CreditCard', 'school', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 35),
  ('academic_terms', 'Academic Terms', 'Manage academic terms and sessions', 'Calendar', 'school', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, true, 40)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  applicable_business_types = EXCLUDED.applicable_business_types,
  is_active = EXCLUDED.is_active,
  display_order = EXCLUDED.display_order;
-- Fix is_core flags - only dashboard, employees, settings should be truly core
-- Other modules should rely on applicable_business_types for filtering

UPDATE business_modules SET is_core = false WHERE code IN (
  'pos', 'products', 'sales', 'customers', 'expenses', 'reports', 'stock_alerts',
  'internal_usage', 'suppliers', 'categories', 'purchase_orders', 'business_cards'
);

-- Update applicable_business_types to be more accurate
-- Dashboard, employees, settings apply to ALL business types
UPDATE business_modules 
SET applicable_business_types = NULL 
WHERE code IN ('dashboard', 'employees', 'settings');

-- POS, products, sales, customers, expenses, reports should apply to retail/restaurant/hotel/salon/pharmacy businesses, NOT schools
UPDATE business_modules 
SET applicable_business_types = ARRAY['retail_shop', 'supermarket', 'boutique', 'perfume_shop', 'shoe_shop', 'kitchenware_shop', 'hardware', 'tech_shop', 'restaurant', 'bar', 'cafe', 'hotel', 'lodge', 'guest_house', 'salon', 'spa', 'barber', 'pharmacy', 'hospital', 'clinic', 'garage', 'tech_repair', 'car_spares', 'repair_shop', 'other']
WHERE code IN ('pos', 'products', 'sales', 'customers', 'expenses', 'reports', 'stock_alerts');

-- Suppliers, categories, purchase_orders apply to businesses with inventory
UPDATE business_modules 
SET applicable_business_types = ARRAY['retail_shop', 'supermarket', 'boutique', 'perfume_shop', 'shoe_shop', 'kitchenware_shop', 'hardware', 'tech_shop', 'restaurant', 'bar', 'cafe', 'hotel', 'lodge', 'guest_house', 'pharmacy', 'hospital', 'clinic', 'garage', 'tech_repair', 'car_spares', 'repair_shop', 'other']
WHERE code IN ('suppliers', 'categories', 'purchase_orders');

-- Internal usage for businesses with stock
UPDATE business_modules 
SET applicable_business_types = ARRAY['retail_shop', 'supermarket', 'boutique', 'restaurant', 'bar', 'cafe', 'hotel', 'lodge', 'guest_house', 'pharmacy', 'hospital', 'clinic', 'salon', 'spa', 'barber']
WHERE code = 'internal_usage';

-- Business cards for all businesses
UPDATE business_modules 
SET applicable_business_types = ARRAY['retail_shop', 'supermarket', 'boutique', 'perfume_shop', 'shoe_shop', 'kitchenware_shop', 'hardware', 'tech_shop', 'restaurant', 'bar', 'cafe', 'hotel', 'lodge', 'guest_house', 'salon', 'spa', 'barber', 'pharmacy', 'hospital', 'clinic', 'garage', 'tech_repair', 'car_spares', 'repair_shop', 'other']
WHERE code = 'business_cards';

-- Payroll applies to all business types including schools
UPDATE business_modules 
SET applicable_business_types = ARRAY['retail_shop', 'supermarket', 'boutique', 'perfume_shop', 'shoe_shop', 'kitchenware_shop', 'hardware', 'tech_shop', 'restaurant', 'bar', 'cafe', 'hotel', 'lodge', 'guest_house', 'salon', 'spa', 'barber', 'pharmacy', 'hospital', 'clinic', 'garage', 'tech_repair', 'car_spares', 'repair_shop', 'kindergarten', 'primary_school', 'secondary_school', 'other']
WHERE code = 'payroll';
-- Create letter_settings table for layout customization
CREATE TABLE public.letter_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Header settings
  show_logo BOOLEAN DEFAULT true,
  logo_position TEXT DEFAULT 'center', -- left, center, right
  show_school_name BOOLEAN DEFAULT true,
  show_address BOOLEAN DEFAULT true,
  show_phone BOOLEAN DEFAULT true,
  show_email BOOLEAN DEFAULT true,
  header_text TEXT, -- Custom header text/motto
  
  -- Footer settings
  show_signature_line BOOLEAN DEFAULT true,
  signature_title TEXT DEFAULT 'Head Teacher',
  show_stamp_area BOOLEAN DEFAULT true,
  footer_text TEXT DEFAULT 'This letter was generated by the school management system.',
  
  -- Margins & spacing (in mm)
  margin_top INTEGER DEFAULT 20,
  margin_bottom INTEGER DEFAULT 20,
  margin_left INTEGER DEFAULT 25,
  margin_right INTEGER DEFAULT 25,
  line_spacing NUMERIC DEFAULT 1.5,
  
  -- Font settings
  font_family TEXT DEFAULT 'Arial',
  font_size INTEGER DEFAULT 12,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id)
);

-- Create letters table
CREATE TABLE public.letters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Letter details
  title TEXT NOT NULL,
  subject TEXT,
  content TEXT NOT NULL,
  letter_type TEXT NOT NULL DEFAULT 'general', -- general, personalized
  
  -- For personalized letters
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.school_classes(id) ON DELETE SET NULL,
  
  -- Metadata
  letter_date DATE DEFAULT CURRENT_DATE,
  reference_number TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft', -- draft, finalized
  
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.letter_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;

-- RLS policies for letter_settings
CREATE POLICY "Users can manage their tenant letter settings"
ON public.letter_settings
FOR ALL
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()))
WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS policies for letters
CREATE POLICY "Users can view their tenant letters"
ON public.letters
FOR SELECT
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert letters for their tenant"
ON public.letters
FOR INSERT
WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update their tenant letters"
ON public.letters
FOR UPDATE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete their tenant letters"
ON public.letters
FOR DELETE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_letter_settings_updated_at
BEFORE UPDATE ON public.letter_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_letters_updated_at
BEFORE UPDATE ON public.letters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add letters module for schools
INSERT INTO business_modules (code, name, description, icon, category, is_core, applicable_business_types, display_order)
VALUES ('letters', 'Letters', 'Create and manage letters for students and parents', 'Mail', 'communication', false, ARRAY['kindergarten', 'primary_school', 'secondary_school'], 85)
ON CONFLICT (code) DO NOTHING;
-- Add columns for custom letterhead and footer images
ALTER TABLE public.letter_settings 
ADD COLUMN IF NOT EXISTS custom_header_image_url text,
ADD COLUMN IF NOT EXISTS custom_footer_image_url text,
ADD COLUMN IF NOT EXISTS use_custom_header boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS use_custom_footer boolean DEFAULT false;
-- Add Letters module to business_modules for schools
INSERT INTO public.business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
VALUES (
  'letters',
  'Letters',
  'Create and manage official letters, announcements, and communications',
  'FileText',
  'school',
  ARRAY['school'],
  false,
  true,
  85
)
ON CONFLICT (code) DO NOTHING;
-- Add Student ID Cards module to business_modules for schools
INSERT INTO public.business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
VALUES (
  'student_cards',
  'Student ID Cards',
  'Generate and print student ID cards with payment barcodes for fee collection',
  'CreditCard',
  'school',
  ARRAY['school', 'kindergarten', 'primary_school', 'secondary_school'],
  false,
  true,
  86
)
ON CONFLICT (code) DO NOTHING;
-- Add comprehensive student enrollment fields
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS religion text,
ADD COLUMN IF NOT EXISTS talent text,
ADD COLUMN IF NOT EXISTS nationality text DEFAULT 'Ugandan',
ADD COLUMN IF NOT EXISTS place_of_birth text,
ADD COLUMN IF NOT EXISTS home_district text,
ADD COLUMN IF NOT EXISTS medical_conditions text,
ADD COLUMN IF NOT EXISTS blood_group text,
ADD COLUMN IF NOT EXISTS allergies text,
ADD COLUMN IF NOT EXISTS disabilities text,
ADD COLUMN IF NOT EXISTS immunization_status text,
ADD COLUMN IF NOT EXISTS previous_school_name text,
ADD COLUMN IF NOT EXISTS previous_school_address text,
ADD COLUMN IF NOT EXISTS previous_class text,
ADD COLUMN IF NOT EXISTS previous_school_leaving_reason text,
ADD COLUMN IF NOT EXISTS academic_report_notes text,
ADD COLUMN IF NOT EXISTS guardian_name text,
ADD COLUMN IF NOT EXISTS guardian_relationship text,
ADD COLUMN IF NOT EXISTS guardian_phone text,
ADD COLUMN IF NOT EXISTS guardian_email text,
ADD COLUMN IF NOT EXISTS guardian_address text,
ADD COLUMN IF NOT EXISTS guardian_occupation text,
ADD COLUMN IF NOT EXISTS guardian_national_id text,
ADD COLUMN IF NOT EXISTS father_name text,
ADD COLUMN IF NOT EXISTS father_phone text,
ADD COLUMN IF NOT EXISTS father_occupation text,
ADD COLUMN IF NOT EXISTS father_national_id text,
ADD COLUMN IF NOT EXISTS mother_name text,
ADD COLUMN IF NOT EXISTS mother_phone text,
ADD COLUMN IF NOT EXISTS mother_occupation text,
ADD COLUMN IF NOT EXISTS mother_national_id text,
ADD COLUMN IF NOT EXISTS emergency_contact_name text,
ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
ADD COLUMN IF NOT EXISTS student_national_id text,
ADD COLUMN IF NOT EXISTS birth_certificate_number text,
ADD COLUMN IF NOT EXISTS admitted_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS admission_notes text;

-- Create term requirements table
CREATE TABLE IF NOT EXISTS public.term_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  term_id uuid REFERENCES public.academic_terms(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  is_mandatory boolean DEFAULT false,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.term_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant requirements" ON public.term_requirements
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert requirements for their tenant" ON public.term_requirements
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant requirements" ON public.term_requirements
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant requirements" ON public.term_requirements
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create student term requirements (checklist during admission)
CREATE TABLE IF NOT EXISTS public.student_term_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id uuid REFERENCES public.academic_terms(id) ON DELETE SET NULL,
  requirement_id uuid NOT NULL REFERENCES public.term_requirements(id) ON DELETE CASCADE,
  is_fulfilled boolean DEFAULT false,
  fulfilled_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, term_id, requirement_id)
);

ALTER TABLE public.student_term_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant student requirements" ON public.student_term_requirements
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert student requirements for their tenant" ON public.student_term_requirements
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant student requirements" ON public.student_term_requirements
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant student requirements" ON public.student_term_requirements
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_term_requirements_updated_at
  BEFORE UPDATE ON public.term_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_term_requirements_updated_at
  BEFORE UPDATE ON public.student_term_requirements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Add category and price columns to term_requirements
ALTER TABLE public.term_requirements 
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'external' CHECK (category IN ('internal', 'external')),
ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.term_requirements.category IS 'internal = sold by school, external = bought outside';
COMMENT ON COLUMN public.term_requirements.price IS 'Price only applicable for internal requirements';
-- Add frequency column to term_requirements
ALTER TABLE public.term_requirements 
ADD COLUMN frequency text NOT NULL DEFAULT 'term' 
CHECK (frequency IN ('term', 'year', 'one_time'));
-- Create school_settings table for school-specific configurations
CREATE TABLE public.school_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  streams TEXT[] NOT NULL DEFAULT ARRAY['East', 'West', 'North', 'South', 'A', 'B', 'C', 'D'],
  class_naming_format TEXT DEFAULT 'senior', -- 'senior' for "Senior 1", 'form' for "Form 1", 's' for "S1"
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their tenant school settings"
ON public.school_settings
FOR SELECT
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert school settings for their tenant"
ON public.school_settings
FOR INSERT
WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update their tenant school settings"
ON public.school_settings
FOR UPDATE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_school_settings_updated_at
BEFORE UPDATE ON public.school_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- School subjects offered by each school
CREATE TABLE public.school_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  category TEXT DEFAULT 'core', -- core, elective, optional
  level TEXT NOT NULL DEFAULT 'o-level', -- o-level, a-level, both
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name, level)
);

-- Student report cards (one per student per term)
CREATE TABLE public.student_report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.school_classes(id),
  
  -- Attendance
  days_present INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  total_school_days INTEGER DEFAULT 0,
  
  -- Prefect status
  is_prefect BOOLEAN DEFAULT false,
  prefect_title TEXT,
  
  -- Discipline
  discipline_remark TEXT DEFAULT 'Well disciplined',
  
  -- Ranking
  class_rank INTEGER,
  total_students_in_class INTEGER,
  total_score NUMERIC(5,2) DEFAULT 0,
  average_score NUMERIC(5,2) DEFAULT 0,
  
  -- Comments
  class_teacher_comment TEXT,
  head_teacher_comment TEXT,
  
  -- Signatures
  class_teacher_signature TEXT,
  head_teacher_signature TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft', -- draft, published
  published_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(tenant_id, student_id, term_id)
);

-- Subject scores for each report card
CREATE TABLE public.report_card_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id UUID NOT NULL REFERENCES public.student_report_cards(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.school_subjects(id) ON DELETE CASCADE,
  
  -- Scores (Uganda system)
  formative_score NUMERIC(5,2) DEFAULT 0, -- 20% weight
  school_based_score NUMERIC(5,2) DEFAULT 0, -- 80% weight (exams)
  total_score NUMERIC(5,2) GENERATED ALWAYS AS (
    (formative_score * 0.2) + (school_based_score * 0.8)
  ) STORED,
  
  -- Competency (1.0 - 3.0 scale)
  competency_score NUMERIC(3,2) DEFAULT 0,
  
  -- Grade (auto-calculated but stored)
  grade TEXT,
  grade_descriptor TEXT,
  
  -- Teacher remarks
  subject_remark TEXT,
  teacher_name TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(report_card_id, subject_id)
);

-- Generic skills and values assessment
CREATE TABLE public.report_card_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id UUID NOT NULL REFERENCES public.student_report_cards(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_category TEXT DEFAULT 'generic', -- generic, values
  rating TEXT, -- Excellent, Very Good, Good, Fair, Needs Improvement
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(report_card_id, skill_name)
);

-- Co-curricular activities
CREATE TABLE public.report_card_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id UUID NOT NULL REFERENCES public.student_report_cards(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- sports, clubs, projects
  activity_name TEXT NOT NULL,
  performance TEXT, -- Excellent, Very Good, Good, Fair, Participated
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Monthly attendance tracking
CREATE TABLE public.student_monthly_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  month INTEGER NOT NULL, -- 1-12
  year INTEGER NOT NULL,
  days_present INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  total_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, student_id, term_id, month, year)
);

-- Enable RLS on all tables
ALTER TABLE public.school_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_monthly_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school_subjects
CREATE POLICY "Users can view their tenant subjects" ON public.school_subjects
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert subjects for their tenant" ON public.school_subjects
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant subjects" ON public.school_subjects
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant subjects" ON public.school_subjects
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for student_report_cards
CREATE POLICY "Users can view their tenant report cards" ON public.student_report_cards
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert report cards for their tenant" ON public.student_report_cards
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant report cards" ON public.student_report_cards
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant report cards" ON public.student_report_cards
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for report_card_scores
CREATE POLICY "Users can manage report card scores" ON public.report_card_scores
  FOR ALL USING (report_card_id IN (
    SELECT id FROM student_report_cards WHERE tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- RLS Policies for report_card_skills
CREATE POLICY "Users can manage report card skills" ON public.report_card_skills
  FOR ALL USING (report_card_id IN (
    SELECT id FROM student_report_cards WHERE tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- RLS Policies for report_card_activities
CREATE POLICY "Users can manage report card activities" ON public.report_card_activities
  FOR ALL USING (report_card_id IN (
    SELECT id FROM student_report_cards WHERE tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- RLS Policies for student_monthly_attendance
CREATE POLICY "Users can view their tenant attendance" ON public.student_monthly_attendance
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert attendance for their tenant" ON public.student_monthly_attendance
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant attendance" ON public.student_monthly_attendance
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant attendance" ON public.student_monthly_attendance
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create gate check-ins table to record student arrivals/departures
CREATE TABLE public.gate_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  student_id UUID NOT NULL,
  check_type TEXT NOT NULL DEFAULT 'arrival' CHECK (check_type IN ('arrival', 'departure')),
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  checked_by UUID,
  is_late BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create parent-student linking table
CREATE TABLE public.parent_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL,
  student_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'parent',
  is_primary_contact BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Create parents table for parent-specific info
CREATE TABLE public.parents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  tenant_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  occupation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gate_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

-- Gate check-ins policies (school staff can manage)
CREATE POLICY "Staff can view tenant gate checkins" ON public.gate_checkins
  FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Staff can insert gate checkins" ON public.gate_checkins
  FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Parents can view their children's check-ins
CREATE POLICY "Parents can view their children checkins" ON public.gate_checkins
  FOR SELECT USING (
    student_id IN (
      SELECT ps.student_id FROM parent_students ps
      JOIN parents p ON ps.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Parent students policies
CREATE POLICY "Staff can manage parent-student links" ON public.parent_students
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Parents can view their links" ON public.parent_students
  FOR SELECT USING (parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid()));

-- Parents table policies
CREATE POLICY "Staff can manage parents" ON public.parents
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Parents can view own record" ON public.parents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Parents can update own record" ON public.parents
  FOR UPDATE USING (user_id = auth.uid());

-- Add late arrival threshold to tenants (minutes after school start)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS late_arrival_minutes INTEGER DEFAULT 30;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS school_start_time TIME DEFAULT '08:00:00';

-- Create index for faster lookups
CREATE INDEX idx_gate_checkins_student ON public.gate_checkins(student_id, checked_at DESC);
CREATE INDEX idx_gate_checkins_tenant_date ON public.gate_checkins(tenant_id, checked_at);
CREATE INDEX idx_parent_students_parent ON public.parent_students(parent_id);

-- Add foreign key relationships
ALTER TABLE public.gate_checkins 
  ADD CONSTRAINT gate_checkins_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.gate_checkins 
  ADD CONSTRAINT gate_checkins_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.parent_students 
  ADD CONSTRAINT parent_students_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.parent_students 
  ADD CONSTRAINT parent_students_parent_id_fkey 
  FOREIGN KEY (parent_id) REFERENCES public.parents(id) ON DELETE CASCADE;

ALTER TABLE public.parent_students 
  ADD CONSTRAINT parent_students_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.parents 
  ADD CONSTRAINT parents_tenant_id_fkey 
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
-- Create visitor_register table for tracking visitors
CREATE TABLE public.visitor_register (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  phone TEXT,
  id_number TEXT,
  purpose TEXT NOT NULL,
  visiting_who TEXT,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_out_time TIMESTAMP WITH TIME ZONE,
  badge_number TEXT,
  notes TEXT,
  checked_in_by UUID,
  checked_out_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.visitor_register ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their tenant visitors"
ON public.visitor_register FOR SELECT
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert visitors for their tenant"
ON public.visitor_register FOR INSERT
WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update their tenant visitors"
ON public.visitor_register FOR UPDATE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete their tenant visitors"
ON public.visitor_register FOR DELETE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Create index for faster lookups
CREATE INDEX idx_visitor_register_tenant_date ON public.visitor_register(tenant_id, check_in_time DESC);

-- Insert visitor_register module
INSERT INTO business_modules (code, name, description, icon, category, is_core, is_active, display_order, applicable_business_types)
VALUES ('visitor_register', 'Visitor Register', 'Track and manage school visitors', 'ClipboardList', 'school', false, true, 26, ARRAY['school', 'secondary_school', 'primary_school', 'kindergarten'])
ON CONFLICT (code) DO UPDATE SET is_active = true;

-- Enable for all school-type tenants
INSERT INTO tenant_modules (tenant_id, module_code, is_enabled)
SELECT t.id, 'visitor_register', true
FROM tenants t
WHERE t.business_type IN ('school', 'secondary_school', 'primary_school', 'kindergarten')
ON CONFLICT (tenant_id, module_code) DO UPDATE SET is_enabled = true;
-- CREATE OR REPLACE FUNCTION to generate admission number
CREATE OR REPLACE FUNCTION public.generate_admission_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
  v_prefix TEXT;
BEGIN
  -- Only generate if admission_number is null or empty
  IF NEW.admission_number IS NULL OR NEW.admission_number = '' THEN
    v_year := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Get next sequence number for this tenant and year
    SELECT COALESCE(MAX(
      CAST(NULLIF(REGEXP_REPLACE(admission_number, '[^0-9]', '', 'g'), '') AS INTEGER)
    ), 0) + 1
    INTO v_seq
    FROM students
    WHERE tenant_id = NEW.tenant_id
    AND admission_number LIKE 'ADM/' || v_year || '/%';
    
    -- Format: ADM/YY/NNNN (e.g., ADM/25/0001)
    NEW.admission_number := 'ADM/' || v_year || '/' || LPAD(v_seq::TEXT, 4, '0');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate admission numbers
DROP TRIGGER IF EXISTS generate_student_admission_number ON students;
CREATE TRIGGER generate_student_admission_number
BEFORE INSERT ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.generate_admission_number();
-- Add school end time and early departure settings to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS school_end_time TIME DEFAULT '16:00:00';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS require_early_departure_reason BOOLEAN DEFAULT true;

-- Create early departure requests table
CREATE TABLE public.early_departure_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  requested_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  gate_checkin_id UUID REFERENCES gate_checkins(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.early_departure_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Staff can view tenant early departure requests"
ON public.early_departure_requests
FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can insert early departure requests"
ON public.early_departure_requests
FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Staff can update early departure requests"
ON public.early_departure_requests
FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Add index for performance
CREATE INDEX idx_early_departure_requests_tenant_status ON public.early_departure_requests(tenant_id, status);
CREATE INDEX idx_early_departure_requests_student ON public.early_departure_requests(student_id);
-- Add boarding status column to students table
ALTER TABLE public.students 
ADD COLUMN boarding_status text NOT NULL DEFAULT 'day' 
CHECK (boarding_status IN ('day', 'boarding'));

-- Add comment for clarity
COMMENT ON COLUMN public.students.boarding_status IS 'Indicates if student is a day scholar (day) or boarding scholar (boarding)';
-- Add school-specific fee receipt settings columns
ALTER TABLE public.receipt_settings
ADD COLUMN IF NOT EXISTS show_stamp_area boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS stamp_title text DEFAULT 'Official Stamp',
ADD COLUMN IF NOT EXISTS show_verification_qr boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_school_motto boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS school_motto text,
ADD COLUMN IF NOT EXISTS show_term_info boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_class_info boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_balance_info boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS receipt_title text DEFAULT 'OFFICIAL FEE PAYMENT RECEIPT',
ADD COLUMN IF NOT EXISTS signature_title text DEFAULT 'Authorized Signature',
ADD COLUMN IF NOT EXISTS show_signature_line boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS receipt_copies integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS watermark_text text;
-- RLS policies for parents to view their children's student_fees
CREATE POLICY "Parents can view their children's student fees"
ON public.student_fees
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT ps.student_id 
    FROM public.parent_students ps
    JOIN public.parents p ON ps.parent_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- RLS policies for parents to view their children's fee_payments
CREATE POLICY "Parents can view their children's fee payments"
ON public.fee_payments
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT ps.student_id 
    FROM public.parent_students ps
    JOIN public.parents p ON ps.parent_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- RLS policies for parents to view their children's report cards
CREATE POLICY "Parents can view their children's report cards"
ON public.student_report_cards
FOR SELECT
TO authenticated
USING (
  student_id IN (
    SELECT ps.student_id 
    FROM public.parent_students ps
    JOIN public.parents p ON ps.parent_id = p.id
    WHERE p.user_id = auth.uid()
  )
  AND status = 'published'
);
-- Create parent_issues table for reporting issues
CREATE TABLE public.parent_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  response TEXT,
  responded_by UUID,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.parent_issues ENABLE ROW LEVEL SECURITY;

-- Parents can view their own issues
CREATE POLICY "Parents can view their own issues"
ON public.parent_issues
FOR SELECT
TO authenticated
USING (
  parent_id IN (
    SELECT id FROM public.parents WHERE user_id = auth.uid()
  )
);

-- Parents can create issues for their children
CREATE POLICY "Parents can create issues for their children"
ON public.parent_issues
FOR INSERT
TO authenticated
WITH CHECK (
  parent_id IN (
    SELECT id FROM public.parents WHERE user_id = auth.uid()
  )
  AND student_id IN (
    SELECT ps.student_id 
    FROM public.parent_students ps
    JOIN public.parents p ON ps.parent_id = p.id
    WHERE p.user_id = auth.uid()
  )
);

-- Parents can update their open issues
CREATE POLICY "Parents can update their open issues"
ON public.parent_issues
FOR UPDATE
TO authenticated
USING (
  parent_id IN (
    SELECT id FROM public.parents WHERE user_id = auth.uid()
  )
  AND status = 'open'
);

-- Staff can manage all issues for their tenant
CREATE POLICY "Staff can manage tenant issues"
ON public.parent_issues
FOR ALL
TO authenticated
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_parent_issues_updated_at
  BEFORE UPDATE ON public.parent_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Add parent_login_code to tenants for parent portal access
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS parent_login_code TEXT UNIQUE;

-- CREATE OR REPLACE FUNCTION to generate a simple school code
CREATE OR REPLACE FUNCTION public.generate_parent_login_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character uppercase alphanumeric code
    code := UPPER(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM tenants WHERE parent_login_code = code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN code;
END;
$$;

-- Trigger to auto-generate parent_login_code on tenant creation
CREATE OR REPLACE FUNCTION public.set_tenant_parent_login_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_login_code IS NULL THEN
    NEW.parent_login_code := generate_parent_login_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_parent_login_code_trigger
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_parent_login_code();

-- Generate codes for existing tenants
UPDATE public.tenants 
SET parent_login_code = generate_parent_login_code() 
WHERE parent_login_code IS NULL;
-- Create a trigger function to auto-create parents record when a parent signs up
CREATE OR REPLACE FUNCTION public.handle_new_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only create parent record if role is 'parent' and tenant_id is provided
  IF NEW.raw_user_meta_data ->> 'role' = 'parent' 
     AND NEW.raw_user_meta_data ->> 'tenant_id' IS NOT NULL THEN
    INSERT INTO public.parents (
      user_id,
      tenant_id,
      full_name,
      email,
      phone
    ) VALUES (
      NEW.id,
      (NEW.raw_user_meta_data ->> 'tenant_id')::uuid,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      NEW.email,
      NEW.raw_user_meta_data ->> 'phone'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger on auth.users table
CREATE TRIGGER on_parent_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_parent();
-- Add the Parents module to business_modules
INSERT INTO public.business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
VALUES (
  'parents',
  'Parents',
  'Manage parent accounts and link them to students',
  'Users',
  'school',
  ARRAY['school'],
  false,
  true,
  38
);

-- Enable the parents module for all school tenants
INSERT INTO public.tenant_modules (tenant_id, module_code, is_enabled, enabled_at)
SELECT t.id, 'parents', true, now()
FROM tenants t
WHERE t.business_type = 'school'
ON CONFLICT (tenant_id, module_code) DO NOTHING;

-- Allow parents to view their linked students
CREATE POLICY "Parents can view their linked students"
ON public.students
FOR SELECT
USING (
  id IN (
    SELECT ps.student_id 
    FROM parent_students ps
    JOIN parents p ON ps.parent_id = p.id
    WHERE p.user_id = auth.uid()
  )
);
-- Add student ID format settings to school_settings table
ALTER TABLE public.school_settings
ADD COLUMN IF NOT EXISTS student_id_prefix TEXT DEFAULT 'STU',
ADD COLUMN IF NOT EXISTS student_id_digits INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS admission_prefix TEXT DEFAULT 'ADM',
ADD COLUMN IF NOT EXISTS admission_format TEXT DEFAULT 'ADM/{YY}/{NUMBER}';

COMMENT ON COLUMN public.school_settings.student_id_prefix IS 'Prefix for student ID (e.g., STU)';
COMMENT ON COLUMN public.school_settings.student_id_digits IS 'Number of digits for student ID number';
COMMENT ON COLUMN public.school_settings.admission_prefix IS 'Prefix for admission numbers';
COMMENT ON COLUMN public.school_settings.admission_format IS 'Format template for admission numbers';
-- =====================================
-- ECD/Kindergarten School System Tables
-- =====================================

-- 1. Learning Areas (replace subjects for kindergarten)
CREATE TABLE public.ecd_learning_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  icon TEXT, -- emoji or icon name
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default learning areas for kindergarten
INSERT INTO public.ecd_learning_areas (tenant_id, name, description, display_order, icon, is_active)
SELECT t.id, la.name, la.description, la.display_order, la.icon, true
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('Language Development', 'Speaking, listening, and communication skills', 1, 'ðŸ—£ï¸'),
    ('Literacy', 'Letters, reading readiness, and writing skills', 2, 'ðŸ“–'),
    ('Numeracy', 'Counting, numbers, shapes, and patterns', 3, 'ðŸ”¢'),
    ('Creative Arts & Craft', 'Drawing, painting, and creative expression', 4, 'ðŸŽ¨'),
    ('Music, Dance & Drama', 'Singing, dancing, and dramatic play', 5, 'ðŸŽµ'),
    ('Social & Emotional Skills', 'Sharing, cooperation, and emotional awareness', 6, 'ðŸ¤'),
    ('Health, Hygiene & Safety', 'Personal care and safety awareness', 7, 'ðŸ§¼'),
    ('Science Through Play', 'Exploration and discovery activities', 8, 'ðŸ”¬'),
    ('Games & Sports', 'Physical activities and motor skills', 9, 'âš½')
) AS la(name, description, display_order, icon)
WHERE t.business_type = 'kindergarten';

-- Enable RLS
ALTER TABLE public.ecd_learning_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant learning areas" ON public.ecd_learning_areas
FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- 2. Competency Rating Scale
CREATE TABLE public.ecd_rating_scale (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- e.g., 'outstanding', 'very_good', etc.
  label TEXT NOT NULL, -- e.g., 'Outstanding', 'Very Good'
  description TEXT, -- 'Skills mastered beyond expectation'
  icon TEXT, -- emoji like 'ðŸŒŸ'
  display_order INTEGER DEFAULT 0,
  color TEXT, -- hex color for display
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default rating scale
INSERT INTO public.ecd_rating_scale (tenant_id, code, label, description, icon, display_order, color, is_active)
SELECT t.id, rs.code, rs.label, rs.description, rs.icon, rs.display_order, rs.color, true
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('outstanding', 'Outstanding', 'Skills mastered beyond expectation', 'ðŸŒŸ', 1, '#FFD700'),
    ('very_good', 'Very Good', 'Skills well developed', 'ðŸ˜Š', 2, '#22C55E'),
    ('good', 'Good', 'Skills developing well', 'ðŸ‘', 3, '#3B82F6'),
    ('developing', 'Developing', 'Progress seen, needs more practice', 'ðŸ§©', 4, '#F59E0B'),
    ('needs_support', 'Needs Support', 'Requires close teacher/parent help', 'ðŸ†˜', 5, '#EF4444')
) AS rs(code, label, description, icon, display_order, color)
WHERE t.business_type = 'kindergarten';

-- Enable RLS
ALTER TABLE public.ecd_rating_scale ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant rating scale" ON public.ecd_rating_scale
FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- 3. Class Roles/Badges
CREATE TABLE public.ecd_class_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'Class Helper', 'Toys Captain'
  description TEXT,
  badge_icon TEXT, -- emoji like 'â­', 'ðŸ¼', 'ðŸŽ€'
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default class roles
INSERT INTO public.ecd_class_roles (tenant_id, name, description, badge_icon, display_order, is_active)
SELECT t.id, cr.name, cr.description, cr.badge_icon, cr.display_order, true
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('Class Helper', 'Assists the teacher with daily activities', 'â­', 1),
    ('Toys Captain', 'Manages and organizes classroom toys', 'ðŸ§¸', 2),
    ('Health Monitor', 'Reminds classmates about hygiene', 'ðŸ§¼', 3),
    ('MDD Leader', 'Leads music, dance and drama activities', 'ðŸŽµ', 4),
    ('Sports Captain', 'Leads games and sports activities', 'âš½', 5),
    ('Cleanliness Star', 'Promotes classroom cleanliness', 'âœ¨', 6),
    ('Reading Star', 'Encourages love for reading', 'ðŸ“š', 7),
    ('Art Captain', 'Helps with creative arts activities', 'ðŸŽ¨', 8)
) AS cr(name, description, badge_icon, display_order)
WHERE t.business_type = 'kindergarten';

-- Enable RLS
ALTER TABLE public.ecd_class_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant class roles" ON public.ecd_class_roles
FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- 4. Student Role Assignments
CREATE TABLE public.ecd_student_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.ecd_class_roles(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, role_id, term_id)
);

-- Enable RLS
ALTER TABLE public.ecd_student_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant student roles" ON public.ecd_student_roles
FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- 5. Generic Skills & Values to Track
CREATE TABLE public.ecd_skills_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'skill', -- 'skill' or 'value'
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default skills and values
INSERT INTO public.ecd_skills_values (tenant_id, name, category, description, display_order, is_active)
SELECT t.id, sv.name, sv.category, sv.description, sv.display_order, true
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('Sharing & Teamwork', 'skill', 'Works well with others and shares toys/materials', 1),
    ('Respect & Discipline', 'value', 'Shows respect to teachers and classmates', 2),
    ('Confidence & Communication', 'skill', 'Expresses self clearly and confidently', 3),
    ('Creativity & Curiosity', 'skill', 'Shows interest in learning and exploring', 4),
    ('Cleanliness & Hygiene', 'value', 'Maintains personal hygiene', 5),
    ('Helping Others', 'value', 'Willingly helps classmates and teachers', 6),
    ('Emotional Awareness', 'skill', 'Recognizes and manages own emotions', 7),
    ('Following Instructions', 'skill', 'Listens and follows directions', 8)
) AS sv(name, category, description, display_order)
WHERE t.business_type = 'kindergarten';

-- Enable RLS
ALTER TABLE public.ecd_skills_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant skills values" ON public.ecd_skills_values
FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- 6. ECD Report Cards
CREATE TABLE public.ecd_report_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.school_classes(id) ON DELETE SET NULL,
  -- Attendance summary
  total_school_days INTEGER DEFAULT 0,
  days_present INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  -- Comments
  teacher_comment TEXT,
  behavior_comment TEXT,
  parent_feedback TEXT, -- Parent can add response
  -- Signature
  teacher_name TEXT,
  teacher_signature_url TEXT,
  -- Metadata
  status TEXT DEFAULT 'draft', -- draft, published
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, term_id)
);

-- Enable RLS
ALTER TABLE public.ecd_report_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage their tenant report cards" ON public.ecd_report_cards
FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Parents can view their children report cards" ON public.ecd_report_cards
FOR SELECT USING (student_id IN (
  SELECT ps.student_id FROM parent_students ps
  JOIN parents p ON ps.parent_id = p.id
  WHERE p.user_id = auth.uid()
));

-- 7. Learning Area Ratings (per report card)
CREATE TABLE public.ecd_learning_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_card_id UUID NOT NULL REFERENCES public.ecd_report_cards(id) ON DELETE CASCADE,
  learning_area_id UUID NOT NULL REFERENCES public.ecd_learning_areas(id) ON DELETE CASCADE,
  rating_code TEXT NOT NULL, -- 'outstanding', 'very_good', etc.
  remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_card_id, learning_area_id)
);

-- Enable RLS
ALTER TABLE public.ecd_learning_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage learning ratings" ON public.ecd_learning_ratings
FOR ALL USING (report_card_id IN (
  SELECT id FROM ecd_report_cards WHERE tenant_id IN (
    SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
  )
));

CREATE POLICY "Parents can view their children learning ratings" ON public.ecd_learning_ratings
FOR SELECT USING (report_card_id IN (
  SELECT rc.id FROM ecd_report_cards rc
  JOIN students s ON rc.student_id = s.id
  WHERE s.id IN (
    SELECT ps.student_id FROM parent_students ps
    JOIN parents p ON ps.parent_id = p.id
    WHERE p.user_id = auth.uid()
  )
));

-- 8. Skills & Values Ratings (per report card)
CREATE TABLE public.ecd_skills_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_card_id UUID NOT NULL REFERENCES public.ecd_report_cards(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.ecd_skills_values(id) ON DELETE CASCADE,
  is_achieved BOOLEAN DEFAULT false, -- tick/check
  rating_code TEXT, -- optional rating
  remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_card_id, skill_id)
);

-- Enable RLS
ALTER TABLE public.ecd_skills_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage skills ratings" ON public.ecd_skills_ratings
FOR ALL USING (report_card_id IN (
  SELECT id FROM ecd_report_cards WHERE tenant_id IN (
    SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
  )
));

CREATE POLICY "Parents can view their children skills ratings" ON public.ecd_skills_ratings
FOR SELECT USING (report_card_id IN (
  SELECT rc.id FROM ecd_report_cards rc WHERE rc.student_id IN (
    SELECT ps.student_id FROM parent_students ps
    JOIN parents p ON ps.parent_id = p.id
    WHERE p.user_id = auth.uid()
  )
));

-- 9. Monthly Attendance for ECD
CREATE TABLE public.ecd_monthly_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  month INTEGER NOT NULL, -- 1-12
  year INTEGER NOT NULL,
  total_days INTEGER DEFAULT 0,
  days_present INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, term_id, month, year)
);

-- Enable RLS
ALTER TABLE public.ecd_monthly_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage monthly attendance" ON public.ecd_monthly_attendance
FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Parents can view their children attendance" ON public.ecd_monthly_attendance
FOR SELECT USING (student_id IN (
  SELECT ps.student_id FROM parent_students ps
  JOIN parents p ON ps.parent_id = p.id
  WHERE p.user_id = auth.uid()
));

-- 10. ECD Report Card Settings
CREATE TABLE public.ecd_report_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  -- Theme settings
  theme TEXT DEFAULT 'playful', -- 'playful', 'classic', 'modern', 'nature'
  primary_color TEXT DEFAULT '#FF6B9D',
  secondary_color TEXT DEFAULT '#4ECDC4',
  -- Display options
  show_attendance BOOLEAN DEFAULT true,
  show_roles BOOLEAN DEFAULT true,
  show_skills BOOLEAN DEFAULT true,
  show_values BOOLEAN DEFAULT true,
  show_parent_tips BOOLEAN DEFAULT true,
  show_photo BOOLEAN DEFAULT true,
  -- Report info
  report_title TEXT DEFAULT 'Progress Report Card',
  watermark_text TEXT,
  footer_message TEXT DEFAULT 'Every child is a star! â­',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ecd_report_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant report settings" ON public.ecd_report_settings
FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Add ECD-specific fields to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS ecd_level TEXT, -- 'baby_class', 'middle_class', 'top_class'
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS nin_optional TEXT;
-- Add admission_status column to students table for enrollment workflow tracking
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS admission_status text NOT NULL DEFAULT 'pending';

-- Add payment_status for tracking enrollment payment
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';

-- Add orientation_completed flag
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS orientation_completed boolean DEFAULT false;

-- Add parent_portal_access flag
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS parent_portal_access boolean DEFAULT false;

-- Add suggested_class_level for age-based suggestion (for ECD)
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS suggested_class_level text;

-- Create index for admission status queries
CREATE INDEX IF NOT EXISTS idx_students_admission_status ON public.students(tenant_id, admission_status);

-- Comment on columns for documentation
COMMENT ON COLUMN public.students.admission_status IS 'Enrollment status: pending, approved, enrolled, rejected';
COMMENT ON COLUMN public.students.payment_status IS 'Payment status: unpaid, partial, paid';
COMMENT ON COLUMN public.students.ecd_level IS 'ECD class level: ecd1 (Baby Class 3-4yrs), ecd2 (Middle Class 4-5yrs), ecd3 (Top Class 5-6yrs)';

-- Create discipline cases table
CREATE TABLE public.discipline_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  case_number TEXT NOT NULL,
  incident_date DATE NOT NULL DEFAULT CURRENT_DATE,
  incident_type TEXT NOT NULL, -- 'minor_offense', 'major_offense', 'behavioral', 'academic_dishonesty', 'bullying', 'vandalism', 'other'
  incident_description TEXT NOT NULL,
  location TEXT,
  witnesses TEXT,
  reported_by UUID REFERENCES auth.users(id),
  action_taken TEXT NOT NULL, -- 'warning', 'detention', 'suspension', 'expulsion', 'counseling', 'parent_meeting', 'community_service'
  action_details TEXT,
  suspension_start_date DATE,
  suspension_end_date DATE,
  expulsion_date DATE,
  is_permanent_expulsion BOOLEAN DEFAULT false,
  parent_notified BOOLEAN DEFAULT false,
  parent_notified_at TIMESTAMP WITH TIME ZONE,
  parent_notified_by UUID,
  parent_acknowledged BOOLEAN DEFAULT false,
  parent_acknowledged_at TIMESTAMP WITH TIME ZONE,
  parent_response TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'under_review', 'resolved', 'appealed', 'closed'
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_discipline_cases_tenant ON public.discipline_cases(tenant_id);
CREATE INDEX idx_discipline_cases_student ON public.discipline_cases(student_id);
CREATE INDEX idx_discipline_cases_status ON public.discipline_cases(status);
CREATE INDEX idx_discipline_cases_action ON public.discipline_cases(action_taken);

-- Enable RLS
ALTER TABLE public.discipline_cases ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff
CREATE POLICY "Staff can view their tenant discipline cases"
  ON public.discipline_cases FOR SELECT
  USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Staff can insert discipline cases for their tenant"
  ON public.discipline_cases FOR INSERT
  WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Staff can update their tenant discipline cases"
  ON public.discipline_cases FOR UPDATE
  USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Staff can delete their tenant discipline cases"
  ON public.discipline_cases FOR DELETE
  USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Parents can view discipline cases for their children
CREATE POLICY "Parents can view their children discipline cases"
  ON public.discipline_cases FOR SELECT
  USING (student_id IN (
    SELECT ps.student_id FROM parent_students ps
    JOIN parents p ON ps.parent_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- Parents can update acknowledgment on their children's cases
CREATE POLICY "Parents can acknowledge their children discipline cases"
  ON public.discipline_cases FOR UPDATE
  USING (student_id IN (
    SELECT ps.student_id FROM parent_students ps
    JOIN parents p ON ps.parent_id = p.id
    WHERE p.user_id = auth.uid()
  ));

-- Auto-generate case number trigger
CREATE OR REPLACE FUNCTION public.generate_discipline_case_number()
RETURNS TRIGGER AS $$
DECLARE
  case_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO case_count 
  FROM public.discipline_cases 
  WHERE tenant_id = NEW.tenant_id 
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  NEW.case_number := 'DC-' || year_prefix || '-' || LPAD(case_count::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_discipline_case_number
  BEFORE INSERT ON public.discipline_cases
  FOR EACH ROW
  WHEN (NEW.case_number IS NULL OR NEW.case_number = '')
  EXECUTE FUNCTION public.generate_discipline_case_number();

-- Update timestamp trigger
CREATE TRIGGER update_discipline_cases_updated_at
  BEFORE UPDATE ON public.discipline_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add fee_balance_threshold to tenants for controlling when parents can view reports
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS fee_balance_threshold numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'active';

-- Create send_home_records table for marking students to be sent home
CREATE TABLE IF NOT EXISTS public.send_home_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  send_home_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL,
  reason_category text NOT NULL DEFAULT 'fees', -- fees, discipline, health, other
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  notified_parent boolean DEFAULT false,
  notified_at timestamp with time zone,
  gate_blocked boolean DEFAULT true,
  cleared_by uuid REFERENCES auth.users(id),
  cleared_at timestamp with time zone,
  cleared_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_send_home_records_tenant_date ON public.send_home_records(tenant_id, send_home_date);
CREATE INDEX IF NOT EXISTS idx_send_home_records_student_active ON public.send_home_records(student_id, is_active);

-- Enable RLS
ALTER TABLE public.send_home_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for send_home_records
CREATE POLICY "Users can view their tenant send home records"
ON public.send_home_records
FOR SELECT
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert send home records for their tenant"
ON public.send_home_records
FOR INSERT
WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update their tenant send home records"
ON public.send_home_records
FOR UPDATE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete their tenant send home records"
ON public.send_home_records
FOR DELETE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_send_home_records_updated_at
BEFORE UPDATE ON public.send_home_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Add class_rank column to ecd_report_cards
ALTER TABLE public.ecd_report_cards 
ADD COLUMN IF NOT EXISTS class_rank integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS total_students_in_class integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS head_teacher_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS head_teacher_comment text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS average_score numeric(5,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_prefect boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS monthly_attendance jsonb DEFAULT '[]'::jsonb;

-- Add numeric_score to ecd_learning_ratings for calculations
ALTER TABLE public.ecd_learning_ratings 
ADD COLUMN IF NOT EXISTS numeric_score integer DEFAULT NULL;

-- Add unique constraint for upsert on learning ratings
ALTER TABLE public.ecd_learning_ratings 
DROP CONSTRAINT IF EXISTS ecd_learning_ratings_report_area_unique;
ALTER TABLE public.ecd_learning_ratings 
ADD CONSTRAINT ecd_learning_ratings_report_area_unique UNIQUE (report_card_id, learning_area_id);

-- Add unique constraint for upsert on skills ratings  
ALTER TABLE public.ecd_skills_ratings 
DROP CONSTRAINT IF EXISTS ecd_skills_ratings_report_skill_unique;
ALTER TABLE public.ecd_skills_ratings 
ADD CONSTRAINT ecd_skills_ratings_report_skill_unique UNIQUE (report_card_id, skill_id);

-- Add authorized_pickups column to students for ECD ID card back
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS authorized_pickups jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ecd_role_badge text DEFAULT NULL;

-- Update ecd_rating_scale to support 1-4 scoring
ALTER TABLE public.ecd_rating_scale 
ADD COLUMN IF NOT EXISTS numeric_value integer DEFAULT NULL;
-- Insert ECD-specific modules into business_modules
INSERT INTO public.business_modules (code, name, description, icon, category, is_core, is_active, display_order, applicable_business_types)
VALUES 
  ('ecd_pupils', 'ECD Pupils', 'Manage kindergarten learners and enrollment', 'Users', 'academics', false, true, 5, ARRAY['kindergarten']),
  ('ecd_progress', 'ECD Progress', 'Track developmental progress and report cards', 'Award', 'academics', false, true, 6, ARRAY['kindergarten']),
  ('ecd_roles', 'Class Roles', 'Manage class roles like Class Monitor, Line Leader', 'Sparkles', 'academics', false, true, 7, ARRAY['kindergarten']),
  ('ecd_learning_areas', 'Learning Areas', 'Manage learning areas for assessment', 'BookOpen', 'academics', false, true, 8, ARRAY['kindergarten'])
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  applicable_business_types = EXCLUDED.applicable_business_types,
  is_active = true;
-- Enable realtime for gate_checkins table
ALTER TABLE gate_checkins REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gate_checkins;
-- Drop and recreate policies to ensure INSERT works correctly
DROP POLICY IF EXISTS "Staff can manage parent-student links" ON parent_students;

-- Create separate policies for each operation
CREATE POLICY "Staff can view parent-student links" 
ON parent_students 
FOR SELECT 
USING (tenant_id IN (
  SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
));

CREATE POLICY "Staff can insert parent-student links" 
ON parent_students 
FOR INSERT 
WITH CHECK (tenant_id IN (
  SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
));

CREATE POLICY "Staff can update parent-student links" 
ON parent_students 
FOR UPDATE 
USING (tenant_id IN (
  SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
));

CREATE POLICY "Staff can delete parent-student links" 
ON parent_students 
FOR DELETE 
USING (tenant_id IN (
  SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
));
-- Create a security definer function to link parent to student
-- This bypasses RLS since it runs with elevated privileges
CREATE OR REPLACE FUNCTION public.link_parent_to_student(
  p_parent_id UUID,
  p_student_id UUID,
  p_tenant_id UUID,
  p_relationship TEXT,
  p_is_primary_contact BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_link_id UUID;
BEGIN
  INSERT INTO parent_students (
    parent_id,
    student_id,
    tenant_id,
    relationship,
    is_primary_contact
  ) VALUES (
    p_parent_id,
    p_student_id,
    p_tenant_id,
    p_relationship,
    p_is_primary_contact
  )
  RETURNING id INTO v_link_id;
  
  RETURN v_link_id;
END;
$$;
-- Create table for ECD learning activities (Writing, Listening, Reading, Speaking, Drawing, Games, etc.)
CREATE TABLE public.ecd_learning_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'ðŸ“',
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ecd_learning_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their tenant activities" ON public.ecd_learning_activities
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage their tenant activities" ON public.ecd_learning_activities
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create table for storing activity ratings per report card
CREATE TABLE public.ecd_activity_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_card_id UUID NOT NULL REFERENCES ecd_report_cards(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES ecd_learning_activities(id) ON DELETE CASCADE,
  rating_code TEXT NOT NULL, -- e.g. 'EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR', 'NEEDS_IMPROVEMENT'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(report_card_id, activity_id)
);

-- Enable RLS
ALTER TABLE public.ecd_activity_ratings ENABLE ROW LEVEL SECURITY;

-- RLS policies  
CREATE POLICY "Users can view activity ratings" ON public.ecd_activity_ratings
  FOR SELECT USING (
    report_card_id IN (
      SELECT id FROM ecd_report_cards WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage activity ratings" ON public.ecd_activity_ratings
  FOR ALL USING (
    report_card_id IN (
      SELECT id FROM ecd_report_cards WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- Add new columns to ecd_report_cards for the Ugandan format
ALTER TABLE public.ecd_report_cards 
  ADD COLUMN IF NOT EXISTS total_score NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fees_balance NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS next_term_fees NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS term_closing_date DATE,
  ADD COLUMN IF NOT EXISTS next_term_start_date DATE;

-- Add numeric_score column to ecd_learning_ratings if it doesn't support 100-point scale
-- Update it to store scores out of 100 instead of 1-4
ALTER TABLE public.ecd_learning_ratings 
  ALTER COLUMN numeric_score TYPE NUMERIC(5,1);

-- Add remark field if not exists (for EXCELLENT, GOOD, etc.)
ALTER TABLE public.ecd_learning_ratings
  ADD COLUMN IF NOT EXISTS grade_remark TEXT;
-- Add comment field to ecd_activity_ratings for teacher comments on learning activities
ALTER TABLE public.ecd_activity_ratings 
ADD COLUMN IF NOT EXISTS comment text;
-- Add package_type column to distinguish installation from subscription packages
ALTER TABLE packages 
ADD COLUMN package_type text NOT NULL DEFAULT 'subscription';

-- Add includes_hardware column to track what hardware is included
ALTER TABLE packages 
ADD COLUMN includes_hardware jsonb DEFAULT NULL;

-- Add training_days column for training duration
ALTER TABLE packages 
ADD COLUMN training_days integer DEFAULT NULL;

-- Add is_one_time column for one-time payments
ALTER TABLE packages 
ADD COLUMN is_one_time boolean NOT NULL DEFAULT false;

-- Add display_order for sorting
ALTER TABLE packages 
ADD COLUMN display_order integer DEFAULT 0;

-- Create installation purchases table to track installation package orders
CREATE TABLE public.installation_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  
  -- Selected subscription package to start with
  selected_subscription_id UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  
  -- Payment details
  total_amount NUMERIC NOT NULL DEFAULT 950000,
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_plan TEXT NOT NULL DEFAULT 'full', -- 'full', '2_installments', '3_installments'
  
  -- Free subscription period
  free_months INTEGER NOT NULL DEFAULT 2,
  subscription_start_date DATE,
  first_payment_due_date DATE, -- When customer starts paying subscription
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'deposit_paid', 'partially_paid', 'fully_paid', 'installed', 'active', 'refunded', 'cancelled'
  installation_date DATE,
  installation_notes TEXT,
  
  -- Refund policy
  satisfaction_confirmed BOOLEAN DEFAULT FALSE,
  satisfaction_confirmed_at TIMESTAMP WITH TIME ZONE,
  refund_requested BOOLEAN DEFAULT FALSE,
  refund_requested_at TIMESTAMP WITH TIME ZONE,
  refund_reason TEXT,
  refund_amount NUMERIC DEFAULT 0,
  refunded_at TIMESTAMP WITH TIME ZONE,
  
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create installation payments table to track installment payments
CREATE TABLE public.installation_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  installation_id UUID NOT NULL REFERENCES public.installation_purchases(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'mobile_money', 'bank_transfer'
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  installment_number INTEGER NOT NULL DEFAULT 1, -- 1st, 2nd, or 3rd payment
  reference_number TEXT,
  notes TEXT,
  received_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.installation_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installation_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for installation_purchases (admin only)
CREATE POLICY "Admins can manage installation purchases"
ON public.installation_purchases
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('superadmin', 'admin')
  )
);

-- RLS policies for installation_payments (admin only)
CREATE POLICY "Admins can manage installation payments"
ON public.installation_payments
FOR ALL
USING (
  installation_id IN (
    SELECT id FROM installation_purchases
    WHERE EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('superadmin', 'admin')
    )
  )
);

-- Update trigger for updated_at
CREATE TRIGGER update_installation_purchases_updated_at
BEFORE UPDATE ON public.installation_purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update packages table to mark subscription packages and add free_months field
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS free_months_with_installation INTEGER DEFAULT 2;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT TRUE;
-- Create announcements table for admin broadcasts
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'active', 'pending', 'specific_package')),
  target_package_id UUID REFERENCES public.packages(id),
  is_active BOOLEAN DEFAULT true,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id),
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'billing', 'technical', 'feature_request', 'bug_report')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_response', 'resolved', 'closed')),
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support ticket messages table
CREATE TABLE public.support_ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id),
  sender_type TEXT NOT NULL DEFAULT 'tenant' CHECK (sender_type IN ('tenant', 'admin')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for announcements (admins can manage, tenants can view active)
CREATE POLICY "Admins can manage announcements" ON public.announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('superadmin', 'admin'))
  );

CREATE POLICY "Tenants can view active announcements" ON public.announcements
  FOR SELECT USING (is_active = true AND (published_at IS NULL OR published_at <= now()) AND (expires_at IS NULL OR expires_at > now()));

-- RLS policies for support tickets
CREATE POLICY "Admins can manage all tickets" ON public.support_tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('superadmin', 'admin'))
  );

CREATE POLICY "Tenants can view own tickets" ON public.support_tickets
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Tenants can create tickets" ON public.support_tickets
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

-- RLS policies for ticket messages
CREATE POLICY "Admins can manage all messages" ON public.support_ticket_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('superadmin', 'admin'))
  );

CREATE POLICY "Users can view messages on their tickets" ON public.support_ticket_messages
  FOR SELECT USING (
    ticket_id IN (
      SELECT id FROM support_tickets WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can add messages to their tickets" ON public.support_ticket_messages
  FOR INSERT WITH CHECK (
    ticket_id IN (
      SELECT id FROM support_tickets WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Function to generate ticket numbers
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  ticket_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO ticket_count 
  FROM public.support_tickets 
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  NEW.ticket_number := 'TKT-' || year_prefix || '-' || LPAD(ticket_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

-- Trigger for auto-generating ticket numbers
CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_ticket_number();

-- Trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Add trial fields to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS is_trial boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_days integer DEFAULT 14;
-- Drop and recreate the create_tenant_for_signup function to start users with a free trial
DROP FUNCTION IF EXISTS public.create_tenant_for_signup(text, text, text, text, text, uuid, text);

CREATE OR REPLACE FUNCTION public.create_tenant_for_signup(
  p_name TEXT,
  p_business_type TEXT,
  p_address TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_package_id UUID,
  p_referred_by_code TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_trial_days INT := 14;
BEGIN
  INSERT INTO tenants (
    name, 
    business_type, 
    address, 
    phone, 
    email, 
    package_id, 
    referred_by_code, 
    status,
    is_trial,
    trial_days,
    trial_end_date,
    activated_at
  )
  VALUES (
    p_name, 
    p_business_type, 
    p_address, 
    p_phone, 
    p_email, 
    p_package_id, 
    p_referred_by_code, 
    'active',
    true,
    v_trial_days,
    (now() + (v_trial_days || ' days')::interval)::date,
    now()
  )
  RETURNING id INTO v_tenant_id;
  
  RETURN v_tenant_id;
END;
$$;
-- Add unique business code to tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS business_code TEXT UNIQUE;

-- CREATE OR REPLACE FUNCTION to generate unique 6-char alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_business_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6 char uppercase alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.tenants WHERE business_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Generate codes for existing tenants that don't have one
UPDATE public.tenants 
SET business_code = public.generate_business_code()
WHERE business_code IS NULL;

-- Make business_code NOT NULL after populating existing records
ALTER TABLE public.tenants 
ALTER COLUMN business_code SET NOT NULL;

-- Create trigger to auto-generate code for new tenants
CREATE OR REPLACE FUNCTION public.set_tenant_business_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.business_code IS NULL THEN
    NEW.business_code := public.generate_business_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_tenant_business_code ON public.tenants;
CREATE TRIGGER trigger_set_tenant_business_code
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_business_code();

-- Add password field to staff_invitations for storing generated password
ALTER TABLE public.staff_invitations 
ADD COLUMN IF NOT EXISTS generated_password TEXT;
-- Fix function search path for generate_business_code
CREATE OR REPLACE FUNCTION public.generate_business_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.tenants WHERE business_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;
-- Add policy for tenant owners to view all profiles within their tenant
CREATE POLICY "Tenant owners can view tenant profiles"
ON public.profiles
FOR SELECT
USING (
  tenant_id = (
    SELECT tenant_id FROM profiles WHERE id = auth.uid()
  )
  AND (
    SELECT role FROM profiles WHERE id = auth.uid()
  ) = 'tenant_owner'
);
-- Drop the problematic policy
DROP POLICY IF EXISTS "Tenant owners can view tenant profiles" ON public.profiles;

-- Create a security definer function to get user's tenant_id and role
CREATE OR REPLACE FUNCTION public.get_user_tenant_info(user_id uuid)
RETURNS TABLE(tenant_id uuid, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.tenant_id, p.role::text 
  FROM public.profiles p 
  WHERE p.id = user_id
$$;

-- Create proper policy for tenant owners to view profiles in their tenant
CREATE POLICY "Tenant owners can view tenant profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.get_user_tenant_info(auth.uid()) AS u
    WHERE u.role = 'tenant_owner' 
    AND profiles.tenant_id = u.tenant_id
  )
);
-- Add product_type and allow_custom_price columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'product',
ADD COLUMN IF NOT EXISTS allow_custom_price boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.products.product_type IS 'Type of product: product or service';
COMMENT ON COLUMN public.products.allow_custom_price IS 'Allow custom price entry at POS for variable-priced services';
-- Create sale_returns table to track returns, refunds, and exchanges
CREATE TABLE public.sale_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  return_type TEXT NOT NULL CHECK (return_type IN ('refund', 'void', 'exchange')),
  reason TEXT NOT NULL,
  total_refund_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  processed_by UUID REFERENCES auth.users(id),
  exchange_sale_id UUID REFERENCES public.sales(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sale_return_items to track which items were returned
CREATE TABLE public.sale_return_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id UUID NOT NULL REFERENCES public.sale_returns(id) ON DELETE CASCADE,
  sale_item_id UUID REFERENCES public.sale_items(id),
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  refund_amount NUMERIC NOT NULL,
  restock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add return_status column to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS return_status TEXT DEFAULT NULL CHECK (return_status IS NULL OR return_status IN ('partial_return', 'full_return', 'voided', 'exchanged'));

-- Enable RLS
ALTER TABLE public.sale_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_return_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for sale_returns
CREATE POLICY "Users can view their tenant returns"
ON public.sale_returns FOR SELECT
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can insert returns for their tenant"
ON public.sale_returns FOR INSERT
WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can update their tenant returns"
ON public.sale_returns FOR UPDATE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Users can delete their tenant returns"
ON public.sale_returns FOR DELETE
USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS policies for sale_return_items
CREATE POLICY "Users can view return items"
ON public.sale_return_items FOR SELECT
USING (return_id IN (SELECT id FROM sale_returns WHERE tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

CREATE POLICY "Users can insert return items"
ON public.sale_return_items FOR INSERT
WITH CHECK (return_id IN (SELECT id FROM sale_returns WHERE tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

CREATE POLICY "Users can update return items"
ON public.sale_return_items FOR UPDATE
USING (return_id IN (SELECT id FROM sale_returns WHERE tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));

CREATE POLICY "Users can delete return items"
ON public.sale_return_items FOR DELETE
USING (return_id IN (SELECT id FROM sale_returns WHERE tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid())));
-- Repair Jobs table
CREATE TABLE public.repair_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  job_ref TEXT NOT NULL,
  device_type TEXT NOT NULL,
  device_model TEXT,
  device_imei TEXT,
  device_serial_number TEXT,
  device_state_before TEXT,
  fault_description TEXT NOT NULL,
  diagnosis TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'waiting_parts', 'completed', 'ready', 'delivered', 'collected', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  qr_code_data TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Repair Job Items (services and parts used)
CREATE TABLE public.repair_job_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
  item_id UUID,
  item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product', 'part')),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Repair Job Payments
CREATE TABLE public.repair_job_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_reference TEXT,
  receipt_number TEXT,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  received_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Spare Parts inventory (separate from products for repair shops)
CREATE TABLE public.spare_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  category TEXT,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  reorder_level INTEGER DEFAULT 5,
  supplier TEXT,
  compatible_devices TEXT[], -- Array of device types this part is compatible with
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.repair_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_job_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for repair_jobs
CREATE POLICY "Users can view their tenant repair jobs"
ON public.repair_jobs FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert repair jobs for their tenant"
ON public.repair_jobs FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant repair jobs"
ON public.repair_jobs FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant repair jobs"
ON public.repair_jobs FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for repair_job_items
CREATE POLICY "Users can view job items"
ON public.repair_job_items FOR SELECT
USING (job_id IN (SELECT id FROM repair_jobs WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can insert job items"
ON public.repair_job_items FOR INSERT
WITH CHECK (job_id IN (SELECT id FROM repair_jobs WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can update job items"
ON public.repair_job_items FOR UPDATE
USING (job_id IN (SELECT id FROM repair_jobs WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can delete job items"
ON public.repair_job_items FOR DELETE
USING (job_id IN (SELECT id FROM repair_jobs WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

-- RLS Policies for repair_job_payments
CREATE POLICY "Users can view their tenant job payments"
ON public.repair_job_payments FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert job payments for their tenant"
ON public.repair_job_payments FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant job payments"
ON public.repair_job_payments FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant job payments"
ON public.repair_job_payments FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for spare_parts
CREATE POLICY "Users can view their tenant spare parts"
ON public.spare_parts FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert spare parts for their tenant"
ON public.spare_parts FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant spare parts"
ON public.spare_parts FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant spare parts"
ON public.spare_parts FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Function to generate job reference number
CREATE OR REPLACE FUNCTION public.generate_job_ref()
RETURNS TRIGGER AS $$
DECLARE
  job_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO job_count 
  FROM public.repair_jobs 
  WHERE tenant_id = NEW.tenant_id 
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  NEW.job_ref := 'JOB-' || year_prefix || '-' || LPAD(job_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-generate job ref
CREATE TRIGGER set_job_ref
  BEFORE INSERT ON public.repair_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_job_ref();

-- Update timestamp trigger for repair_jobs
CREATE TRIGGER update_repair_jobs_updated_at
  BEFORE UPDATE ON public.repair_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamp trigger for spare_parts
CREATE TRIGGER update_spare_parts_updated_at
  BEFORE UPDATE ON public.spare_parts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add repair shop modules to business_modules
INSERT INTO public.business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
VALUES 
  ('jobs', 'Repair Jobs', 'Track and manage repair jobs', 'Wrench', 'repair', ARRAY['garage', 'tech_repair', 'repair_shop'], false, true, 35),
  ('parts', 'Spare Parts', 'Manage spare parts inventory', 'Cog', 'repair', ARRAY['garage', 'tech_repair', 'car_spares', 'repair_shop'], false, true, 36)
ON CONFLICT (code) DO UPDATE SET
  applicable_business_types = EXCLUDED.applicable_business_types,
  is_active = true;

-- Create indexes for better performance
CREATE INDEX idx_repair_jobs_tenant ON public.repair_jobs(tenant_id);
CREATE INDEX idx_repair_jobs_status ON public.repair_jobs(status);
CREATE INDEX idx_repair_jobs_customer ON public.repair_jobs(customer_id);
CREATE INDEX idx_repair_job_items_job ON public.repair_job_items(job_id);
CREATE INDEX idx_spare_parts_tenant ON public.spare_parts(tenant_id);
CREATE INDEX idx_spare_parts_category ON public.spare_parts(category);
-- Add technician payment tracking fields to repair_jobs
ALTER TABLE public.repair_jobs
ADD COLUMN IF NOT EXISTS technician_fee numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS technician_paid boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS technician_paid_at timestamp with time zone;
-- Allow public read access to repair_jobs for status lookup (only limited fields via application)
CREATE POLICY "Anyone can view job status by ref"
ON public.repair_jobs
FOR SELECT
USING (true);
-- Add A-Level specific columns to report_card_scores
ALTER TABLE report_card_scores 
ADD COLUMN IF NOT EXISTS formative_a1 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS formative_a2 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS formative_a3 numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS formative_avg numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS eot_score numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS summative_grade text,
ADD COLUMN IF NOT EXISTS teacher_initials text;

-- Add A-Level specific columns to student_report_cards
ALTER TABLE student_report_cards 
ADD COLUMN IF NOT EXISTS student_combination text,
ADD COLUMN IF NOT EXISTS stream text,
ADD COLUMN IF NOT EXISTS roll_number text,
ADD COLUMN IF NOT EXISTS overall_identifier text,
ADD COLUMN IF NOT EXISTS overall_achievement text,
ADD COLUMN IF NOT EXISTS overall_grade text,
ADD COLUMN IF NOT EXISTS term_end_date date,
ADD COLUMN IF NOT EXISTS next_term_start_date date,
ADD COLUMN IF NOT EXISTS fees_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS next_term_fees numeric DEFAULT 0;

-- Add project work columns to report_card_activities  
ALTER TABLE report_card_activities
ADD COLUMN IF NOT EXISTS average_score numeric,
ADD COLUMN IF NOT EXISTS grade text,
ADD COLUMN IF NOT EXISTS teacher_initials text;
-- Rental Properties table
CREATE TABLE public.rental_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  property_type TEXT NOT NULL DEFAULT 'apartment', -- apartment, house, commercial, etc.
  total_units INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  amenities JSONB DEFAULT '[]'::jsonb,
  year_built INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rental Units table
CREATE TABLE public.rental_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  floor_number INTEGER,
  bedrooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  size_sqm NUMERIC,
  monthly_rent NUMERIC NOT NULL DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available', -- available, occupied, maintenance, reserved
  amenities JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rental Tenants (people renting, different from app tenants)
CREATE TABLE public.rental_tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  id_number TEXT,
  id_type TEXT DEFAULT 'national_id', -- national_id, passport, etc.
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  occupation TEXT,
  employer TEXT,
  monthly_income NUMERIC,
  previous_address TEXT,
  previous_landlord_contact TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive, blacklisted
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Leases table
CREATE TABLE public.leases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.rental_units(id) ON DELETE CASCADE,
  rental_tenant_id UUID NOT NULL REFERENCES public.rental_tenants(id) ON DELETE CASCADE,
  lease_number TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent NUMERIC NOT NULL,
  deposit_amount NUMERIC DEFAULT 0,
  deposit_paid NUMERIC DEFAULT 0,
  payment_due_day INTEGER DEFAULT 1, -- Day of month rent is due
  late_fee_amount NUMERIC DEFAULT 0,
  late_fee_grace_days INTEGER DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active', -- draft, active, expired, terminated, renewed
  terms_and_conditions TEXT,
  special_conditions TEXT,
  move_in_date DATE,
  move_out_date DATE,
  renewal_reminder_days INTEGER DEFAULT 30,
  auto_renew BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rental Payments table
CREATE TABLE public.rental_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  rental_tenant_id UUID NOT NULL REFERENCES public.rental_tenants(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'cash', -- cash, bank_transfer, mobile_money, cheque
  reference_number TEXT,
  payment_type TEXT NOT NULL DEFAULT 'rent', -- rent, deposit, late_fee, utility, other
  status TEXT NOT NULL DEFAULT 'completed', -- pending, completed, failed, refunded
  late_fee_applied NUMERIC DEFAULT 0,
  notes TEXT,
  received_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Maintenance Requests table
CREATE TABLE public.maintenance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.rental_units(id) ON DELETE CASCADE,
  rental_tenant_id UUID REFERENCES public.rental_tenants(id),
  request_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general', -- plumbing, electrical, hvac, appliance, structural, general
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, emergency
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, scheduled, completed, cancelled
  scheduled_date DATE,
  completed_date DATE,
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  contractor_name TEXT,
  contractor_phone TEXT,
  resolution_notes TEXT,
  reported_by TEXT,
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rental Documents table
CREATE TABLE public.rental_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  rental_tenant_id UUID REFERENCES public.rental_tenants(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.rental_properties(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL, -- lease_agreement, id_copy, inspection_report, notice, receipt, other
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rental Messages table
CREATE TABLE public.rental_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rental_tenant_id UUID REFERENCES public.rental_tenants(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'manager', -- manager, tenant
  sender_id UUID,
  is_read BOOLEAN DEFAULT false,
  parent_message_id UUID REFERENCES public.rental_messages(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Property Inspections table
CREATE TABLE public.property_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.rental_units(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  inspection_type TEXT NOT NULL DEFAULT 'move_in', -- move_in, move_out, routine, complaint
  inspection_date DATE NOT NULL,
  inspector_name TEXT,
  overall_condition TEXT DEFAULT 'good', -- excellent, good, fair, poor
  notes TEXT,
  findings JSONB DEFAULT '[]'::jsonb,
  tenant_signature_url TEXT,
  manager_signature_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.rental_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_inspections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rental_properties
CREATE POLICY "Users can manage their tenant properties" ON public.rental_properties
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for rental_units
CREATE POLICY "Users can manage their tenant units" ON public.rental_units
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for rental_tenants
CREATE POLICY "Users can manage their rental tenants" ON public.rental_tenants
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for leases
CREATE POLICY "Users can manage their tenant leases" ON public.leases
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for rental_payments
CREATE POLICY "Users can manage their tenant payments" ON public.rental_payments
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for maintenance_requests
CREATE POLICY "Users can manage their tenant maintenance" ON public.maintenance_requests
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for rental_documents
CREATE POLICY "Users can manage their tenant documents" ON public.rental_documents
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for rental_messages
CREATE POLICY "Users can manage their tenant messages" ON public.rental_messages
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for property_inspections
CREATE POLICY "Users can manage their tenant inspections" ON public.property_inspections
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Function to generate lease number
CREATE OR REPLACE FUNCTION public.generate_lease_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lease_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO lease_count 
  FROM public.leases 
  WHERE tenant_id = NEW.tenant_id 
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  NEW.lease_number := 'LSE-' || year_prefix || '-' || LPAD(lease_count::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Trigger for lease number
CREATE TRIGGER set_lease_number
  BEFORE INSERT ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_lease_number();

-- Function to generate maintenance request number
CREATE OR REPLACE FUNCTION public.generate_maintenance_request_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO request_count 
  FROM public.maintenance_requests 
  WHERE tenant_id = NEW.tenant_id 
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  NEW.request_number := 'MNT-' || year_prefix || '-' || LPAD(request_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

-- Trigger for maintenance request number
CREATE TRIGGER set_maintenance_request_number
  BEFORE INSERT ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_maintenance_request_number();

-- Add updated_at triggers
CREATE TRIGGER update_rental_properties_updated_at BEFORE UPDATE ON public.rental_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_units_updated_at BEFORE UPDATE ON public.rental_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_tenants_updated_at BEFORE UPDATE ON public.rental_tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert rental management modules
INSERT INTO public.business_modules (code, name, category, description, icon, applicable_business_types, display_order, is_core)
VALUES 
  ('rental_dashboard', 'Dashboard', 'core', 'Rental management overview', 'LayoutDashboard', ARRAY['rental_management'], 1, true),
  ('rental_properties', 'Properties', 'property', 'Manage rental properties', 'Building2', ARRAY['rental_management'], 2, true),
  ('rental_units', 'Units', 'property', 'Manage rental units', 'DoorOpen', ARRAY['rental_management'], 3, true),
  ('rental_tenants', 'Tenants', 'people', 'Manage rental tenants', 'Users', ARRAY['rental_management'], 4, true),
  ('rental_leases', 'Leases', 'legal', 'Manage lease agreements', 'FileText', ARRAY['rental_management'], 5, true),
  ('rental_payments', 'Payments', 'finance', 'Track rental payments', 'Wallet', ARRAY['rental_management'], 6, true),
  ('rental_maintenance', 'Maintenance', 'operations', 'Maintenance requests', 'Wrench', ARRAY['rental_management'], 7, true),
  ('rental_inspections', 'Inspections', 'operations', 'Property inspections', 'ClipboardCheck', ARRAY['rental_management'], 8, false),
  ('rental_documents', 'Documents', 'admin', 'Document storage', 'FolderOpen', ARRAY['rental_management'], 9, false),
  ('rental_messages', 'Messages', 'communication', 'Tenant communication', 'MessageSquare', ARRAY['rental_management'], 10, false),
  ('rental_reports', 'Reports', 'analytics', 'Financial reports', 'BarChart3', ARRAY['rental_management'], 11, false)
ON CONFLICT (code) DO NOTHING;
-- Create tenant_backups table to store backup data before deletion
CREATE TABLE public.tenant_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  tenant_name TEXT NOT NULL,
  business_type TEXT,
  backup_data JSONB NOT NULL,
  deleted_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_backups ENABLE ROW LEVEL SECURITY;

-- Only superadmins and admins can view backups
CREATE POLICY "Admins can view tenant backups"
ON public.tenant_backups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('superadmin', 'admin')
  )
);

-- Only superadmins can delete backups (permanently)
CREATE POLICY "Superadmins can delete backups"
ON public.tenant_backups
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'superadmin'
  )
);

-- Add index for faster lookups
CREATE INDEX idx_tenant_backups_tenant_id ON public.tenant_backups(tenant_id);
CREATE INDEX idx_tenant_backups_deleted_at ON public.tenant_backups(deleted_at DESC);
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
-- Add public SELECT policy for rental_tenants lookup by phone (for renter portal)
CREATE POLICY "Public can lookup rental tenants by phone" 
ON public.rental_tenants 
FOR SELECT 
USING (true);

-- Add public SELECT policy for leases (renters can view their own lease data)
CREATE POLICY "Renters can view their own leases" 
ON public.leases 
FOR SELECT 
USING (true);

-- Add public SELECT policy for rental_payments (renters can view their own payments)
CREATE POLICY "Renters can view their own payments" 
ON public.rental_payments 
FOR SELECT 
USING (true);

-- Add public SELECT and INSERT policy for maintenance_requests (renters can view and submit)
CREATE POLICY "Renters can view their own maintenance requests" 
ON public.maintenance_requests 
FOR SELECT 
USING (true);

CREATE POLICY "Renters can submit maintenance requests" 
ON public.maintenance_requests 
FOR INSERT 
WITH CHECK (true);
-- Add a 4-digit access PIN to rental_tenants for renter portal authentication
ALTER TABLE public.rental_tenants 
ADD COLUMN IF NOT EXISTS access_pin TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN public.rental_tenants.access_pin IS 'A 4-digit PIN code given to renters by landlord for portal access';
-- Add public SELECT policy for rental_units lookup (for renter portal)
CREATE POLICY "Public can lookup rental units for renter portal" 
ON public.rental_units 
FOR SELECT 
USING (is_active = true);
-- Add public SELECT policy for leases lookup (for renter portal)
-- First drop the vague policy
DROP POLICY IF EXISTS "Renters can view their own leases" ON public.leases;

-- Create a proper public lookup policy for active leases
CREATE POLICY "Public can lookup active leases for renter portal" 
ON public.leases 
FOR SELECT 
USING (status = 'active');
-- Drop existing overly permissive policies for renters
DROP POLICY IF EXISTS "Renters can view their own maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Renters can submit maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Renters can view their own payments" ON rental_payments;
DROP POLICY IF EXISTS "Public can lookup active leases for renter portal" ON leases;

-- Create proper policies that allow renters (unauthenticated) to access their data
-- These policies work with the rental_tenant_id parameter passed from the frontend

-- Leases: Allow public select for active leases (needed for renter portal lookup)
CREATE POLICY "Public can view active leases for portal" 
ON leases 
FOR SELECT 
USING (status = 'active');

-- Maintenance requests: Renters can view requests linked to any rental_tenant_id (public access needed)
-- The frontend filters by rental_tenant_id in the query
CREATE POLICY "Public can view maintenance requests" 
ON maintenance_requests 
FOR SELECT 
USING (true);

-- Maintenance requests: Allow public insert (renter portal is unauthenticated)
CREATE POLICY "Public can insert maintenance requests" 
ON maintenance_requests 
FOR INSERT 
WITH CHECK (true);

-- Rental payments: Allow public select (filtered by rental_tenant_id in frontend)
CREATE POLICY "Public can view rental payments" 
ON rental_payments 
FOR SELECT 
USING (true);
-- Allow public select on rental_properties for the renter portal
CREATE POLICY "Public can view rental properties for portal" 
ON rental_properties 
FOR SELECT 
USING (true);
-- Add columns to leases table for Ugandan rental workflow
ALTER TABLE leases 
ADD COLUMN IF NOT EXISTS deposit_months integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'monthly';

-- Add receipt_number to rental_payments for tracking
ALTER TABLE rental_payments 
ADD COLUMN IF NOT EXISTS receipt_number text,
ADD COLUMN IF NOT EXISTS months_covered integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS period_start date,
ADD COLUMN IF NOT EXISTS period_end date;

-- Create a function to generate rental receipt numbers
CREATE OR REPLACE FUNCTION generate_rental_receipt_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  receipt_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO receipt_count 
  FROM rental_payments 
  WHERE tenant_id = NEW.tenant_id 
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  NEW.receipt_number := 'RNT-' || year_prefix || '-' || LPAD(receipt_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate receipt numbers
DROP TRIGGER IF EXISTS generate_rental_receipt ON rental_payments;
CREATE TRIGGER generate_rental_receipt
  BEFORE INSERT ON rental_payments
  FOR EACH ROW
  EXECUTE FUNCTION generate_rental_receipt_number();
-- Rental ID Cards table - cards belong to the property/unit
CREATE TABLE public.rental_id_cards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES public.rental_units(id) ON DELETE CASCADE,
  card_number text NOT NULL,
  current_holder_id uuid REFERENCES public.rental_tenants(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'lost', 'returned')),
  issued_at timestamp with time zone,
  deactivated_at timestamp with time zone,
  deactivation_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, card_number)
);

-- Payment proofs submitted by renters
CREATE TABLE public.rental_payment_proofs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.rental_id_cards(id) ON DELETE CASCADE,
  lease_id uuid REFERENCES public.leases(id) ON DELETE SET NULL,
  payer_name text NOT NULL,
  amount numeric NOT NULL,
  payment_provider text NOT NULL CHECK (payment_provider IN ('mtn', 'airtel', 'bank')),
  transaction_reference text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  verified_by uuid,
  verified_at timestamp with time zone,
  rejection_reason text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add property and unit limits to rental packages
ALTER TABLE public.rental_packages 
  ADD COLUMN IF NOT EXISTS max_properties integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_units_per_property integer NOT NULL DEFAULT 20;

-- Enable RLS
ALTER TABLE public.rental_id_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_payment_proofs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rental_id_cards
CREATE POLICY "Users can manage their tenant ID cards"
  ON public.rental_id_cards FOR ALL
  USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for rental_payment_proofs  
CREATE POLICY "Users can manage their tenant payment proofs"
  ON public.rental_payment_proofs FOR ALL
  USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Allow renters to submit payment proofs (public insert with validation via card)
CREATE POLICY "Anyone can submit payment proof with valid card"
  ON public.rental_payment_proofs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rental_id_cards 
      WHERE rental_id_cards.id = card_id 
      AND rental_id_cards.status = 'active'
    )
  );

-- CREATE OR REPLACE FUNCTION to generate card number
CREATE OR REPLACE FUNCTION generate_rental_card_number(p_tenant_id uuid)
RETURNS text AS $$
DECLARE
  v_business_code text;
  v_sequence integer;
  v_card_number text;
BEGIN
  -- Get business code
  SELECT business_code INTO v_business_code FROM tenants WHERE id = p_tenant_id;
  
  -- Get next sequence number
  SELECT COALESCE(MAX(CAST(SUBSTRING(card_number FROM '[0-9]+$') AS integer)), 0) + 1
  INTO v_sequence
  FROM rental_id_cards
  WHERE tenant_id = p_tenant_id;
  
  v_card_number := v_business_code || '-' || LPAD(v_sequence::text, 4, '0');
  
  RETURN v_card_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-generate card number
CREATE OR REPLACE FUNCTION set_rental_card_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.card_number IS NULL OR NEW.card_number = '' THEN
    NEW.card_number := generate_rental_card_number(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER tr_set_rental_card_number
  BEFORE INSERT ON rental_id_cards
  FOR EACH ROW
  EXECUTE FUNCTION set_rental_card_number();

-- Update timestamp trigger
CREATE TRIGGER update_rental_id_cards_updated_at
  BEFORE UPDATE ON rental_id_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_payment_proofs_updated_at
  BEFORE UPDATE ON rental_payment_proofs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Insert rental ID cards and payment proofs modules
INSERT INTO public.business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
VALUES 
  ('rental_id_cards', 'Rental ID Cards', 'Issue and manage tenant ID cards for identification and payment verification', 'CreditCard', 'rental', ARRAY['rental_management'], false, true, 75),
  ('rental_payment_proofs', 'Payment Proofs', 'Review and verify tenant payment submissions', 'Receipt', 'rental', ARRAY['rental_management'], false, true, 76)
ON CONFLICT (code) DO NOTHING;

-- Add public SELECT policy for rental_id_cards so renters can view their cards
CREATE POLICY "Public can view rental ID cards"
ON public.rental_id_cards
FOR SELECT
USING (status = 'active');

-- Add public INSERT policy for rental_payments to allow self-payment submissions
CREATE POLICY "Public can insert rental payments"
ON public.rental_payments
FOR INSERT
WITH CHECK (true);
-- Add fields to track losses when tenants leave without paying
ALTER TABLE public.leases 
ADD COLUMN IF NOT EXISTS termination_reason TEXT,
ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS marked_as_loss BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS loss_marked_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS loss_marked_by UUID;

-- Add index for querying losses
CREATE INDEX IF NOT EXISTS idx_leases_marked_as_loss ON public.leases(tenant_id, marked_as_loss) WHERE marked_as_loss = true;
-- Fix RLS policies for rental_payment_proofs
-- Allow anyone to INSERT payment proofs (for public submission)
-- Allow tenant owners to SELECT/UPDATE/DELETE

-- First drop existing policies
DROP POLICY IF EXISTS "Anyone can submit payment proof with valid card" ON public.rental_payment_proofs;
DROP POLICY IF EXISTS "Users can manage their tenant payment proofs" ON public.rental_payment_proofs;

-- CREATE POLICY for public INSERT (anyone with valid card can submit)
CREATE POLICY "Anyone can submit payment proof" 
ON public.rental_payment_proofs 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM rental_id_cards 
    WHERE rental_id_cards.id = rental_payment_proofs.card_id 
    AND rental_id_cards.status = 'active'
  )
);

-- CREATE POLICY for tenant owners to SELECT payment proofs
CREATE POLICY "Tenant owners can view payment proofs" 
ON public.rental_payment_proofs 
FOR SELECT 
TO authenticated
USING (
  tenant_id IN (
    SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
  )
);

-- CREATE POLICY for tenant owners to UPDATE payment proofs
CREATE POLICY "Tenant owners can update payment proofs" 
ON public.rental_payment_proofs 
FOR UPDATE 
TO authenticated
USING (
  tenant_id IN (
    SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
  )
);

-- CREATE POLICY for tenant owners to DELETE payment proofs
CREATE POLICY "Tenant owners can delete payment proofs" 
ON public.rental_payment_proofs 
FOR DELETE 
TO authenticated
USING (
  tenant_id IN (
    SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
  )
);
-- Add rental_package_id to tenants for rental businesses
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS rental_package_id UUID REFERENCES public.rental_packages(id);

-- Add comment for clarity
COMMENT ON COLUMN public.tenants.rental_package_id IS 'Reference to rental_packages for rental management businesses';
-- Add unit_type column to support commercial/business rentals
ALTER TABLE public.rental_units 
ADD COLUMN IF NOT EXISTS unit_type text NOT NULL DEFAULT 'residential';

-- Add comment for clarity
COMMENT ON COLUMN public.rental_units.unit_type IS 'Type of unit: residential, commercial, retail, office, warehouse, storage';



