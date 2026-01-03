-- Add unique business code to tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS business_code TEXT UNIQUE;

-- Create function to generate unique 6-char alphanumeric code
CREATE OR REPLACE FUNCTION public.generate_business_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6 char uppercase alphanumeric code
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.tenants WHERE business_code = new_code) INTO code_exists;
    
    -- Exit loop if code is unique
    EXIT WHEN NOT code_exists;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- Generate codes for existing tenants that don't have one
UPDATE public.tenants 
SET business_code = public.generate_business_code()
WHERE business_code IS NULL;

-- Make business_code NOT NULL after populating existing records
ALTER TABLE public.tenants 
ALTER COLUMN business_code SET NOT NULL;

-- Create trigger to auto-generate code for new tenants
CREATE OR REPLACE FUNCTION public.set_tenant_business_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.business_code IS NULL THEN
    NEW.business_code := public.generate_business_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_tenant_business_code ON public.tenants;
CREATE TRIGGER trigger_set_tenant_business_code
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_business_code();

-- Add password field to staff_invitations for storing generated password
ALTER TABLE public.staff_invitations 
ADD COLUMN IF NOT EXISTS generated_password TEXT;