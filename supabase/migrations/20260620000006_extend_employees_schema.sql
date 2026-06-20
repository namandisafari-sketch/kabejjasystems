-- Extend employees table for comprehensive HR onboarding
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS employee_number TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS marital_status TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Ugandan',
  ADD COLUMN IF NOT EXISTS nin TEXT,
  ADD COLUMN IF NOT EXISTS blood_group TEXT,
  ADD COLUMN IF NOT EXISTS religion TEXT,
  ADD COLUMN IF NOT EXISTS home_district TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS alternative_phone TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'Permanent',
  ADD COLUMN IF NOT EXISTS contract_start_date DATE,
  ADD COLUMN IF NOT EXISTS contract_end_date DATE,
  ADD COLUMN IF NOT EXISTS probation_end_date DATE,
  ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS job_grade TEXT,
  ADD COLUMN IF NOT EXISTS work_schedule TEXT DEFAULT 'Full-time',
  ADD COLUMN IF NOT EXISTS nssf_number TEXT,
  ADD COLUMN IF NOT EXISTS tin_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_branch TEXT,
  ADD COLUMN IF NOT EXISTS highest_education TEXT,
  ADD COLUMN IF NOT EXISTS year_of_graduation TEXT,
  ADD COLUMN IF NOT EXISTS institution TEXT,
  ADD COLUMN IF NOT EXISTS professional_certifications JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS skills JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS previous_employer TEXT,
  ADD COLUMN IF NOT EXISTS previous_role TEXT,
  ADD COLUMN IF NOT EXISTS years_of_experience NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS onboarding_notes TEXT,
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

-- Create employee_documents table
CREATE TABLE IF NOT EXISTS public.employee_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT DEFAULT 0,
  mime_type TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee_qualifications table
CREATE TABLE IF NOT EXISTS public.employee_qualifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  qualification_type TEXT NOT NULL,
  institution_name TEXT NOT NULL,
  qualification_name TEXT NOT NULL,
  year_obtained INTEGER,
  grade TEXT,
  is_verified BOOLEAN DEFAULT false,
  document_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create employee_onboarding_checklist table
CREATE TABLE IF NOT EXISTS public.employee_onboarding_checklist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'document',
  is_completed BOOLEAN DEFAULT false,
  completed_by UUID REFERENCES public.profiles(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_onboarding_checklist ENABLE ROW LEVEL SECURITY;

-- Employee documents policies
CREATE POLICY "Users can view their tenant's employee documents"
  ON public.employee_documents FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert employee documents"
  ON public.employee_documents FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update employee documents"
  ON public.employee_documents FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Employee qualifications policies
CREATE POLICY "Users can view their tenant's employee qualifications"
  ON public.employee_qualifications FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert employee qualifications"
  ON public.employee_qualifications FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update employee qualifications"
  ON public.employee_qualifications FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Employee onboarding checklist policies
CREATE POLICY "Users can view their tenant's onboarding checklists"
  ON public.employee_onboarding_checklist FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert onboarding checklist items"
  ON public.employee_onboarding_checklist FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update onboarding checklist items"
  ON public.employee_onboarding_checklist FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Enable realtime
ALTER publication supabase_realtime ADD TABLE public.employee_documents;
ALTER publication supabase_realtime ADD TABLE public.employee_qualifications;
ALTER publication supabase_realtime ADD TABLE public.employee_onboarding_checklist;
