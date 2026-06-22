-- Student Discipline and Appeals System
-- Manages red cards, discipline cases, and student appeals

-- Create discipline severity levels enum
CREATE TYPE discipline_severity AS ENUM ('low', 'medium', 'high', 'critical');

-- Create appeal status enum
CREATE TYPE appeal_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'closed');

-- Create discipline rules table (per school)
CREATE TABLE IF NOT EXISTS public.school_discipline_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Rule configuration
  rule_name TEXT NOT NULL,
  description TEXT,
  offense_type TEXT NOT NULL, -- e.g., "violence", "bullying", "academic_dishonesty", "drugs", "sexual_assault"
  severity discipline_severity NOT NULL,
  
  -- Login blocking rules
  blocks_portal_login BOOLEAN DEFAULT false, -- If true, students with this severity can't login
  blocks_after_count INT DEFAULT 1, -- How many incidents before blocking
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, offense_type, severity)
);

-- Create student discipline cases table
CREATE TABLE IF NOT EXISTS public.student_discipline_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  
  -- Case details
  case_number TEXT NOT NULL, -- Format: {schoolcode}-{admissionnumber}-{date}
  offense_type TEXT NOT NULL,
  severity discipline_severity NOT NULL,
  description TEXT,
  
  -- Timeline
  incident_date DATE NOT NULL,
  reported_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_date DATE,
  
  -- Status
  status TEXT DEFAULT 'open', -- 'open', 'under_review', 'resolved', 'appealed'
  is_active BOOLEAN DEFAULT true, -- If false, doesn't block portal access
  can_appeal BOOLEAN DEFAULT true,
  
  -- Staff info
  reported_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Outcome
  outcome TEXT, -- Description of resolution
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(tenant_id, case_number)
);

-- Create student appeals table
CREATE TABLE IF NOT EXISTS public.student_discipline_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  discipline_case_id UUID NOT NULL REFERENCES public.student_discipline_cases(id) ON DELETE CASCADE,
  
  -- Appeal details
  appeal_reason TEXT NOT NULL,
  supporting_evidence TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Appeal handling
  status appeal_status DEFAULT 'submitted',
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  appeal_decision TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_student_discipline_cases_student_id ON public.student_discipline_cases(student_id);
CREATE INDEX idx_student_discipline_cases_tenant_id ON public.student_discipline_cases(tenant_id);
CREATE INDEX idx_student_discipline_cases_is_active ON public.student_discipline_cases(is_active, tenant_id);
CREATE INDEX idx_student_discipline_appeals_student_id ON public.student_discipline_appeals(student_id);
CREATE INDEX idx_student_discipline_appeals_discipline_case_id ON public.student_discipline_appeals(discipline_case_id);

-- Enable RLS
ALTER TABLE public.school_discipline_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_discipline_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_discipline_appeals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school_discipline_rules
CREATE POLICY "School admins can view their discipline rules"
  ON public.school_discipline_rules FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.staff
      WHERE tenant_id = school_discipline_rules.tenant_id
        AND role = 'admin'
    )
  );

CREATE POLICY "School admins can create discipline rules"
  ON public.school_discipline_rules FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.staff
      WHERE tenant_id = NEW.tenant_id
        AND role = 'admin'
    )
  );

-- RLS Policies for student_discipline_cases
CREATE POLICY "Students can view their own cases"
  ON public.student_discipline_cases FOR SELECT
  USING (
    auth.uid() = (SELECT user_id FROM public.students WHERE id = student_discipline_cases.student_id)
  );

CREATE POLICY "School staff can view discipline cases in their school"
  ON public.student_discipline_cases FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.staff
      WHERE tenant_id = student_discipline_cases.tenant_id
    )
  );

CREATE POLICY "School admins can create discipline cases"
  ON public.student_discipline_cases FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.staff
      WHERE tenant_id = NEW.tenant_id
        AND role IN ('admin', 'disciplinarian')
    )
  );

-- RLS Policies for student_discipline_appeals
CREATE POLICY "Students can view their own appeals"
  ON public.student_discipline_appeals FOR SELECT
  USING (
    auth.uid() = (SELECT user_id FROM public.students WHERE id = student_discipline_appeals.student_id)
  );

CREATE POLICY "School staff can view appeals for their school"
  ON public.student_discipline_appeals FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.staff
      WHERE tenant_id = student_discipline_appeals.tenant_id
    )
  );

CREATE POLICY "Students can submit appeals for their cases"
  ON public.student_discipline_appeals FOR INSERT
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM public.students WHERE id = student_discipline_appeals.student_id)
      AND NOT EXISTS (
        SELECT 1 FROM public.student_discipline_appeals
        WHERE discipline_case_id = NEW.discipline_case_id
          AND student_id = NEW.student_id
          AND status IN ('submitted', 'under_review')
      )
  );

CREATE POLICY "School staff can update appeal status"
  ON public.student_discipline_appeals FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.staff
      WHERE tenant_id = student_discipline_appeals.tenant_id
        AND role IN ('admin', 'disciplinarian')
    )
  );
