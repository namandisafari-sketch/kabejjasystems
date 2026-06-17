-- NCDC New Curriculum: Subject Elements, Activities of Integration
-- Flexible Report Card Templates & Automated Delivery
-- Following Uganda Ministry of Education and Sports (NCDC) guidelines

-- 1. SUBJECT ELEMENTS
-- A subject like MUSIC breaks into: Singing, Dancing, Phrases & Rhymes, Role-play, Instruments
CREATE TABLE IF NOT EXISTS public.subject_elements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  school_subject_id UUID NOT NULL REFERENCES public.school_subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  max_score NUMERIC(5,1) DEFAULT 100,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. ACTIVITIES OF INTEGRATION (AOI) - Chapter-based assessment
-- Per chapter/unit, each student gets scored; these feed into UNEB final grade
CREATE TABLE IF NOT EXISTS public.activities_of_integration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  school_subject_id UUID NOT NULL REFERENCES public.school_subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.school_classes(id) ON DELETE CASCADE,
  academic_term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  chapter_title TEXT NOT NULL,
  max_score NUMERIC(5,1) DEFAULT 100,
  weight_percentage NUMERIC(5,1) DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_subject_id, class_id, academic_term_id, chapter_number)
);

-- Per-student AOI scores
CREATE TABLE IF NOT EXISTS public.student_aoi_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aoi_id UUID NOT NULL REFERENCES public.activities_of_integration(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score NUMERIC(5,1) NOT NULL,
  remarks TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(aoi_id, student_id)
);

-- 3. FLEXIBLE REPORT CARD TEMPLATES
-- Schools define their own layout, sections, and computation rules
CREATE TABLE IF NOT EXISTS public.report_card_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  level TEXT NOT NULL CHECK (level IN ('o-level', 'a-level', 'primary', 'kindergarten')),
  layout_config JSONB NOT NULL DEFAULT '{}',
  scoring_config JSONB NOT NULL DEFAULT '{}',
  grading_scale JSONB NOT NULL DEFAULT '[]',
  sections JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. REPORT CARD LAYOUT SECTIONS (within a template)
CREATE TABLE IF NOT EXISTS public.report_card_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.report_card_templates(id) ON DELETE CASCADE,
  section_type TEXT NOT NULL,
  title TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}',
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. SCORING RULES - How aggregate/composite scores are computed
CREATE TABLE IF NOT EXISTS public.scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN (
    'weighted_average', 'sum_of_scores', 'best_of',
    'competency_based', 'custom_formula'
  )),
  config JSONB NOT NULL DEFAULT '{}',
  applicable_levels TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. AUTOMATED REPORT DELIVERY CONFIG
-- Email PDFs to parents with conditions
CREATE TABLE IF NOT EXISTS public.report_delivery_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  delivery_method TEXT NOT NULL DEFAULT 'email' CHECK (delivery_method IN ('email', 'sms', 'both')),
  format TEXT NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'csv', 'both')),
  conditions JSONB DEFAULT '[]',
  schedule TEXT DEFAULT 'manual' CHECK (schedule IN ('manual', 'on_publish', 'scheduled')),
  send_to_parents BOOLEAN DEFAULT true,
  send_to_guardians BOOLEAN DEFAULT false,
  allow_preflight BOOLEAN DEFAULT true,
  cc_staff_emails TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Delivery log
CREATE TABLE IF NOT EXISTS public.report_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  report_card_id UUID REFERENCES public.student_report_cards(id) ON DELETE SET NULL,
  delivery_config_id UUID REFERENCES public.report_delivery_config(id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  student_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. MARKSHEET ANALYSIS VIEWS
-- Aggregate view for academic meetings
CREATE OR REPLACE VIEW public.marksheet_summary AS
SELECT
  sg.tenant_id,
  st.class_id,
  sc.name AS class_name,
  sg.subject_id,
  sub.name AS subject_name,
  sg.term_id AS academic_term_id,
  t.name AS term_name,
  COUNT(DISTINCT sg.student_id) AS total_students,
  ROUND(AVG(sg.score)::numeric, 1) AS average_score,
  ROUND(MAX(sg.score)::numeric, 1) AS highest_score,
  ROUND(MIN(sg.score)::numeric, 1) AS lowest_score,
  ROUND(AVG(sg.score)::numeric, 1) AS mean_score,
  ROUND(STDDEV(sg.score)::numeric, 1) AS std_deviation,
  COUNT(*) FILTER (WHERE sg.score >= 80) AS grade_a_count,
  COUNT(*) FILTER (WHERE sg.score >= 70 AND sg.score < 80) AS grade_b_count,
  COUNT(*) FILTER (WHERE sg.score >= 60 AND sg.score < 70) AS grade_c_count,
  COUNT(*) FILTER (WHERE sg.score >= 50 AND sg.score < 60) AS grade_d_count,
  COUNT(*) FILTER (WHERE sg.score < 50) AS grade_f_count
FROM public.student_grades sg
JOIN public.students st ON sg.student_id = st.id
LEFT JOIN public.school_classes sc ON st.class_id = sc.id
LEFT JOIN public.subjects sub ON sg.subject_id = sub.id
LEFT JOIN public.academic_terms t ON sg.term_id = t.id
GROUP BY sg.tenant_id, st.class_id, sc.name, sg.subject_id, sub.name, sg.term_id, t.name;

-- Per-student AOI cumulative view
CREATE OR REPLACE VIEW public.student_aoi_summary AS
SELECT
  a.tenant_id,
  sas.student_id,
  st.full_name AS student_name,
  st.class_id,
  a.school_subject_id,
  sub.name AS subject_name,
  a.academic_term_id,
  COUNT(sas.id) AS chapters_assessed,
  ROUND(SUM(sas.score)::numeric, 1) AS total_score,
  ROUND(SUM(a.max_score)::numeric, 1) AS total_possible,
  ROUND((SUM(sas.score) / NULLIF(SUM(a.max_score), 0) * 100)::numeric, 1) AS percentage
FROM public.activities_of_integration a
JOIN public.student_aoi_scores sas ON sas.aoi_id = a.id
JOIN public.students st ON sas.student_id = st.id
JOIN public.school_subjects sub ON a.school_subject_id = sub.id
GROUP BY a.tenant_id, sas.student_id, st.full_name, st.class_id, a.school_subject_id, sub.name, a.academic_term_id;

-- 8. RLS POLICIES
ALTER TABLE public.subject_elements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities_of_integration ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_aoi_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_card_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_delivery_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_access_subject_elements" ON public.subject_elements
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_access_aoi" ON public.activities_of_integration
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_access_student_aoi_scores" ON public.student_aoi_scores
  FOR ALL USING (aoi_id IN (SELECT id FROM activities_of_integration WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "tenant_access_report_templates" ON public.report_card_templates
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_access_report_sections" ON public.report_card_sections
  FOR ALL USING (template_id IN (SELECT id FROM report_card_templates WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "tenant_access_scoring_rules" ON public.scoring_rules
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_access_delivery_config" ON public.report_delivery_config
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "tenant_access_delivery_log" ON public.report_delivery_log
  FOR ALL USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
