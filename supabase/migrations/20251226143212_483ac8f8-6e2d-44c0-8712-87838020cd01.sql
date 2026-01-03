-- Add student ID format settings to school_settings table
ALTER TABLE public.school_settings
ADD COLUMN IF NOT EXISTS student_id_prefix TEXT DEFAULT 'STU',
ADD COLUMN IF NOT EXISTS student_id_digits INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS admission_prefix TEXT DEFAULT 'ADM',
ADD COLUMN IF NOT EXISTS admission_format TEXT DEFAULT 'ADM/{YY}/{NUMBER}';

COMMENT ON COLUMN public.school_settings.student_id_prefix IS 'Prefix for student ID (e.g., STU)';
COMMENT ON COLUMN public.school_settings.student_id_digits IS 'Number of digits for student ID number';
COMMENT ON COLUMN public.school_settings.admission_prefix IS 'Prefix for admission numbers';
COMMENT ON COLUMN public.school_settings.admission_format IS 'Format template for admission numbers';