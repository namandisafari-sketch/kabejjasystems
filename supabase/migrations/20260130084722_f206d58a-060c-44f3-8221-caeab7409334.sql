-- Create system_backups table for admin backup history
CREATE TABLE IF NOT EXISTS public.system_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL DEFAULT 'full',
  categories TEXT[] DEFAULT '{}',
  tables_included TEXT[] DEFAULT '{}',
  row_counts JSONB DEFAULT '{}',
  format TEXT,
  file_name TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage system backups
CREATE POLICY "Admins can manage system_backups" ON public.system_backups
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('superadmin', 'admin'))
  );

-- Add comment
COMMENT ON TABLE public.system_backups IS 'Tracks system-wide backup operations performed by administrators';