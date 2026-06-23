-- Rental Enhancements Migration
-- Adds tables for: maintenance photos, preventative maintenance, payment reminders, expense categories

-- 1. Maintenance Images (photo evidence for maintenance tickets)
CREATE TABLE IF NOT EXISTS public.maintenance_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  maintenance_request_id UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_images ENABLE ROW LEVEL SECURITY;

-- 2. Maintenance Schedules (preventative maintenance)
CREATE TABLE IF NOT EXISTS public.maintenance_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.rental_units(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  frequency TEXT NOT NULL DEFAULT 'monthly',
  interval_days INTEGER DEFAULT 30,
  last_performed_date DATE,
  next_due_date DATE NOT NULL,
  assigned_to TEXT,
  estimated_cost NUMERIC,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_schedules ENABLE ROW LEVEL SECURITY;

-- 3. Payment Reminders / Recurring Billing
CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  rental_tenant_id UUID NOT NULL REFERENCES public.rental_tenants(id) ON DELETE CASCADE,
  due_day INTEGER NOT NULL DEFAULT 1,
  amount NUMERIC NOT NULL,
  reminder_type TEXT NOT NULL DEFAULT 'auto',
  is_active BOOLEAN DEFAULT true,
  last_reminder_sent TIMESTAMP WITH TIME ZONE,
  next_reminder_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- 4. Lease eSignatures
CREATE TABLE IF NOT EXISTS public.lease_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signature_data TEXT,
  signed_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lease_signatures ENABLE ROW LEVEL SECURITY;

-- 5. Rental Applications (eLeasing / tenant screening)
CREATE TABLE IF NOT EXISTS public.rental_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.rental_properties(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.rental_units(id) ON DELETE SET NULL,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT,
  applicant_phone TEXT NOT NULL,
  employment_info TEXT,
  income_info TEXT,
  emergency_contact TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  screening_notes TEXT,
  application_link_id TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.rental_applications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "tenant_access" ON public.maintenance_images FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "tenant_access" ON public.maintenance_schedules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "tenant_access" ON public.payment_reminders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "tenant_access" ON public.lease_signatures FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "tenant_access" ON public.rental_applications FOR ALL USING (true) WITH CHECK (true);
