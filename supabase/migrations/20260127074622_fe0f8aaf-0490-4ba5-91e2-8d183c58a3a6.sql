-- First create the helper function if not exists
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$;

-- =============================================
-- PHASE 2: ACADEMICS, TIMETABLE & EXAMS TABLES
-- =============================================

-- School Timetable Periods (defines periods/slots in a day)
CREATE TABLE IF NOT EXISTS public.timetable_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  period_type TEXT DEFAULT 'lesson',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- School Timetable Entries (the actual schedule)
CREATE TABLE IF NOT EXISTS public.timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  period_id UUID NOT NULL REFERENCES public.timetable_periods(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  room TEXT,
  notes TEXT,
  term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Term Calendar Events (for term calendars)
CREATE TABLE IF NOT EXISTS public.term_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'general',
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME,
  end_time TIME,
  is_all_day BOOLEAN DEFAULT true,
  color TEXT DEFAULT '#3B82F6',
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Exam Types (Mid-term, End of Term, etc.)
CREATE TABLE IF NOT EXISTS public.exam_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  weight_percentage NUMERIC DEFAULT 100,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Exams (scheduled exams)
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  exam_type_id UUID NOT NULL REFERENCES public.exam_types(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  exam_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER,
  max_marks NUMERIC DEFAULT 100,
  venue TEXT,
  invigilator_id UUID REFERENCES public.employees(id),
  instructions TEXT,
  status TEXT DEFAULT 'scheduled',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Exam Results
CREATE TABLE IF NOT EXISTS public.exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  marks_obtained NUMERIC,
  grade TEXT,
  remarks TEXT,
  is_absent BOOLEAN DEFAULT false,
  graded_by UUID REFERENCES auth.users(id),
  graded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(exam_id, student_id)
);

-- Enable RLS on all tables
ALTER TABLE public.timetable_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.term_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenant access for timetable_periods" ON public.timetable_periods
  FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

CREATE POLICY "Tenant access for timetable_entries" ON public.timetable_entries
  FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

CREATE POLICY "Tenant access for term_calendar_events" ON public.term_calendar_events
  FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

CREATE POLICY "Tenant access for exam_types" ON public.exam_types
  FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

CREATE POLICY "Tenant access for exams" ON public.exams
  FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

CREATE POLICY "Tenant access for exam_results" ON public.exam_results
  FOR ALL USING (tenant_id = public.get_user_tenant_id() OR public.is_admin(auth.uid()));

-- Insert new school modules
INSERT INTO public.business_modules (code, name, description, icon, category, applicable_business_types, is_core, display_order)
VALUES 
  ('timetable', 'Timetable', 'Manage class timetables and schedules', 'CalendarDays', 'academics', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, 35),
  ('exams', 'Exams', 'Schedule and manage exams and results', 'ClipboardCheck', 'academics', ARRAY['primary_school', 'secondary_school'], false, 36),
  ('term_calendar', 'Term Calendar', 'Create and publish term calendars', 'Calendar', 'academics', ARRAY['kindergarten', 'primary_school', 'secondary_school'], false, 37)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  applicable_business_types = EXCLUDED.applicable_business_types;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_timetable_entries_class ON public.timetable_entries(class_id);
CREATE INDEX IF NOT EXISTS idx_timetable_entries_day ON public.timetable_entries(day_of_week);
CREATE INDEX IF NOT EXISTS idx_exams_term ON public.exams(term_id);
CREATE INDEX IF NOT EXISTS idx_exams_class ON public.exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON public.exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON public.exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_term_calendar_events_term ON public.term_calendar_events(term_id);