-- Add new fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS barcode text,
ADD COLUMN IF NOT EXISTS unit_of_measure text DEFAULT 'piece',
ADD COLUMN IF NOT EXISTS supplier text,
ADD COLUMN IF NOT EXISTS brand text,
ADD COLUMN IF NOT EXISTS expiry_date date;

-- Create index on barcode for quick lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL;