-- Add parent_login_code to tenants for parent portal access
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS parent_login_code TEXT UNIQUE;

-- Create function to generate a simple school code
CREATE OR REPLACE FUNCTION public.generate_parent_login_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character uppercase alphanumeric code
    code := UPPER(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM tenants WHERE parent_login_code = code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN code;
END;
$$;

-- Trigger to auto-generate parent_login_code on tenant creation
CREATE OR REPLACE FUNCTION public.set_tenant_parent_login_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.parent_login_code IS NULL THEN
    NEW.parent_login_code := generate_parent_login_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_parent_login_code_trigger
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_tenant_parent_login_code();

-- Generate codes for existing tenants
UPDATE public.tenants 
SET parent_login_code = generate_parent_login_code() 
WHERE parent_login_code IS NULL;