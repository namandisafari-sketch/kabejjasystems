-- Add a 4-digit access PIN to rental_tenants for renter portal authentication
ALTER TABLE public.rental_tenants 
ADD COLUMN IF NOT EXISTS access_pin TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN public.rental_tenants.access_pin IS 'A 4-digit PIN code given to renters by landlord for portal access';