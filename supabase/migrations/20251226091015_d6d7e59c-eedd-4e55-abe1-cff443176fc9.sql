
-- School subjects offered by each school
CREATE TABLE public.school_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  category TEXT DEFAULT 'core', -- core, elective, optional
  level TEXT NOT NULL DEFAULT 'o-level', -- o-level, a-level, both
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, name, level)
);

-- Student report cards (one per student per term)
CREATE TABLE public.student_report_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.school_classes(id),
  
  -- Attendance
  days_present INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  total_school_days INTEGER DEFAULT 0,
  
  -- Prefect status
  is_prefect BOOLEAN DEFAULT false,
  prefect_title TEXT,
  
  -- Discipline
  discipline_remark TEXT DEFAULT 'Well disciplined',
  
  -- Ranking
  class_rank INTEGER,
  total_students_in_class INTEGER,
  total_score NUMERIC(5,2) DEFAULT 0,
  average_score NUMERIC(5,2) DEFAULT 0,
  
  -- Comments
  class_teacher_comment TEXT,
  head_teacher_comment TEXT,
  
  -- Signatures
  class_teacher_signature TEXT,
  head_teacher_signature TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft', -- draft, published
  published_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(tenant_id, student_id, term_id)
);

-- Subject scores for each report card
CREATE TABLE public.report_card_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id UUID NOT NULL REFERENCES public.student_report_cards(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.school_subjects(id) ON DELETE CASCADE,
  
  -- Scores (Uganda system)
  formative_score NUMERIC(5,2) DEFAULT 0, -- 20% weight
  school_based_score NUMERIC(5,2) DEFAULT 0, -- 80% weight (exams)
  total_score NUMERIC(5,2) GENERATED ALWAYS AS (
    (formative_score * 0.2) + (school_based_score * 0.8)
  ) STORED,
  
  -- Competency (1.0 - 3.0 scale)
  competency_score NUMERIC(3,2) DEFAULT 0,
  
  -- Grade (auto-calculated but stored)
  grade TEXT,
  grade_descriptor TEXT,
  
  -- Teacher remarks
  subject_remark TEXT,
  teacher_name TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(report_card_id, subject_id)
);

-- Generic skills and values assessment
CREATE TABLE public.report_card_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id UUID NOT NULL REFERENCES public.student_report_cards(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  skill_category TEXT DEFAULT 'generic', -- generic, values
  rating TEXT, -- Excellent, Very Good, Good, Fair, Needs Improvement
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(report_card_id, skill_name)
);

-- Co-curricular activities
CREATE TABLE public.report_card_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_card_id UUID NOT NULL REFERENCES public.student_report_cards(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL, -- sports, clubs, projects
  activity_name TEXT NOT NULL,
  performance TEXT, -- Excellent, Very Good, Good, Fair, Participated
  remark TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Monthly attendance tracking
CREATE TABLE public.student_monthly_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  month INTEGER NOT NULL, -- 1-12
  year INTEGER NOT NULL,
  days_present INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  total_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(tenant_id, student_id, term_id, month, year)
);

-- Enable RLS on all tables
ALTER TABLE public.school_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_report_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_monthly_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school_subjects
CREATE POLICY "Users can view their tenant subjects" ON public.school_subjects
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert subjects for their tenant" ON public.school_subjects
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant subjects" ON public.school_subjects
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant subjects" ON public.school_subjects
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for student_report_cards
CREATE POLICY "Users can view their tenant report cards" ON public.student_report_cards
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert report cards for their tenant" ON public.student_report_cards
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant report cards" ON public.student_report_cards
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant report cards" ON public.student_report_cards
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for report_card_scores
CREATE POLICY "Users can manage report card scores" ON public.report_card_scores
  FOR ALL USING (report_card_id IN (
    SELECT id FROM student_report_cards WHERE tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- RLS Policies for report_card_skills
CREATE POLICY "Users can manage report card skills" ON public.report_card_skills
  FOR ALL USING (report_card_id IN (
    SELECT id FROM student_report_cards WHERE tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- RLS Policies for report_card_activities
CREATE POLICY "Users can manage report card activities" ON public.report_card_activities
  FOR ALL USING (report_card_id IN (
    SELECT id FROM student_report_cards WHERE tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  ));

-- RLS Policies for student_monthly_attendance
CREATE POLICY "Users can view their tenant attendance" ON public.student_monthly_attendance
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert attendance for their tenant" ON public.student_monthly_attendance
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant attendance" ON public.student_monthly_attendance
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant attendance" ON public.student_monthly_attendance
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
