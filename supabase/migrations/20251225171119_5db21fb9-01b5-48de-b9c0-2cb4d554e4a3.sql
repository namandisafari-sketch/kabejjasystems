-- Create academic terms table for term-based billing
CREATE TABLE public.academic_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  term_number INTEGER NOT NULL CHECK (term_number BETWEEN 1 AND 3),
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, term_number, year)
);

-- Create school classes table
CREATE TABLE public.school_classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('kindergarten', 'primary', 'secondary')),
  grade TEXT NOT NULL,
  section TEXT,
  class_teacher_id UUID REFERENCES public.employees(id),
  capacity INTEGER DEFAULT 40,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  admission_number TEXT NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  class_id UUID REFERENCES public.school_classes(id),
  parent_name TEXT,
  parent_phone TEXT,
  parent_email TEXT,
  address TEXT,
  admission_date DATE DEFAULT CURRENT_DATE,
  photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, admission_number)
);

-- Create student attendance table
CREATE TABLE public.student_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.school_classes(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  notes TEXT,
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, date)
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT,
  level TEXT NOT NULL CHECK (level IN ('kindergarten', 'primary', 'secondary', 'all')),
  is_core BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student grades/marks table
CREATE TABLE public.student_grades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id),
  term_id UUID NOT NULL REFERENCES public.academic_terms(id),
  assessment_type TEXT NOT NULL CHECK (assessment_type IN ('exam', 'test', 'assignment', 'practical', 'project')),
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL DEFAULT 100,
  grade TEXT,
  remarks TEXT,
  recorded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fee structure table
CREATE TABLE public.fee_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('kindergarten', 'primary', 'secondary', 'all')),
  term_id UUID REFERENCES public.academic_terms(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  fee_type TEXT NOT NULL CHECK (fee_type IN ('tuition', 'boarding', 'transport', 'meals', 'uniform', 'books', 'activity', 'other')),
  is_mandatory BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student fees table (individual student fee records)
CREATE TABLE public.student_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.academic_terms(id),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance NUMERIC GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue')),
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, term_id)
);

-- Create fee payments table
CREATE TABLE public.fee_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  student_fee_id UUID NOT NULL REFERENCES public.student_fees(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id),
  amount NUMERIC NOT NULL,
  payment_method TEXT DEFAULT 'cash',
  reference_number TEXT,
  receipt_number TEXT,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  received_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create school subscription packages table (per-term pricing)
CREATE TABLE public.school_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  school_level TEXT NOT NULL CHECK (school_level IN ('kindergarten', 'primary', 'secondary', 'all')),
  price_per_term NUMERIC NOT NULL,
  student_limit INTEGER,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create school subscriptions table
CREATE TABLE public.school_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.school_packages(id),
  term_id UUID NOT NULL REFERENCES public.academic_terms(id),
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'expired')),
  activated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, term_id)
);

-- Enable RLS on all tables
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for academic_terms
CREATE POLICY "Users can view their tenant terms" ON public.academic_terms FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert terms for their tenant" ON public.academic_terms FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant terms" ON public.academic_terms FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant terms" ON public.academic_terms FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for school_classes
CREATE POLICY "Users can view their tenant classes" ON public.school_classes FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert classes for their tenant" ON public.school_classes FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant classes" ON public.school_classes FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant classes" ON public.school_classes FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for students
CREATE POLICY "Users can view their tenant students" ON public.students FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert students for their tenant" ON public.students FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant students" ON public.students FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant students" ON public.students FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for student_attendance
CREATE POLICY "Users can view their tenant attendance" ON public.student_attendance FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert attendance for their tenant" ON public.student_attendance FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant attendance" ON public.student_attendance FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant attendance" ON public.student_attendance FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for subjects
CREATE POLICY "Users can view their tenant subjects" ON public.subjects FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert subjects for their tenant" ON public.subjects FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant subjects" ON public.subjects FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant subjects" ON public.subjects FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for student_grades
CREATE POLICY "Users can view their tenant grades" ON public.student_grades FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert grades for their tenant" ON public.student_grades FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant grades" ON public.student_grades FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant grades" ON public.student_grades FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for fee_structures
CREATE POLICY "Users can view their tenant fee structures" ON public.fee_structures FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert fee structures for their tenant" ON public.fee_structures FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant fee structures" ON public.fee_structures FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant fee structures" ON public.fee_structures FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for student_fees
CREATE POLICY "Users can view their tenant student fees" ON public.student_fees FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert student fees for their tenant" ON public.student_fees FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant student fees" ON public.student_fees FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant student fees" ON public.student_fees FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for fee_payments
CREATE POLICY "Users can view their tenant fee payments" ON public.fee_payments FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert fee payments for their tenant" ON public.fee_payments FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can update their tenant fee payments" ON public.fee_payments FOR UPDATE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can delete their tenant fee payments" ON public.fee_payments FOR DELETE USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for school_packages (admin managed, anyone can view active)
CREATE POLICY "Admins can manage school packages" ON public.school_packages FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'admin')));
CREATE POLICY "Anyone can view active school packages" ON public.school_packages FOR SELECT USING (is_active = true);

-- RLS Policies for school_subscriptions
CREATE POLICY "Users can view their tenant subscriptions" ON public.school_subscriptions FOR SELECT USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Users can insert subscriptions for their tenant" ON public.school_subscriptions FOR INSERT WITH CHECK (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));
CREATE POLICY "Admins can manage all subscriptions" ON public.school_subscriptions FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('superadmin', 'admin')));

-- Add triggers for updated_at
CREATE TRIGGER update_academic_terms_updated_at BEFORE UPDATE ON public.academic_terms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_classes_updated_at BEFORE UPDATE ON public.school_classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_grades_updated_at BEFORE UPDATE ON public.student_grades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fee_structures_updated_at BEFORE UPDATE ON public.fee_structures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_fees_updated_at BEFORE UPDATE ON public.student_fees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_packages_updated_at BEFORE UPDATE ON public.school_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_school_subscriptions_updated_at BEFORE UPDATE ON public.school_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();