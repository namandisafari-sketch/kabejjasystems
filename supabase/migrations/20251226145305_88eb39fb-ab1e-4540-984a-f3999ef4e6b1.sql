-- =====================================
-- ECD/Kindergarten School System Tables
-- =====================================

-- 1. Learning Areas (replace subjects for kindergarten)
CREATE TABLE public.ecd_learning_areas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  icon TEXT, -- emoji or icon name
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default learning areas for kindergarten
INSERT INTO public.ecd_learning_areas (tenant_id, name, description, display_order, icon, is_active)
SELECT t.id, la.name, la.description, la.display_order, la.icon, true
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('Language Development', 'Speaking, listening, and communication skills', 1, '🗣️'),
    ('Literacy', 'Letters, reading readiness, and writing skills', 2, '📖'),
    ('Numeracy', 'Counting, numbers, shapes, and patterns', 3, '🔢'),
    ('Creative Arts & Craft', 'Drawing, painting, and creative expression', 4, '🎨'),
    ('Music, Dance & Drama', 'Singing, dancing, and dramatic play', 5, '🎵'),
    ('Social & Emotional Skills', 'Sharing, cooperation, and emotional awareness', 6, '🤝'),
    ('Health, Hygiene & Safety', 'Personal care and safety awareness', 7, '🧼'),
    ('Science Through Play', 'Exploration and discovery activities', 8, '🔬'),
    ('Games & Sports', 'Physical activities and motor skills', 9, '⚽')
) AS la(name, description, display_order, icon)
WHERE t.business_type = 'kindergarten';

-- Enable RLS
ALTER TABLE public.ecd_learning_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant learning areas" ON public.ecd_learning_areas
FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- 2. Competency Rating Scale
CREATE TABLE public.ecd_rating_scale (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL, -- e.g., 'outstanding', 'very_good', etc.
  label TEXT NOT NULL, -- e.g., 'Outstanding', 'Very Good'
  description TEXT, -- 'Skills mastered beyond expectation'
  icon TEXT, -- emoji like '🌟'
  display_order INTEGER DEFAULT 0,
  color TEXT, -- hex color for display
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default rating scale
INSERT INTO public.ecd_rating_scale (tenant_id, code, label, description, icon, display_order, color, is_active)
SELECT t.id, rs.code, rs.label, rs.description, rs.icon, rs.display_order, rs.color, true
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('outstanding', 'Outstanding', 'Skills mastered beyond expectation', '🌟', 1, '#FFD700'),
    ('very_good', 'Very Good', 'Skills well developed', '😊', 2, '#22C55E'),
    ('good', 'Good', 'Skills developing well', '👍', 3, '#3B82F6'),
    ('developing', 'Developing', 'Progress seen, needs more practice', '🧩', 4, '#F59E0B'),
    ('needs_support', 'Needs Support', 'Requires close teacher/parent help', '🆘', 5, '#EF4444')
) AS rs(code, label, description, icon, display_order, color)
WHERE t.business_type = 'kindergarten';

-- Enable RLS
ALTER TABLE public.ecd_rating_scale ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant rating scale" ON public.ecd_rating_scale
FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- 3. Class Roles/Badges
CREATE TABLE public.ecd_class_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., 'Class Helper', 'Toys Captain'
  description TEXT,
  badge_icon TEXT, -- emoji like '⭐', '🍼', '🎀'
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default class roles
INSERT INTO public.ecd_class_roles (tenant_id, name, description, badge_icon, display_order, is_active)
SELECT t.id, cr.name, cr.description, cr.badge_icon, cr.display_order, true
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('Class Helper', 'Assists the teacher with daily activities', '⭐', 1),
    ('Toys Captain', 'Manages and organizes classroom toys', '🧸', 2),
    ('Health Monitor', 'Reminds classmates about hygiene', '🧼', 3),
    ('MDD Leader', 'Leads music, dance and drama activities', '🎵', 4),
    ('Sports Captain', 'Leads games and sports activities', '⚽', 5),
    ('Cleanliness Star', 'Promotes classroom cleanliness', '✨', 6),
    ('Reading Star', 'Encourages love for reading', '📚', 7),
    ('Art Captain', 'Helps with creative arts activities', '🎨', 8)
) AS cr(name, description, badge_icon, display_order)
WHERE t.business_type = 'kindergarten';

-- Enable RLS
ALTER TABLE public.ecd_class_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant class roles" ON public.ecd_class_roles
FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- 4. Student Role Assignments
CREATE TABLE public.ecd_student_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.ecd_class_roles(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, role_id, term_id)
);

-- Enable RLS
ALTER TABLE public.ecd_student_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant student roles" ON public.ecd_student_roles
FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- 5. Generic Skills & Values to Track
CREATE TABLE public.ecd_skills_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'skill', -- 'skill' or 'value'
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default skills and values
INSERT INTO public.ecd_skills_values (tenant_id, name, category, description, display_order, is_active)
SELECT t.id, sv.name, sv.category, sv.description, sv.display_order, true
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('Sharing & Teamwork', 'skill', 'Works well with others and shares toys/materials', 1),
    ('Respect & Discipline', 'value', 'Shows respect to teachers and classmates', 2),
    ('Confidence & Communication', 'skill', 'Expresses self clearly and confidently', 3),
    ('Creativity & Curiosity', 'skill', 'Shows interest in learning and exploring', 4),
    ('Cleanliness & Hygiene', 'value', 'Maintains personal hygiene', 5),
    ('Helping Others', 'value', 'Willingly helps classmates and teachers', 6),
    ('Emotional Awareness', 'skill', 'Recognizes and manages own emotions', 7),
    ('Following Instructions', 'skill', 'Listens and follows directions', 8)
) AS sv(name, category, description, display_order)
WHERE t.business_type = 'kindergarten';

-- Enable RLS
ALTER TABLE public.ecd_skills_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant skills values" ON public.ecd_skills_values
FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- 6. ECD Report Cards
CREATE TABLE public.ecd_report_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.school_classes(id) ON DELETE SET NULL,
  -- Attendance summary
  total_school_days INTEGER DEFAULT 0,
  days_present INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  -- Comments
  teacher_comment TEXT,
  behavior_comment TEXT,
  parent_feedback TEXT, -- Parent can add response
  -- Signature
  teacher_name TEXT,
  teacher_signature_url TEXT,
  -- Metadata
  status TEXT DEFAULT 'draft', -- draft, published
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, term_id)
);

-- Enable RLS
ALTER TABLE public.ecd_report_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage their tenant report cards" ON public.ecd_report_cards
FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Parents can view their children report cards" ON public.ecd_report_cards
FOR SELECT USING (student_id IN (
  SELECT ps.student_id FROM parent_students ps
  JOIN parents p ON ps.parent_id = p.id
  WHERE p.user_id = auth.uid()
));

-- 7. Learning Area Ratings (per report card)
CREATE TABLE public.ecd_learning_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_card_id UUID NOT NULL REFERENCES public.ecd_report_cards(id) ON DELETE CASCADE,
  learning_area_id UUID NOT NULL REFERENCES public.ecd_learning_areas(id) ON DELETE CASCADE,
  rating_code TEXT NOT NULL, -- 'outstanding', 'very_good', etc.
  remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_card_id, learning_area_id)
);

-- Enable RLS
ALTER TABLE public.ecd_learning_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage learning ratings" ON public.ecd_learning_ratings
FOR ALL USING (report_card_id IN (
  SELECT id FROM ecd_report_cards WHERE tenant_id IN (
    SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
  )
));

CREATE POLICY "Parents can view their children learning ratings" ON public.ecd_learning_ratings
FOR SELECT USING (report_card_id IN (
  SELECT rc.id FROM ecd_report_cards rc
  JOIN students s ON rc.student_id = s.id
  WHERE s.id IN (
    SELECT ps.student_id FROM parent_students ps
    JOIN parents p ON ps.parent_id = p.id
    WHERE p.user_id = auth.uid()
  )
));

-- 8. Skills & Values Ratings (per report card)
CREATE TABLE public.ecd_skills_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_card_id UUID NOT NULL REFERENCES public.ecd_report_cards(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.ecd_skills_values(id) ON DELETE CASCADE,
  is_achieved BOOLEAN DEFAULT false, -- tick/check
  rating_code TEXT, -- optional rating
  remark TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(report_card_id, skill_id)
);

-- Enable RLS
ALTER TABLE public.ecd_skills_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage skills ratings" ON public.ecd_skills_ratings
FOR ALL USING (report_card_id IN (
  SELECT id FROM ecd_report_cards WHERE tenant_id IN (
    SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()
  )
));

CREATE POLICY "Parents can view their children skills ratings" ON public.ecd_skills_ratings
FOR SELECT USING (report_card_id IN (
  SELECT rc.id FROM ecd_report_cards rc WHERE rc.student_id IN (
    SELECT ps.student_id FROM parent_students ps
    JOIN parents p ON ps.parent_id = p.id
    WHERE p.user_id = auth.uid()
  )
));

-- 9. Monthly Attendance for ECD
CREATE TABLE public.ecd_monthly_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
  month INTEGER NOT NULL, -- 1-12
  year INTEGER NOT NULL,
  total_days INTEGER DEFAULT 0,
  days_present INTEGER DEFAULT 0,
  days_absent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, term_id, month, year)
);

-- Enable RLS
ALTER TABLE public.ecd_monthly_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage monthly attendance" ON public.ecd_monthly_attendance
FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Parents can view their children attendance" ON public.ecd_monthly_attendance
FOR SELECT USING (student_id IN (
  SELECT ps.student_id FROM parent_students ps
  JOIN parents p ON ps.parent_id = p.id
  WHERE p.user_id = auth.uid()
));

-- 10. ECD Report Card Settings
CREATE TABLE public.ecd_report_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  -- Theme settings
  theme TEXT DEFAULT 'playful', -- 'playful', 'classic', 'modern', 'nature'
  primary_color TEXT DEFAULT '#FF6B9D',
  secondary_color TEXT DEFAULT '#4ECDC4',
  -- Display options
  show_attendance BOOLEAN DEFAULT true,
  show_roles BOOLEAN DEFAULT true,
  show_skills BOOLEAN DEFAULT true,
  show_values BOOLEAN DEFAULT true,
  show_parent_tips BOOLEAN DEFAULT true,
  show_photo BOOLEAN DEFAULT true,
  -- Report info
  report_title TEXT DEFAULT 'Progress Report Card',
  watermark_text TEXT,
  footer_message TEXT DEFAULT 'Every child is a star! ⭐',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ecd_report_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their tenant report settings" ON public.ecd_report_settings
FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Add ECD-specific fields to students table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS ecd_level TEXT, -- 'baby_class', 'middle_class', 'top_class'
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS nin_optional TEXT;