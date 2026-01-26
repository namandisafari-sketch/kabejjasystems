-- =============================================
-- KABEJJA BIZTRACK - COMPLETE DATABASE MIGRATION
-- WITHOUT ROW LEVEL SECURITY (RLS)
-- For self-hosted Supabase instances
-- =============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- CUSTOM TYPES
-- =============================================
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'tenant_owner', 'staff', 'parent', 'renter');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- HELPER FUNCTIONS (Basic functions - NO table dependencies)
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- NOTE: Functions that reference tables (is_admin, get_user_tenant_info, 
-- generate_referral_code, etc.) are created AFTER tables exist.
-- See "TABLE-DEPENDENT FUNCTIONS" section below.

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

-- School packages
CREATE TABLE IF NOT EXISTS public.school_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_per_student NUMERIC NOT NULL DEFAULT 0,
  min_students INTEGER DEFAULT 1,
  max_students INTEGER,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Rental packages
CREATE TABLE IF NOT EXISTS public.rental_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  min_units INTEGER DEFAULT 1,
  max_units INTEGER,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Business packages
CREATE TABLE IF NOT EXISTS public.business_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  included_users INTEGER DEFAULT 1,
  max_users INTEGER DEFAULT 5,
  max_branches INTEGER DEFAULT 1,
  max_products INTEGER,
  price_per_additional_user NUMERIC DEFAULT 0,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
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

-- User roles table (for RBAC)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
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

-- Business modules
CREATE TABLE IF NOT EXISTS public.business_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT DEFAULT 'general',
  is_core BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  applicable_business_types TEXT[],
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tenant modules (enabled modules per tenant)
CREATE TABLE IF NOT EXISTS public.tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES public.business_modules(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, module_id)
);

-- =============================================
-- PRODUCTS & INVENTORY
-- =============================================

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.categories(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  barcode TEXT,
  category TEXT,
  category_id UUID REFERENCES public.categories(id),
  cost_price NUMERIC DEFAULT 0,
  unit_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  max_stock_level INTEGER,
  unit TEXT DEFAULT 'pcs',
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  product_type TEXT DEFAULT 'product',
  allow_custom_price BOOLEAN DEFAULT false,
  track_inventory BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  contact_person TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.suppliers(id),
  order_number TEXT,
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  ordered_at TIMESTAMPTZ DEFAULT now(),
  received_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.internal_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  reason TEXT,
  used_by UUID,
  used_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
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
  customer_type TEXT DEFAULT 'regular',
  credit_limit NUMERIC DEFAULT 0,
  current_balance NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  branch_id UUID REFERENCES public.branches(id),
  order_number INTEGER,
  total_amount NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  payment_status TEXT DEFAULT 'paid',
  order_type TEXT DEFAULT 'counter',
  order_status TEXT DEFAULT 'completed',
  table_id UUID,
  notes TEXT,
  sold_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sale_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  sale_id UUID REFERENCES public.sales(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  payment_date TIMESTAMPTZ DEFAULT now(),
  reference_number TEXT,
  notes TEXT,
  received_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customer_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  times_purchased INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.layaway_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  total_amount NUMERIC NOT NULL,
  deposit_amount NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  installment_count INTEGER DEFAULT 1,
  due_date DATE,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.layaway_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layaway_id UUID NOT NULL REFERENCES public.layaway_plans(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.installment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layaway_id UUID NOT NULL REFERENCES public.layaway_plans(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- EXPENSES
-- =============================================

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  category TEXT,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  receipt_url TEXT,
  vendor TEXT,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_interval TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- EMPLOYEES & PAYROLL
-- =============================================

CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID,
  branch_id UUID REFERENCES public.branches(id),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'staff',
  department TEXT,
  hire_date DATE,
  salary NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  basic_salary NUMERIC DEFAULT 0,
  allowances NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  net_salary NUMERIC DEFAULT 0,
  paye_tax NUMERIC DEFAULT 0,
  nssf_contribution NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.salary_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  repayment_start_date DATE,
  monthly_deduction NUMERIC,
  total_repaid NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RESTAURANT & HOTEL
-- =============================================

CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id),
  table_number TEXT NOT NULL,
  capacity INTEGER DEFAULT 4,
  status TEXT DEFAULT 'available',
  location TEXT,
  qr_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  preparation_time INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.hotel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  room_type TEXT DEFAULT 'standard',
  floor INTEGER,
  capacity INTEGER DEFAULT 2,
  price_per_night NUMERIC DEFAULT 0,
  amenities JSONB,
  status TEXT DEFAULT 'available',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.room_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.hotel_rooms(id),
  customer_id UUID REFERENCES public.customers(id),
  guest_name TEXT NOT NULL,
  guest_phone TEXT,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  total_amount NUMERIC DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'confirmed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- REPAIR & SERVICE
-- =============================================

CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC DEFAULT 0,
  duration_minutes INTEGER,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.repair_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  job_ref TEXT NOT NULL,
  device_type TEXT,
  device_brand TEXT,
  device_model TEXT,
  serial_number TEXT,
  problem_description TEXT NOT NULL,
  diagnosis TEXT,
  estimated_cost NUMERIC,
  final_cost NUMERIC,
  status TEXT DEFAULT 'received',
  priority TEXT DEFAULT 'normal',
  received_at TIMESTAMPTZ DEFAULT now(),
  diagnosed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  assigned_to UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  part_number TEXT,
  category TEXT,
  cost_price NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
  part_id UUID REFERENCES public.spare_parts(id),
  part_name TEXT,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- HEALTHCARE
-- =============================================

CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_number TEXT,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  blood_type TEXT,
  allergies TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES public.patients(id),
  prescription_number TEXT,
  diagnosis TEXT,
  medications JSONB,
  dosage_instructions TEXT,
  notes TEXT,
  prescribed_by UUID,
  prescribed_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SCHOOL MANAGEMENT
-- =============================================

CREATE TABLE IF NOT EXISTS public.academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  term_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT,
  stream TEXT,
  capacity INTEGER,
  class_teacher_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  is_core BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  admission_number TEXT,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  class_id UUID REFERENCES public.school_classes(id),
  enrollment_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active',
  photo_url TEXT,
  address TEXT,
  medical_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  occupation TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parent_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES public.parents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'parent',
  is_primary_contact BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.fee_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.academic_terms(id),
  class_id UUID REFERENCES public.school_classes(id),
  fee_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  is_optional BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  term_id UUID REFERENCES public.academic_terms(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  receipt_number TEXT,
  payment_date TIMESTAMPTZ DEFAULT now(),
  received_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.student_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  term_id UUID NOT NULL REFERENCES public.academic_terms(id),
  score NUMERIC,
  grade TEXT,
  remarks TEXT,
  entered_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  term_id UUID NOT NULL REFERENCES public.academic_terms(id),
  class_id UUID REFERENCES public.school_classes(id),
  total_score NUMERIC,
  average_score NUMERIC,
  class_rank INTEGER,
  total_students_in_class INTEGER,
  teacher_comment TEXT,
  head_teacher_comment TEXT,
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gate_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  check_in_time TIMESTAMPTZ DEFAULT now(),
  check_out_time TIMESTAMPTZ,
  checked_in_by UUID,
  checked_out_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.discipline_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  case_number TEXT NOT NULL,
  incident_type TEXT NOT NULL,
  incident_date DATE DEFAULT CURRENT_DATE,
  incident_description TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  action_details TEXT,
  status TEXT DEFAULT 'open',
  reported_by TEXT,
  location TEXT,
  witnesses TEXT,
  parent_notified BOOLEAN DEFAULT false,
  parent_notified_at TIMESTAMPTZ,
  parent_notified_by TEXT,
  parent_acknowledged BOOLEAN DEFAULT false,
  parent_acknowledged_at TIMESTAMPTZ,
  parent_response TEXT,
  suspension_start_date DATE,
  suspension_end_date DATE,
  expulsion_date DATE,
  is_permanent_expulsion BOOLEAN DEFAULT false,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  follow_up_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT,
  resolution_notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ECD (Early Childhood Development)
-- =============================================

CREATE TABLE IF NOT EXISTS public.ecd_learning_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecd_learning_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecd_rating_scale (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  numeric_value INTEGER,
  color TEXT,
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecd_class_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  badge_icon TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecd_skills_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecd_report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  term_id UUID NOT NULL REFERENCES public.academic_terms(id),
  class_id UUID REFERENCES public.school_classes(id),
  total_score NUMERIC,
  average_score NUMERIC,
  class_rank INTEGER,
  total_students_in_class INTEGER,
  days_present INTEGER,
  days_absent INTEGER,
  total_school_days INTEGER,
  monthly_attendance JSONB,
  teacher_comment TEXT,
  teacher_name TEXT,
  teacher_signature_url TEXT,
  head_teacher_comment TEXT,
  head_teacher_name TEXT,
  behavior_comment TEXT,
  parent_feedback TEXT,
  is_prefect BOOLEAN DEFAULT false,
  fees_balance NUMERIC,
  next_term_fees NUMERIC,
  next_term_start_date DATE,
  term_closing_date DATE,
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecd_learning_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id UUID NOT NULL REFERENCES public.ecd_report_cards(id) ON DELETE CASCADE,
  learning_area_id UUID NOT NULL REFERENCES public.ecd_learning_areas(id),
  rating_code TEXT NOT NULL,
  numeric_score NUMERIC,
  remark TEXT,
  grade_remark TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecd_activity_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id UUID NOT NULL REFERENCES public.ecd_report_cards(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.ecd_learning_activities(id),
  rating_code TEXT NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecd_skills_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id UUID NOT NULL REFERENCES public.ecd_report_cards(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.ecd_skills_values(id),
  is_achieved BOOLEAN DEFAULT false,
  rating_code TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecd_student_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  role_id UUID NOT NULL REFERENCES public.ecd_class_roles(id),
  term_id UUID REFERENCES public.academic_terms(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ecd_monthly_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  term_id UUID NOT NULL REFERENCES public.academic_terms(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  days_present INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  total_days INTEGER DEFAULT 0,
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
  property_code TEXT,
  total_units INTEGER DEFAULT 0,
  amenities JSONB,
  description TEXT,
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
  floor_number INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  square_feet NUMERIC,
  monthly_rent NUMERIC NOT NULL DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'available',
  amenities JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rental_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  id_type TEXT,
  id_number TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  occupation TEXT,
  employer TEXT,
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
  deposit_amount NUMERIC DEFAULT 0,
  deposit_paid NUMERIC DEFAULT 0,
  payment_due_day INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active',
  outstanding_balance NUMERIC DEFAULT 0,
  terms TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rental_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lease_id UUID NOT NULL REFERENCES public.leases(id),
  rental_tenant_id UUID REFERENCES public.rental_tenants(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_for_month DATE,
  receipt_number TEXT,
  reference_number TEXT,
  notes TEXT,
  received_by UUID,
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
  issued_at TIMESTAMPTZ DEFAULT now(),
  expires_at DATE,
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
  proof_image_url TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.rental_properties(id),
  unit_id UUID REFERENCES public.rental_units(id),
  rental_tenant_id UUID REFERENCES public.rental_tenants(id),
  request_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'pending',
  scheduled_date DATE,
  completed_at TIMESTAMPTZ,
  cost NUMERIC,
  assigned_to TEXT,
  notes TEXT,
  images JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ACCOUNTING
-- =============================================

CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  sub_type TEXT,
  description TEXT,
  balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.general_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.chart_of_accounts(id),
  transaction_date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  debit NUMERIC DEFAULT 0,
  credit NUMERIC DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  account_number TEXT,
  bank_name TEXT,
  balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'UGX',
  is_active BOOLEAN DEFAULT true,
  is_reconciled BOOLEAN DEFAULT false,
  last_reconciliation_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_statements_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  statement_type TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  statement_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SUBSCRIPTIONS & PAYMENTS
-- =============================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.packages(id),
  status TEXT DEFAULT 'active',
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  amount_paid NUMERIC DEFAULT 0,
  payment_method TEXT,
  payment_reference TEXT,
  auto_renew BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscription_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.packages(id),
  requested_duration INTEGER DEFAULT 1,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  processed_by UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.school_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.school_packages(id),
  term_id UUID REFERENCES public.academic_terms(id),
  student_count INTEGER DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  payment_date TIMESTAMPTZ,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.rental_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id UUID REFERENCES public.rental_packages(id),
  unit_count INTEGER DEFAULT 0,
  amount_paid NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'pending',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  subscription_id UUID REFERENCES public.subscriptions(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  payment_reference TEXT,
  transaction_id TEXT,
  status TEXT DEFAULT 'pending',
  proof_url TEXT,
  notes TEXT,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- SYSTEM & ADMIN
-- =============================================

CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_audience TEXT DEFAULT 'all',
  target_package_id UUID REFERENCES public.packages(id),
  priority TEXT DEFAULT 'normal',
  is_active BOOLEAN DEFAULT true,
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  ticket_number TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'open',
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  actor_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.marketers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  referral_code TEXT UNIQUE,
  commission_rate NUMERIC DEFAULT 10,
  total_referrals INTEGER DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),
  name TEXT NOT NULL,
  business_name TEXT,
  role TEXT,
  content TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  photo_url TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  tenant_id UUID REFERENCES public.tenants(id),
  platform TEXT,
  user_agent TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  language TEXT,
  trial_started_at TIMESTAMPTZ,
  trial_ended_at TIMESTAMPTZ,
  is_blocked BOOLEAN DEFAULT false,
  blocked_at TIMESTAMPTZ,
  block_reason TEXT,
  last_seen_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.receipt_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  receipt_prefix TEXT DEFAULT 'RCP',
  next_receipt_number INTEGER DEFAULT 1,
  logo_alignment TEXT DEFAULT 'center',
  show_logo BOOLEAN DEFAULT true,
  show_phone BOOLEAN DEFAULT true,
  show_email BOOLEAN DEFAULT true,
  show_address BOOLEAN DEFAULT true,
  show_cashier BOOLEAN DEFAULT true,
  show_customer BOOLEAN DEFAULT true,
  show_date_time BOOLEAN DEFAULT true,
  show_payment_method BOOLEAN DEFAULT true,
  show_whatsapp_qr BOOLEAN DEFAULT false,
  whatsapp_number TEXT,
  footer_message TEXT DEFAULT 'Thank you for your business!',
  show_footer_message BOOLEAN DEFAULT true,
  seasonal_remark TEXT,
  show_seasonal_remark BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.letter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_type TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.term_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.academic_terms(id),
  name TEXT NOT NULL,
  description TEXT,
  quantity INTEGER DEFAULT 1,
  is_mandatory BOOLEAN DEFAULT true,
  applies_to_classes TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.visitor_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  phone TEXT,
  purpose TEXT NOT NULL,
  visiting_who TEXT,
  id_type TEXT,
  id_number TEXT,
  badge_number TEXT,
  vehicle_registration TEXT,
  check_in_time TIMESTAMPTZ DEFAULT now(),
  check_out_time TIMESTAMPTZ,
  checked_in_by UUID,
  checked_out_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.early_departure_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  gate_checkin_id UUID REFERENCES public.gate_checkins(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT now(),
  requested_by UUID,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.send_home_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  reason TEXT NOT NULL,
  reason_category TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  sent_by UUID,
  parent_notified BOOLEAN DEFAULT false,
  parent_notified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- TRIGGER FUNCTIONS
-- =============================================

CREATE OR REPLACE FUNCTION public.set_tenant_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_tenant_business_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.business_code IS NULL THEN
    NEW.business_code := public.generate_business_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_tenant_parent_login_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.parent_login_code IS NULL THEN
    NEW.parent_login_code := generate_parent_login_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  today_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO today_count
  FROM sales WHERE tenant_id = NEW.tenant_id AND DATE(created_at) = CURRENT_DATE;
  NEW.order_number := today_count;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_admission_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
BEGIN
  IF NEW.admission_number IS NULL OR NEW.admission_number = '' THEN
    v_year := TO_CHAR(CURRENT_DATE, 'YY');
    SELECT COALESCE(MAX(CAST(NULLIF(REGEXP_REPLACE(admission_number, '[^0-9]', '', 'g'), '') AS INTEGER)), 0) + 1
    INTO v_seq FROM students WHERE tenant_id = NEW.tenant_id AND admission_number LIKE 'ADM/' || v_year || '/%';
    NEW.admission_number := 'ADM/' || v_year || '/' || LPAD(v_seq::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_discipline_case_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  case_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO case_count FROM public.discipline_cases 
  WHERE tenant_id = NEW.tenant_id AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  NEW.case_number := 'DC-' || year_prefix || '-' || LPAD(case_count::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_lease_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  lease_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO lease_count FROM public.leases 
  WHERE tenant_id = NEW.tenant_id AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  NEW.lease_number := 'LSE-' || year_prefix || '-' || LPAD(lease_count::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_rental_receipt_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  receipt_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO receipt_count FROM rental_payments 
  WHERE tenant_id = NEW.tenant_id AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  NEW.receipt_number := 'RNT-' || year_prefix || '-' || LPAD(receipt_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_maintenance_request_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  request_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO request_count FROM public.maintenance_requests 
  WHERE tenant_id = NEW.tenant_id AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  NEW.request_number := 'MNT-' || year_prefix || '-' || LPAD(request_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_job_ref()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  job_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO job_count FROM public.repair_jobs 
  WHERE tenant_id = NEW.tenant_id AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  NEW.job_ref := 'JOB-' || year_prefix || '-' || LPAD(job_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  ticket_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO ticket_count FROM public.support_tickets 
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  NEW.ticket_number := 'TKT-' || year_prefix || '-' || LPAD(ticket_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_product_sku()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  prefix TEXT;
  seq_num INTEGER;
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    prefix := UPPER(COALESCE(LEFT(REGEXP_REPLACE(NEW.category, '[^a-zA-Z]', '', 'g'), 3), 'PRD'));
    IF LENGTH(prefix) < 3 THEN prefix := RPAD(prefix, 3, 'X'); END IF;
    SELECT COALESCE(MAX(CAST(SUBSTRING(sku FROM '[0-9]+$') AS INTEGER)), 0) + 1 INTO seq_num
    FROM products WHERE tenant_id = NEW.tenant_id AND sku LIKE prefix || '-%';
    NEW.sku := prefix || '-' || LPAD(seq_num::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_rental_card_number(p_tenant_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_business_code TEXT;
  v_sequence INTEGER;
BEGIN
  SELECT business_code INTO v_business_code FROM tenants WHERE id = p_tenant_id;
  SELECT COALESCE(MAX(CAST(SUBSTRING(card_number FROM '[0-9]+$') AS INTEGER)), 0) + 1 INTO v_sequence
  FROM rental_id_cards WHERE tenant_id = p_tenant_id;
  RETURN v_business_code || '-' || LPAD(v_sequence::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.set_rental_card_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.card_number IS NULL OR NEW.card_number = '' THEN
    NEW.card_number := generate_rental_card_number(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_next_receipt_number(p_tenant_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_prefix TEXT;
  v_number INTEGER;
BEGIN
  INSERT INTO receipt_settings (tenant_id) VALUES (p_tenant_id) ON CONFLICT (tenant_id) DO NOTHING;
  UPDATE receipt_settings SET next_receipt_number = next_receipt_number + 1
  WHERE tenant_id = p_tenant_id RETURNING receipt_prefix, next_receipt_number - 1 INTO v_prefix, v_number;
  RETURN v_prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(v_number::TEXT, 6, '0');
END;
$$;

-- =============================================
-- CREATE TRIGGERS
-- =============================================

DROP TRIGGER IF EXISTS set_tenant_referral_code_trigger ON public.tenants;
CREATE TRIGGER set_tenant_referral_code_trigger BEFORE INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION set_tenant_referral_code();

DROP TRIGGER IF EXISTS set_tenant_business_code_trigger ON public.tenants;
CREATE TRIGGER set_tenant_business_code_trigger BEFORE INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION set_tenant_business_code();

DROP TRIGGER IF EXISTS set_tenant_parent_login_code_trigger ON public.tenants;
CREATE TRIGGER set_tenant_parent_login_code_trigger BEFORE INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION set_tenant_parent_login_code();

DROP TRIGGER IF EXISTS generate_order_number_trigger ON public.sales;
CREATE TRIGGER generate_order_number_trigger BEFORE INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION generate_order_number();

DROP TRIGGER IF EXISTS generate_admission_number_trigger ON public.students;
CREATE TRIGGER generate_admission_number_trigger BEFORE INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION generate_admission_number();

DROP TRIGGER IF EXISTS generate_discipline_case_number_trigger ON public.discipline_cases;
CREATE TRIGGER generate_discipline_case_number_trigger BEFORE INSERT ON public.discipline_cases
FOR EACH ROW EXECUTE FUNCTION generate_discipline_case_number();

DROP TRIGGER IF EXISTS generate_lease_number_trigger ON public.leases;
CREATE TRIGGER generate_lease_number_trigger BEFORE INSERT ON public.leases
FOR EACH ROW EXECUTE FUNCTION generate_lease_number();

DROP TRIGGER IF EXISTS generate_rental_receipt_number_trigger ON public.rental_payments;
CREATE TRIGGER generate_rental_receipt_number_trigger BEFORE INSERT ON public.rental_payments
FOR EACH ROW EXECUTE FUNCTION generate_rental_receipt_number();

DROP TRIGGER IF EXISTS generate_maintenance_request_number_trigger ON public.maintenance_requests;
CREATE TRIGGER generate_maintenance_request_number_trigger BEFORE INSERT ON public.maintenance_requests
FOR EACH ROW EXECUTE FUNCTION generate_maintenance_request_number();

DROP TRIGGER IF EXISTS generate_job_ref_trigger ON public.repair_jobs;
CREATE TRIGGER generate_job_ref_trigger BEFORE INSERT ON public.repair_jobs
FOR EACH ROW EXECUTE FUNCTION generate_job_ref();

DROP TRIGGER IF EXISTS generate_ticket_number_trigger ON public.support_tickets;
CREATE TRIGGER generate_ticket_number_trigger BEFORE INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION generate_ticket_number();

DROP TRIGGER IF EXISTS generate_product_sku_trigger ON public.products;
CREATE TRIGGER generate_product_sku_trigger BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION generate_product_sku();

DROP TRIGGER IF EXISTS set_rental_card_number_trigger ON public.rental_id_cards;
CREATE TRIGGER set_rental_card_number_trigger BEFORE INSERT ON public.rental_id_cards
FOR EACH ROW EXECUTE FUNCTION set_rental_card_number();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant_id ON public.sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales(created_at);
CREATE INDEX IF NOT EXISTS idx_students_tenant_id ON public.students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant_id ON public.leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_unit_id ON public.leases(unit_id);
CREATE INDEX IF NOT EXISTS idx_rental_units_property_id ON public.rental_units(property_id);
CREATE INDEX IF NOT EXISTS idx_fee_payments_student_id ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_gate_checkins_student_id ON public.gate_checkins(student_id);

-- =============================================
-- SEED DATA - PACKAGES
-- =============================================

INSERT INTO public.packages (name, description, monthly_price, max_users, max_branches, business_type, display_order)
VALUES 
  ('Starter', 'Perfect for small businesses', 50000, 3, 1, 'retail', 1),
  ('Professional', 'For growing businesses', 100000, 10, 3, 'retail', 2),
  ('Enterprise', 'For large operations', 250000, 50, 10, 'retail', 3)
ON CONFLICT DO NOTHING;

INSERT INTO public.school_packages (name, description, price_per_student, min_students, max_students, display_order)
VALUES 
  ('Basic School', 'For small schools', 5000, 1, 100, 1),
  ('Standard School', 'For medium schools', 4000, 101, 500, 2),
  ('Premium School', 'For large schools', 3000, 501, NULL, 3)
ON CONFLICT DO NOTHING;

INSERT INTO public.rental_packages (name, description, price_per_unit, min_units, max_units, display_order)
VALUES 
  ('Small Landlord', 'Up to 10 units', 10000, 1, 10, 1),
  ('Property Manager', 'Up to 50 units', 8000, 11, 50, 2),
  ('Real Estate Company', 'Unlimited units', 5000, 51, NULL, 3)
ON CONFLICT DO NOTHING;

-- =============================================
-- SEED DATA - BUSINESS MODULES
-- =============================================

INSERT INTO public.business_modules (code, name, icon, category, is_core, applicable_business_types, display_order)
VALUES
  ('dashboard', 'Dashboard', 'LayoutDashboard', 'core', true, NULL, 1),
  ('pos', 'Point of Sale', 'ShoppingCart', 'sales', true, ARRAY['retail_shop', 'supermarket', 'boutique', 'pharmacy', 'restaurant', 'bar', 'cafe'], 2),
  ('products', 'Products', 'Package', 'inventory', true, ARRAY['retail_shop', 'supermarket', 'boutique', 'pharmacy'], 3),
  ('customers', 'Customers', 'Users', 'sales', true, NULL, 4),
  ('sales', 'Sales', 'Receipt', 'sales', true, NULL, 5),
  ('expenses', 'Expenses', 'Wallet', 'finance', true, NULL, 6),
  ('reports', 'Reports', 'BarChart3', 'analytics', true, NULL, 7),
  ('settings', 'Settings', 'Settings', 'core', true, NULL, 99),
  ('employees', 'Employees', 'UserCircle', 'hr', false, NULL, 10),
  ('payroll', 'Payroll', 'CreditCard', 'hr', false, NULL, 11),
  ('accounting', 'Accounting', 'Calculator', 'finance', false, NULL, 12),
  ('suppliers', 'Suppliers', 'Truck', 'inventory', false, NULL, 13),
  ('categories', 'Categories', 'Tags', 'inventory', false, NULL, 14),
  ('stock_alerts', 'Stock Alerts', 'AlertTriangle', 'inventory', false, NULL, 15),
  ('purchase_orders', 'Purchase Orders', 'ClipboardList', 'inventory', false, NULL, 16),
  ('internal_usage', 'Internal Usage', 'PackageMinus', 'inventory', false, NULL, 17),
  ('services', 'Services', 'Sparkles', 'service', false, ARRAY['salon', 'spa', 'barber', 'garage', 'tech_repair'], 20),
  ('jobs', 'Repair Jobs', 'Wrench', 'service', false, ARRAY['garage', 'tech_repair', 'repair_shop'], 21),
  ('spare_parts', 'Spare Parts', 'Cog', 'service', false, ARRAY['garage', 'tech_repair', 'repair_shop'], 22),
  ('menu', 'Menu', 'UtensilsCrossed', 'restaurant', false, ARRAY['restaurant', 'bar', 'cafe'], 30),
  ('tables', 'Tables', 'MapPin', 'restaurant', false, ARRAY['restaurant', 'bar', 'cafe'], 31),
  ('qr_codes', 'QR Codes', 'QrCode', 'restaurant', false, ARRAY['restaurant', 'bar', 'cafe'], 32),
  ('rooms', 'Hotel Rooms', 'Bed', 'hotel', false, ARRAY['hotel', 'lodge', 'guest_house'], 40),
  ('bookings', 'Room Bookings', 'CalendarDays', 'hotel', false, ARRAY['hotel', 'lodge', 'guest_house'], 41),
  ('patients', 'Patients', 'HeartPulse', 'healthcare', false, ARRAY['pharmacy', 'hospital', 'clinic'], 50),
  ('prescriptions', 'Prescriptions', 'Pill', 'healthcare', false, ARRAY['pharmacy', 'hospital', 'clinic'], 51),
  ('students', 'Students', 'GraduationCap', 'school', false, ARRAY['kindergarten', 'primary_school', 'secondary_school'], 60),
  ('classes', 'Classes', 'BookOpen', 'school', false, ARRAY['kindergarten', 'primary_school', 'secondary_school'], 61),
  ('fees', 'Fees', 'CreditCard', 'school', false, ARRAY['kindergarten', 'primary_school', 'secondary_school'], 62),
  ('academic_terms', 'Academic Terms', 'Calendar', 'school', false, ARRAY['kindergarten', 'primary_school', 'secondary_school'], 63),
  ('subjects', 'Subjects', 'BookOpen', 'school', false, ARRAY['primary_school', 'secondary_school'], 64),
  ('report_cards', 'Report Cards', 'Award', 'school', false, ARRAY['kindergarten', 'primary_school', 'secondary_school'], 65),
  ('parents', 'Parents', 'Users', 'school', false, ARRAY['kindergarten', 'primary_school', 'secondary_school'], 66),
  ('gate_checkin', 'Gate Check-in', 'ScanLine', 'school', false, ARRAY['kindergarten', 'primary_school', 'secondary_school'], 67),
  ('discipline', 'Discipline', 'ShieldAlert', 'school', false, ARRAY['primary_school', 'secondary_school'], 68),
  ('rental_dashboard', 'Rental Dashboard', 'LayoutDashboard', 'rental', true, ARRAY['rental'], 70),
  ('rental_properties', 'Properties', 'Building2', 'rental', false, ARRAY['rental'], 71),
  ('rental_units', 'Units', 'DoorOpen', 'rental', false, ARRAY['rental'], 72),
  ('rental_tenants', 'Tenants', 'Users', 'rental', false, ARRAY['rental'], 73),
  ('rental_leases', 'Leases', 'FileText', 'rental', false, ARRAY['rental'], 74),
  ('rental_payments', 'Payments', 'CreditCard', 'rental', false, ARRAY['rental'], 75),
  ('rental_maintenance', 'Maintenance', 'Wrench', 'rental', false, ARRAY['rental'], 76),
  ('assets', 'School Assets', 'Package', 'school', false, ARRAY['kindergarten', 'primary_school', 'secondary_school', 'school'], 69)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  applicable_business_types = EXCLUDED.applicable_business_types;

-- =============================================
-- SCHOOL ASSETS/INVENTORY MANAGEMENT
-- =============================================

-- Asset category type
DO $$ BEGIN
  CREATE TYPE public.asset_category AS ENUM (
    'furniture', 'equipment', 'books', 'sports', 'electronics',
    'musical_instruments', 'lab_equipment', 'teaching_aids', 'vehicles', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Asset condition type
DO $$ BEGIN
  CREATE TYPE public.asset_condition AS ENUM (
    'excellent', 'good', 'fair', 'poor', 'needs_repair', 'damaged', 'disposed'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- School assets table
CREATE TABLE IF NOT EXISTS public.school_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category asset_category NOT NULL DEFAULT 'other',
  sub_category VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC(12,2),
  total_value NUMERIC(12,2),
  location VARCHAR(255),
  assigned_to_class_id UUID REFERENCES public.school_classes(id) ON DELETE SET NULL,
  assigned_to_teacher_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  assigned_date DATE,
  purchase_date DATE,
  supplier VARCHAR(255),
  invoice_number VARCHAR(100),
  warranty_expiry DATE,
  warranty_notes TEXT,
  condition asset_condition NOT NULL DEFAULT 'good',
  last_inspection_date DATE,
  next_maintenance_date DATE,
  maintenance_notes TEXT,
  useful_life_years INTEGER,
  salvage_value NUMERIC(12,2),
  depreciation_method VARCHAR(50) DEFAULT 'straight_line',
  current_book_value NUMERIC(12,2),
  is_active BOOLEAN DEFAULT true,
  disposal_date DATE,
  disposal_reason TEXT,
  disposal_value NUMERIC(12,2),
  photo_url TEXT,
  barcode VARCHAR(100),
  serial_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  UNIQUE(tenant_id, asset_code)
);

-- Asset maintenance history
CREATE TABLE IF NOT EXISTS public.asset_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.school_assets(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  cost NUMERIC(12,2),
  performed_by VARCHAR(255),
  performed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  condition_before asset_condition,
  condition_after asset_condition,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Asset assignment history
CREATE TABLE IF NOT EXISTS public.asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.school_assets(id) ON DELETE CASCADE,
  assigned_to_type VARCHAR(20) NOT NULL,
  assigned_to_id UUID,
  assigned_to_name VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_date DATE,
  assigned_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Asset code generator function
CREATE OR REPLACE FUNCTION public.generate_asset_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  category_prefix TEXT;
  seq_num INTEGER;
BEGIN
  category_prefix := UPPER(LEFT(NEW.category::TEXT, 3));
  SELECT COALESCE(MAX(CAST(SUBSTRING(asset_code FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO seq_num FROM public.school_assets
  WHERE tenant_id = NEW.tenant_id AND asset_code LIKE category_prefix || '-%';
  NEW.asset_code := category_prefix || '-' || LPAD(seq_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

-- Depreciation calculator function
CREATE OR REPLACE FUNCTION public.calculate_asset_depreciation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  years_used NUMERIC;
  annual_depreciation NUMERIC;
BEGIN
  IF NEW.purchase_date IS NOT NULL AND NEW.unit_cost IS NOT NULL AND NEW.useful_life_years IS NOT NULL THEN
    years_used := EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.purchase_date));
    annual_depreciation := (COALESCE(NEW.unit_cost, 0) * NEW.quantity - COALESCE(NEW.salvage_value, 0)) / NULLIF(NEW.useful_life_years, 0);
    NEW.current_book_value := GREATEST(
      COALESCE(NEW.salvage_value, 0),
      (COALESCE(NEW.unit_cost, 0) * NEW.quantity) - (annual_depreciation * years_used)
    );
  ELSE
    NEW.current_book_value := COALESCE(NEW.unit_cost, 0) * NEW.quantity;
  END IF;
  NEW.total_value := COALESCE(NEW.unit_cost, 0) * NEW.quantity;
  RETURN NEW;
END;
$$;

-- Asset triggers
DROP TRIGGER IF EXISTS set_asset_code ON public.school_assets;
CREATE TRIGGER set_asset_code BEFORE INSERT ON public.school_assets
FOR EACH ROW WHEN (NEW.asset_code IS NULL OR NEW.asset_code = '')
EXECUTE FUNCTION public.generate_asset_code();

DROP TRIGGER IF EXISTS calculate_depreciation ON public.school_assets;
CREATE TRIGGER calculate_depreciation BEFORE INSERT OR UPDATE ON public.school_assets
FOR EACH ROW EXECUTE FUNCTION public.calculate_asset_depreciation();

DROP TRIGGER IF EXISTS update_school_assets_updated_at ON public.school_assets;
CREATE TRIGGER update_school_assets_updated_at BEFORE UPDATE ON public.school_assets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Asset indexes
CREATE INDEX IF NOT EXISTS idx_school_assets_tenant ON public.school_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_school_assets_category ON public.school_assets(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_school_assets_condition ON public.school_assets(tenant_id, condition);
CREATE INDEX IF NOT EXISTS idx_school_assets_assigned_class ON public.school_assets(assigned_to_class_id);
CREATE INDEX IF NOT EXISTS idx_asset_maintenance_asset ON public.asset_maintenance(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset ON public.asset_assignments(asset_id);

-- =============================================
-- TABLE-DEPENDENT FUNCTIONS (After tables exist)
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

CREATE OR REPLACE FUNCTION public.generate_business_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

CREATE OR REPLACE FUNCTION public.generate_parent_login_code()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    code := UPPER(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM tenants WHERE parent_login_code = code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role IN ('superadmin', 'admin'));
$$;

CREATE OR REPLACE FUNCTION public.get_user_tenant_info(user_id UUID)
RETURNS TABLE(tenant_id UUID, role TEXT) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.tenant_id, p.role::text FROM public.profiles p WHERE p.id = user_id
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =============================================
-- TENANT TRIGGERS (After functions exist)
-- =============================================

CREATE OR REPLACE FUNCTION public.set_tenant_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_tenant_business_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.business_code IS NULL THEN
    NEW.business_code := public.generate_business_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_tenant_parent_login_code()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.parent_login_code IS NULL THEN
    NEW.parent_login_code := generate_parent_login_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_referral_code ON public.tenants;
CREATE TRIGGER set_referral_code BEFORE INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.set_tenant_referral_code();

DROP TRIGGER IF EXISTS set_business_code ON public.tenants;
CREATE TRIGGER set_business_code BEFORE INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.set_tenant_business_code();

DROP TRIGGER IF EXISTS set_parent_login_code ON public.tenants;
CREATE TRIGGER set_parent_login_code BEFORE INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.set_tenant_parent_login_code();

-- =============================================
-- STORAGE BUCKETS (Run in Supabase Dashboard)
-- =============================================

-- Create storage bucket for business logos
-- INSERT INTO storage.buckets (id, name, public) VALUES ('business-logos', 'business-logos', true);

-- =============================================
-- MIGRATION COMPLETE
-- =============================================
SELECT 'Migration complete! Database created WITHOUT RLS policies.' as status;

-- =============================================
-- POST-MIGRATION VERIFICATION CHECKLIST
-- Run these queries to verify successful setup
-- =============================================

/*
== POST-MIGRATION CHECKLIST ==

Run these verification queries after migration:

1. VERIFY CORE TABLES EXIST:
----------------------------
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

Expected: 85+ tables including packages, tenants, profiles, user_roles, 
products, sales, students, school_assets, etc.


2. VERIFY CUSTOM TYPES:
-----------------------
SELECT typname FROM pg_type WHERE typname IN ('app_role', 'asset_category', 'asset_condition');

Expected: 3 rows


3. VERIFY KEY FUNCTIONS:
------------------------
SELECT proname FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace 
AND proname IN ('is_admin', 'has_role', 'get_user_tenant_info', 
                'generate_asset_code', 'calculate_asset_depreciation',
                'generate_referral_code', 'generate_business_code');

Expected: 7+ rows


4. VERIFY TRIGGERS:
-------------------
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

Expected: Triggers for tenants, products, sales, school_assets, etc.


5. VERIFY SEED DATA:
--------------------
SELECT COUNT(*) FROM business_modules; -- Expected: 40+ modules
SELECT COUNT(*) FROM packages; -- Expected: 3+ packages


6. VERIFY SCHOOL ASSETS TABLES:
-------------------------------
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'school_assets' AND table_schema = 'public';

Expected: Columns including asset_code, category, condition, current_book_value


7. CREATE STORAGE BUCKET (Manual Step):
---------------------------------------
Go to Supabase Dashboard > Storage > Create bucket named "business-logos" (public)


8. CREATE FIRST ADMIN USER:
---------------------------
After signing up in the app, run:
UPDATE profiles SET role = 'superadmin' 
WHERE id = (SELECT id FROM auth.users WHERE email = 'your-admin@email.com');

INSERT INTO user_roles (user_id, role) VALUES 
((SELECT id FROM auth.users WHERE email = 'your-admin@email.com'), 'superadmin');


9. VERIFY NO RLS POLICIES:
--------------------------
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

Expected: 0 rows (no RLS policies)


10. TEST BASIC QUERIES:
-----------------------
SELECT * FROM packages LIMIT 1;
SELECT * FROM business_modules LIMIT 5;

Expected: Data returned without permission errors
*/
