-- =============================================
-- UNEB CANDIDATE REGISTRATION SYSTEM (Complete)
-- For S.4 (UCE) and S.6 (UACE) candidates
-- =============================================

-- Table to track UNEB candidate registrations
CREATE TABLE IF NOT EXISTS public.uneb_candidate_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year INTEGER NOT NULL,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('UCE', 'UACE')),
  registration_status TEXT NOT NULL DEFAULT 'pending' CHECK (registration_status IN ('pending', 'submitted', 'registered', 'cancelled')),
  index_number TEXT,
  center_number TEXT,
  subjects JSONB DEFAULT '[]',
  subject_combination TEXT,
  registration_fee NUMERIC NOT NULL DEFAULT 0,
  fee_paid BOOLEAN DEFAULT false,
  fee_paid_date DATE,
  fee_receipt_number TEXT,
  uneb_photo_url TEXT,
  passport_photo_submitted BOOLEAN DEFAULT false,
  registration_deadline DATE,
  submitted_to_uneb_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ,
  special_needs_accommodation TEXT,
  previous_sitting BOOLEAN DEFAULT false,
  previous_index_number TEXT,
  submitted_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(student_id, academic_year, exam_type)
);

-- Table for UNEB exam subjects
CREATE TABLE IF NOT EXISTS public.uneb_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  paper_number INTEGER DEFAULT 1,
  exam_type TEXT NOT NULL CHECK (exam_type IN ('UCE', 'UACE', 'BOTH')),
  is_compulsory BOOLEAN DEFAULT false,
  subject_category TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table for school's UNEB settings
CREATE TABLE IF NOT EXISTS public.uneb_school_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  center_number TEXT,
  center_name TEXT,
  uce_registration_fee NUMERIC DEFAULT 80000,
  uace_registration_fee NUMERIC DEFAULT 120000,
  current_academic_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  registration_open BOOLEAN DEFAULT false,
  registration_deadline_uce DATE,
  registration_deadline_uace DATE,
  photo_specifications TEXT DEFAULT 'Passport size photo (white background, recent)',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add UNEB candidate fields to students table
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS is_uneb_candidate BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS uneb_candidate_type TEXT;

-- Enable RLS
ALTER TABLE public.uneb_candidate_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uneb_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uneb_school_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Tenant access for UNEB registrations" ON public.uneb_candidate_registrations;
CREATE POLICY "Tenant access for UNEB registrations" 
ON public.uneb_candidate_registrations 
FOR ALL 
USING (tenant_id = get_user_tenant_id() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Anyone can view UNEB subjects" ON public.uneb_subjects;
CREATE POLICY "Anyone can view UNEB subjects" 
ON public.uneb_subjects 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Only admins can modify UNEB subjects" ON public.uneb_subjects;
CREATE POLICY "Only admins can modify UNEB subjects" 
ON public.uneb_subjects 
FOR ALL 
USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Tenant access for UNEB settings" ON public.uneb_school_settings;
CREATE POLICY "Tenant access for UNEB settings" 
ON public.uneb_school_settings 
FOR ALL 
USING (tenant_id = get_user_tenant_id() OR is_admin(auth.uid()));

-- Insert UNEB subjects with unique codes
INSERT INTO public.uneb_subjects (code, name, exam_type, is_compulsory, subject_category, display_order) VALUES
('112', 'English Language', 'UCE', true, 'Languages', 1),
('456', 'Mathematics', 'UCE', true, 'Sciences', 2),
('535', 'Physics', 'UCE', false, 'Sciences', 10),
('545', 'Chemistry', 'UCE', false, 'Sciences', 11),
('553', 'Biology', 'UCE', false, 'Sciences', 12),
('241', 'History', 'UCE', false, 'Arts', 20),
('273', 'Geography', 'UCE', false, 'Arts', 21),
('291', 'CRE', 'UCE', false, 'Arts', 22),
('292', 'IRE', 'UCE', false, 'Arts', 23),
('122', 'Literature in English', 'UCE', false, 'Languages', 30),
('173', 'Luganda', 'UCE', false, 'Languages', 31),
('176', 'Kiswahili', 'UCE', false, 'Languages', 32),
('610', 'Agriculture', 'UCE', false, 'Vocational', 40),
('620', 'Home Economics', 'UCE', false, 'Vocational', 41),
('640', 'Commerce', 'UCE', false, 'Vocational', 42),
('680', 'Computer Studies', 'UCE', false, 'Vocational', 43),
('845', 'Art and Design', 'UCE', false, 'Vocational', 44),
('810', 'General Paper', 'UACE', true, 'General', 1),
('825', 'Sub-Mathematics', 'UACE', false, 'Sciences', 5),
('P535', 'Physics A-Level', 'UACE', false, 'Sciences', 10),
('C545', 'Chemistry A-Level', 'UACE', false, 'Sciences', 11),
('B553', 'Biology A-Level', 'UACE', false, 'Sciences', 12),
('M510', 'Mathematics A-Level', 'UACE', false, 'Sciences', 13),
('H241', 'History A-Level', 'UACE', false, 'Arts', 20),
('G273', 'Geography A-Level', 'UACE', false, 'Arts', 21),
('E770', 'Economics A-Level', 'UACE', false, 'Arts', 22),
('L122', 'Literature A-Level', 'UACE', false, 'Languages', 30),
('ENT', 'Entrepreneurship A-Level', 'UACE', false, 'Vocational', 40),
('CS756', 'Computer Science A-Level', 'UACE', false, 'Vocational', 41)
ON CONFLICT (code) DO NOTHING;