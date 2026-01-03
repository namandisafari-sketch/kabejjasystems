-- Create function to generate admission number
CREATE OR REPLACE FUNCTION public.generate_admission_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
  v_prefix TEXT;
BEGIN
  -- Only generate if admission_number is null or empty
  IF NEW.admission_number IS NULL OR NEW.admission_number = '' THEN
    v_year := TO_CHAR(CURRENT_DATE, 'YY');
    
    -- Get next sequence number for this tenant and year
    SELECT COALESCE(MAX(
      CAST(NULLIF(REGEXP_REPLACE(admission_number, '[^0-9]', '', 'g'), '') AS INTEGER)
    ), 0) + 1
    INTO v_seq
    FROM students
    WHERE tenant_id = NEW.tenant_id
    AND admission_number LIKE 'ADM/' || v_year || '/%';
    
    -- Format: ADM/YY/NNNN (e.g., ADM/25/0001)
    NEW.admission_number := 'ADM/' || v_year || '/' || LPAD(v_seq::TEXT, 4, '0');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-generate admission numbers
DROP TRIGGER IF EXISTS generate_student_admission_number ON students;
CREATE TRIGGER generate_student_admission_number
BEFORE INSERT ON public.students
FOR EACH ROW
EXECUTE FUNCTION public.generate_admission_number();