-- Ugandan School Administration Alignment
-- Governing Bodies, Academic Departments, Staff Roles
-- Following the Ministry of Education and Sports structure

-- 1. GOVERNING BODIES
-- Primary: School Management Committee (SMC)
-- Secondary: Board of Governors (BoG)
-- Nursery: School Board / Proprietor

CREATE TABLE IF NOT EXISTS public.governing_bodies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  body_type TEXT NOT NULL CHECK (body_type IN ('smc', 'bog', 'school_board', 'proprietorship')),
  name TEXT NOT NULL,
  chairperson_name TEXT,
  chairperson_contact TEXT,
  deputy_chairperson TEXT,
  secretary TEXT,
  treasurer TEXT,
  meeting_frequency TEXT DEFAULT 'termly',
  term_years INTEGER DEFAULT 3,
  formed_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dissolved', 'pending')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.governing_body_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  governing_body_id UUID NOT NULL REFERENCES public.governing_bodies(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'chairperson', 'vice_chairperson', 'secretary', 'treasurer',
    'parent_representative', 'teacher_representative', 'community_representative',
    'local_government_representative', 'founder_representative', 'member',
    'ex_officio', 'head_teacher'
  )),
  phone TEXT,
  email TEXT,
  appointment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiry_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.governing_body_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  governing_body_id UUID NOT NULL REFERENCES public.governing_bodies(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'regular' CHECK (meeting_type IN ('regular', 'special', 'emergency', 'annual')),
  agenda TEXT,
  minutes TEXT,
  venue TEXT,
  attendance_count INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'ongoing', 'adjourned', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. ACADEMIC DEPARTMENTS (Secondary Schools)
-- Mathematics, Sciences, Languages, Humanities, ICT, Technical, etc.

CREATE TABLE IF NOT EXISTS public.academic_departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  hod_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

-- 3. STAFF ROLE ASSIGNMENTS (Ugandan School Hierarchy)
-- Head Teacher, Deputy Head (Admin), Deputy Head (Academics)
-- Director of Studies, Dean of Students, Senior Man/Woman
-- Head of Department, Class Teacher, Games Master, Boarding Master, etc.

CREATE TABLE IF NOT EXISTS public.staff_role_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  role_type TEXT NOT NULL CHECK (role_type IN (
    'head_teacher', 'deputy_head_admin', 'deputy_head_academics',
    'director_of_studies', 'dean_of_students',
    'senior_man', 'senior_woman',
    'head_of_department', 'class_teacher',
    'games_master', 'games_mistress',
    'boarding_master', 'boarding_mistress',
    'patron', 'matron',
    'school_nurse', 'librarian', 'lab_technician', 'ict_technician',
    'guidance_counselor', 'head_of_section'
  )),
  department_id UUID REFERENCES public.academic_departments(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.school_classes(id) ON DELETE SET NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  responsibilities TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. ENHANCE SCHOOL CLASSES FOR SECONDARY LEVEL SPLIT
ALTER TABLE public.school_classes
  ADD COLUMN IF NOT EXISTS secondary_level TEXT CHECK (secondary_level IN ('o-level', 'a-level'));

-- 5. SCHOOL INSPECTION RECORDS
CREATE TABLE IF NOT EXISTS public.school_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  inspection_date DATE NOT NULL,
  inspector_name TEXT NOT NULL,
  inspector_title TEXT,
  inspector_organization TEXT DEFAULT 'Directorate of Education Standards',
  inspection_type TEXT NOT NULL CHECK (inspection_type IN (
    'routine', 'follow_up', 'complaint', 'special', 'registration'
  )),
  findings TEXT,
  recommendations TEXT,
  action_plan TEXT,
  follow_up_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'actioned', 'closed')),
  report_file_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.governing_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governing_body_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governing_body_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_inspections ENABLE ROW LEVEL SECURITY;

-- RLS policies: staff can manage their tenant's data
CREATE POLICY "Tenant staff can manage governing bodies"
  ON public.governing_bodies FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant staff can manage governing body members"
  ON public.governing_body_members FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant staff can manage governing body meetings"
  ON public.governing_body_meetings FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant staff can manage academic departments"
  ON public.academic_departments FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant staff can manage staff role assignments"
  ON public.staff_role_assignments FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant staff can manage school inspections"
  ON public.school_inspections FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Add to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.governing_bodies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.governing_body_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.governing_body_meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_role_assignments;

-- Notify PG Sync
NOTIFY pgrst, 'reload schema';
