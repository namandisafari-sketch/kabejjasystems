-- Create tenant_backups table to store backup data before deletion
CREATE TABLE public.tenant_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  tenant_name TEXT NOT NULL,
  business_type TEXT,
  backup_data JSONB NOT NULL,
  deleted_by UUID,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenant_backups ENABLE ROW LEVEL SECURITY;

-- Only superadmins and admins can view backups
CREATE POLICY "Admins can view tenant backups"
ON public.tenant_backups
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('superadmin', 'admin')
  )
);

-- Only superadmins can delete backups (permanently)
CREATE POLICY "Superadmins can delete backups"
ON public.tenant_backups
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'superadmin'
  )
);

-- Add index for faster lookups
CREATE INDEX idx_tenant_backups_tenant_id ON public.tenant_backups(tenant_id);
CREATE INDEX idx_tenant_backups_deleted_at ON public.tenant_backups(deleted_at DESC);