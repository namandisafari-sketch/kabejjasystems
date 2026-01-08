-- Add category and price columns to term_requirements
ALTER TABLE public.term_requirements 
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'external' CHECK (category IN ('internal', 'external')),
ADD COLUMN IF NOT EXISTS price numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.term_requirements.category IS 'internal = sold by school, external = bought outside';
COMMENT ON COLUMN public.term_requirements.price IS 'Price only applicable for internal requirements';