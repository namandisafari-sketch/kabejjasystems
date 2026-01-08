
-- Create gate check-ins table to record student arrivals/departures
CREATE TABLE public.gate_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL,
  student_id UUID NOT NULL,
  check_type TEXT NOT NULL DEFAULT 'arrival' CHECK (check_type IN ('arrival', 'departure')),
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  checked_by UUID,
  is_late BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create parent-student linking table
CREATE TABLE public.parent_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL,
  student_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  relationship TEXT NOT NULL DEFAULT 'parent',
  is_primary_contact BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(parent_id, student_id)
);

-- Create parents table for parent-specific info
CREATE TABLE public.parents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  tenant_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  occupation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gate_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents ENABLE ROW LEVEL SECURITY;

-- Gate check-ins policies (school staff can manage)
CREATE POLICY "Staff can view tenant gate checkins" ON public.gate_checkins
  FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Staff can insert gate checkins" ON public.gate_checkins
  FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Parents can view their children's check-ins
CREATE POLICY "Parents can view their children checkins" ON public.gate_checkins
  FOR SELECT USING (
    student_id IN (
      SELECT ps.student_id FROM parent_students ps
      JOIN parents p ON ps.parent_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Parent students policies
CREATE POLICY "Staff can manage parent-student links" ON public.parent_students
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Parents can view their links" ON public.parent_students
  FOR SELECT USING (parent_id IN (SELECT id FROM parents WHERE user_id = auth.uid()));

-- Parents table policies
CREATE POLICY "Staff can manage parents" ON public.parents
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

CREATE POLICY "Parents can view own record" ON public.parents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Parents can update own record" ON public.parents
  FOR UPDATE USING (user_id = auth.uid());

-- Add late arrival threshold to tenants (minutes after school start)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS late_arrival_minutes INTEGER DEFAULT 30;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS school_start_time TIME DEFAULT '08:00:00';

-- Create index for faster lookups
CREATE INDEX idx_gate_checkins_student ON public.gate_checkins(student_id, checked_at DESC);
CREATE INDEX idx_gate_checkins_tenant_date ON public.gate_checkins(tenant_id, checked_at);
CREATE INDEX idx_parent_students_parent ON public.parent_students(parent_id);
