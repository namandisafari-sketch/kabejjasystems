-- Add boarding status column to students table
ALTER TABLE public.students 
ADD COLUMN boarding_status text NOT NULL DEFAULT 'day' 
CHECK (boarding_status IN ('day', 'boarding'));

-- Add comment for clarity
COMMENT ON COLUMN public.students.boarding_status IS 'Indicates if student is a day scholar (day) or boarding scholar (boarding)';