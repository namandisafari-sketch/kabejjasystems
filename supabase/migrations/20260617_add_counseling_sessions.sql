-- Create counseling sessions table for Guidance & Counseling module
CREATE TABLE public.counseling_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_number TEXT NOT NULL,
  counselor_name TEXT NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_type TEXT NOT NULL DEFAULT 'individual', -- 'individual', 'group', 'family'
  issue_category TEXT NOT NULL, -- 'academic', 'behavioral', 'emotional', 'social', 'career', 'family', 'bullying', 'trauma', 'substance_abuse', 'other'
  issue_description TEXT NOT NULL,
  notes TEXT,
  action_plan TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed', 'referred'
  referred_to TEXT, -- external counselor, psychologist, social worker, etc.
  parent_involvement TEXT NOT NULL DEFAULT 'not_involved', -- 'informed', 'involved', 'not_involved'
  confidentiality TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'confidential', 'restricted'
  follow_up_date DATE,
  follow_up_notes TEXT,
  outcome TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_counseling_sessions_tenant ON public.counseling_sessions(tenant_id);
CREATE INDEX idx_counseling_sessions_student ON public.counseling_sessions(student_id);
CREATE INDEX idx_counseling_sessions_status ON public.counseling_sessions(status);
CREATE INDEX idx_counseling_sessions_category ON public.counseling_sessions(issue_category);
CREATE INDEX idx_counseling_sessions_date ON public.counseling_sessions(session_date);

-- Enable RLS
ALTER TABLE public.counseling_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff
CREATE POLICY "Staff can view their tenant counseling sessions"
  ON public.counseling_sessions FOR SELECT
  USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Staff can insert counseling sessions for their tenant"
  ON public.counseling_sessions FOR INSERT
  WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Staff can update their tenant counseling sessions"
  ON public.counseling_sessions FOR UPDATE
  USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Staff can delete their tenant counseling sessions"
  ON public.counseling_sessions FOR DELETE
  USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Auto-generate session number trigger
CREATE OR REPLACE FUNCTION public.generate_counseling_session_number()
RETURNS TRIGGER AS $$
DECLARE
  session_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO session_count 
  FROM public.counseling_sessions 
  WHERE tenant_id = NEW.tenant_id 
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  NEW.session_number := 'CS-' || year_prefix || '-' || LPAD(session_count::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_counseling_session_number
  BEFORE INSERT ON public.counseling_sessions
  FOR EACH ROW
  WHEN (NEW.session_number IS NULL OR NEW.session_number = '')
  EXECUTE FUNCTION public.generate_counseling_session_number();

-- Update timestamp trigger
CREATE TRIGGER update_counseling_sessions_updated_at
  BEFORE UPDATE ON public.counseling_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
