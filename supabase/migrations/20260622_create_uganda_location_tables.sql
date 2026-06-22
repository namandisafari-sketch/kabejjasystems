-- Create Uganda administrative geographic tables with proper structure
-- Data source: https://github.com/Uganda-Open-Data/kalulu (2020 edition)
-- Hierarchy: Districts → Constituencies → Subcounties

-- ============================================================================
-- 1. DISTRICTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.uganda_districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_code INTEGER UNIQUE NOT NULL,
  district_name TEXT NOT NULL UNIQUE,
  region_code INTEGER,
  region_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add district name index for fast lookups
CREATE INDEX IF NOT EXISTS idx_uganda_districts_name ON public.uganda_districts(district_name);
CREATE INDEX IF NOT EXISTS idx_uganda_districts_code ON public.uganda_districts(district_code);
CREATE INDEX IF NOT EXISTS idx_uganda_districts_region ON public.uganda_districts(region_name);

-- ============================================================================
-- 2. CONSTITUENCIES/COUNTIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.uganda_constituencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  constituency_code INTEGER UNIQUE NOT NULL,
  constituency_name TEXT NOT NULL,
  district_id UUID NOT NULL REFERENCES public.uganda_districts(id) ON DELETE CASCADE,
  district_code INTEGER NOT NULL,
  district_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(constituency_name, district_id)
);

CREATE INDEX IF NOT EXISTS idx_uganda_constituencies_district ON public.uganda_constituencies(district_id);
CREATE INDEX IF NOT EXISTS idx_uganda_constituencies_name ON public.uganda_constituencies(constituency_name);
CREATE INDEX IF NOT EXISTS idx_uganda_constituencies_code ON public.uganda_constituencies(constituency_code);

-- ============================================================================
-- 3. SUBCOUNTIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.uganda_subcounties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcounty_code INTEGER NOT NULL,
  subcounty_name TEXT NOT NULL,
  constituency_id UUID NOT NULL REFERENCES public.uganda_constituencies(id) ON DELETE CASCADE,
  constituency_code INTEGER NOT NULL,
  constituency_name TEXT NOT NULL,
  district_id UUID NOT NULL REFERENCES public.uganda_districts(id) ON DELETE CASCADE,
  district_code INTEGER NOT NULL,
  district_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(subcounty_name, constituency_id)
);

CREATE INDEX IF NOT EXISTS idx_uganda_subcounties_constituency ON public.uganda_subcounties(constituency_id);
CREATE INDEX IF NOT EXISTS idx_uganda_subcounties_district ON public.uganda_subcounties(district_id);
CREATE INDEX IF NOT EXISTS idx_uganda_subcounties_name ON public.uganda_subcounties(subcounty_name);
CREATE INDEX IF NOT EXISTS idx_uganda_subcounties_code ON public.uganda_subcounties(subcounty_code);

-- ============================================================================
-- 4. UPDATE STUDENTS TABLE WITH LOCATION REFERENCES
-- ============================================================================

-- Add foreign key columns for location data
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.uganda_districts(id);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS constituency_id UUID REFERENCES public.uganda_constituencies(id);
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS subcounty_id UUID REFERENCES public.uganda_subcounties(id);

-- Add text columns for display/legacy support
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS district_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS constituency_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS subcounty_name TEXT;

-- Biographical columns
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS place_of_birth TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT 'Ugandan';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS religion TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS special_talent TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS home_address TEXT;

-- Portal and notification email columns
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS notification_email TEXT;

-- Add indexes on students location columns for fast queries
CREATE INDEX IF NOT EXISTS idx_students_district_id ON public.students(district_id);
CREATE INDEX IF NOT EXISTS idx_students_constituency_id ON public.students(constituency_id);
CREATE INDEX IF NOT EXISTS idx_students_subcounty_id ON public.students(subcounty_id);
CREATE INDEX IF NOT EXISTS idx_students_email ON public.students(email);
CREATE INDEX IF NOT EXISTS idx_students_notification_email ON public.students(notification_email);

-- ============================================================================
-- 5. RLS POLICIES FOR LOCATION TABLES (READ-ONLY FOR USERS)
-- ============================================================================

-- Enable RLS on all location tables
ALTER TABLE public.uganda_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uganda_constituencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uganda_subcounties ENABLE ROW LEVEL SECURITY;

-- Anyone can read location data (needed for dropdowns in forms)
CREATE POLICY "Public read access to districts" ON public.uganda_districts 
  FOR SELECT USING (true);

CREATE POLICY "Public read access to constituencies" ON public.uganda_constituencies 
  FOR SELECT USING (true);

CREATE POLICY "Public read access to subcounties" ON public.uganda_subcounties 
  FOR SELECT USING (true);

-- Only admins can modify location data (insert/update/delete)
CREATE POLICY "Admin-only insert districts" ON public.uganda_districts 
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "Admin-only update districts" ON public.uganda_districts 
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "Admin-only delete districts" ON public.uganda_districts 
  FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "Admin-only insert constituencies" ON public.uganda_constituencies 
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "Admin-only update constituencies" ON public.uganda_constituencies 
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "Admin-only delete constituencies" ON public.uganda_constituencies 
  FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "Admin-only insert subcounties" ON public.uganda_subcounties 
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "Admin-only update subcounties" ON public.uganda_subcounties 
  FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

CREATE POLICY "Admin-only delete subcounties" ON public.uganda_subcounties 
  FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));
