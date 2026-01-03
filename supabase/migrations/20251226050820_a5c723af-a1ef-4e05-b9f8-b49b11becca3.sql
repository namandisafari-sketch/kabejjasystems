-- Add columns for custom letterhead and footer images
ALTER TABLE public.letter_settings 
ADD COLUMN IF NOT EXISTS custom_header_image_url text,
ADD COLUMN IF NOT EXISTS custom_footer_image_url text,
ADD COLUMN IF NOT EXISTS use_custom_header boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS use_custom_footer boolean DEFAULT false;