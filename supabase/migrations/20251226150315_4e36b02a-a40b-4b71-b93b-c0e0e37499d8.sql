-- Add admission_status column to students table for enrollment workflow tracking
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS admission_status text NOT NULL DEFAULT 'pending';

-- Add payment_status for tracking enrollment payment
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';

-- Add orientation_completed flag
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS orientation_completed boolean DEFAULT false;

-- Add parent_portal_access flag
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS parent_portal_access boolean DEFAULT false;

-- Add suggested_class_level for age-based suggestion (for ECD)
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS suggested_class_level text;

-- Create index for admission status queries
CREATE INDEX IF NOT EXISTS idx_students_admission_status ON public.students(tenant_id, admission_status);

-- Comment on columns for documentation
COMMENT ON COLUMN public.students.admission_status IS 'Enrollment status: pending, approved, enrolled, rejected';
COMMENT ON COLUMN public.students.payment_status IS 'Payment status: unpaid, partial, paid';
COMMENT ON COLUMN public.students.ecd_level IS 'ECD class level: ecd1 (Baby Class 3-4yrs), ecd2 (Middle Class 4-5yrs), ecd3 (Top Class 5-6yrs)';