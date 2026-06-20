-- Extend gate_checkins to support staff check-ins
-- Makes student_id nullable and adds person_type, employee_id, person_name columns

-- Make student_id nullable for staff entries
ALTER TABLE public.gate_checkins ALTER COLUMN student_id DROP NOT NULL;

-- Add person_type to distinguish entry types
ALTER TABLE public.gate_checkins ADD COLUMN person_type TEXT NOT NULL DEFAULT 'student' CHECK (person_type IN ('student', 'staff'));

-- Add employee_id for staff check-ins
ALTER TABLE public.gate_checkins ADD COLUMN employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

-- Add person_name for quick display without joins
ALTER TABLE public.gate_checkins ADD COLUMN person_name TEXT;
