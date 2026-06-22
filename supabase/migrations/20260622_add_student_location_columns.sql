-- Add missing location and biographical columns to students table
-- These are needed for comprehensive student profile management

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Ugandan';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS place_of_birth TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS county_constituency TEXT;

-- Add notification_email and portal email columns if they don't exist
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS notification_email TEXT;

-- Add indexes for commonly searched fields
CREATE INDEX IF NOT EXISTS idx_students_admission_number ON public.students(tenant_id, admission_number);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_students_notification_email ON public.students(notification_email);
CREATE INDEX IF NOT EXISTS idx_students_district ON public.students(district);
