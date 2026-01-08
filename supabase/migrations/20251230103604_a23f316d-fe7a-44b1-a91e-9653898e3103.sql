-- Add unit_type column to support commercial/business rentals
ALTER TABLE public.rental_units 
ADD COLUMN IF NOT EXISTS unit_type text NOT NULL DEFAULT 'residential';

-- Add comment for clarity
COMMENT ON COLUMN public.rental_units.unit_type IS 'Type of unit: residential, commercial, retail, office, warehouse, storage';