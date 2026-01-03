-- Add product_type and allow_custom_price columns to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'product',
ADD COLUMN IF NOT EXISTS allow_custom_price boolean DEFAULT false;

-- Add comment for clarity
COMMENT ON COLUMN public.products.product_type IS 'Type of product: product or service';
COMMENT ON COLUMN public.products.allow_custom_price IS 'Allow custom price entry at POS for variable-priced services';