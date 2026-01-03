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