-- Add rental_package_id to tenants for rental businesses
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS rental_package_id UUID REFERENCES public.rental_packages(id);

-- Add comment for clarity
COMMENT ON COLUMN public.tenants.rental_package_id IS 'Reference to rental_packages for rental management businesses';