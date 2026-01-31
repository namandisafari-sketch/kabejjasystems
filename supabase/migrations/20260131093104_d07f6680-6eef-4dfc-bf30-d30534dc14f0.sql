-- Add column to store initial owner password for admin visibility
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS owner_password TEXT;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- Add comment explaining purpose
COMMENT ON COLUMN public.tenants.owner_password IS 'Initial password for tenant owner - stored for admin reference only. User may have changed this.';
COMMENT ON COLUMN public.tenants.owner_email IS 'Email address of the tenant owner account';