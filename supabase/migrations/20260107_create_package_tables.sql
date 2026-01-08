-- =====================================================
-- Create Missing Package Tables and Fix Permissions
-- =====================================================
-- Fixes: "Could not find the table 'public.school_packages'"
-- Fixes: "Failed to create rental package"

-- 1. CREATE SCHOOL_PACKAGES TABLE
CREATE TABLE IF NOT EXISTS public.school_packages (
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

-- 2. CREATE RENTAL_PACKAGES TABLE
CREATE TABLE IF NOT EXISTS public.rental_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  max_properties INTEGER NOT NULL DEFAULT 5,
  max_units INTEGER NOT NULL DEFAULT 20,
  monthly_price NUMERIC NOT NULL DEFAULT 0,
  included_users INTEGER NOT NULL DEFAULT 1,
  price_per_additional_user NUMERIC NOT NULL DEFAULT 10000,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. ENABLE RLS
ALTER TABLE public.school_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_packages ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES FOR SCHOOL_PACKAGES
-- Allow superadmins to manage school packages
DROP POLICY IF EXISTS "Superadmins can manage school packages" ON public.school_packages;
CREATE POLICY "Superadmins can manage school packages" 
ON public.school_packages 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'superadmin'
  )
);

-- Allow anyone (including anon) to view active school packages
DROP POLICY IF EXISTS "Anyone can view active school packages" ON public.school_packages;
CREATE POLICY "Anyone can view active school packages" 
ON public.school_packages 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);

-- 5. RLS POLICIES FOR RENTAL_PACKAGES
-- Allow superadmins to manage rental packages
DROP POLICY IF EXISTS "Superadmins can manage rental packages" ON public.rental_packages;
CREATE POLICY "Superadmins can manage rental packages" 
ON public.rental_packages 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'superadmin'
  )
);

-- Allow anyone (including anon) to view active rental packages
DROP POLICY IF EXISTS "Anyone can view active rental packages" ON public.rental_packages;
CREATE POLICY "Anyone can view active rental packages" 
ON public.rental_packages 
FOR SELECT 
TO anon, authenticated
USING (is_active = true);

-- 6. GRANT PERMISSIONS
GRANT SELECT ON public.school_packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.school_packages TO authenticated;

GRANT SELECT ON public.rental_packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.rental_packages TO authenticated;

-- 7. CREATE TRIGGERS FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_school_packages_updated_at ON public.school_packages;
CREATE TRIGGER update_school_packages_updated_at
  BEFORE UPDATE ON public.school_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_rental_packages_updated_at ON public.rental_packages;
CREATE TRIGGER update_rental_packages_updated_at
  BEFORE UPDATE ON public.rental_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. VERIFY TABLES CREATED
SELECT 
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('school_packages', 'rental_packages')
ORDER BY table_name;
