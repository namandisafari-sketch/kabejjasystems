
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
