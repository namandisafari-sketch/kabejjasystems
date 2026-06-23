-- Tenant Settings Table
-- Stores per-tenant configuration for notifications, reporting, and other preferences

CREATE TABLE IF NOT EXISTS public.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  admin_email TEXT,
  daily_report_enabled BOOLEAN DEFAULT false,
  weekly_report_enabled BOOLEAN DEFAULT false,
  monthly_report_enabled BOOLEAN DEFAULT false,
  report_recipients TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_tenant_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_tenant_settings_updated ON public.tenant_settings;
CREATE TRIGGER trigger_tenant_settings_updated
  BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW EXECUTE FUNCTION update_tenant_settings_timestamp();
