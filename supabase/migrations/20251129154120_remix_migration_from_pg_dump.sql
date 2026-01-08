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

CREATE FUNCTION public.generate_referral_code() RETURNS text
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

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
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

CREATE FUNCTION public.is_admin(user_id uuid) RETURNS boolean
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

CREATE FUNCTION public.register_platform_admin(admin_email text, admin_password text, admin_name text) RETURNS jsonb
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

CREATE FUNCTION public.set_tenant_referral_code() RETURNS trigger
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

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
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


