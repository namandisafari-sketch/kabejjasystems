-- =====================================================
-- Fix: Add category_id column to products table
-- =====================================================

-- First, create the categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    parent_id uuid REFERENCES public.categories(id),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Add category_id column to products table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'products' 
        AND column_name = 'category_id'
    ) THEN
        ALTER TABLE public.products 
        ADD COLUMN category_id uuid REFERENCES public.categories(id);
    END IF;
END $$;

-- Create index on category_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);

-- Enable RLS on categories table if not already enabled
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for categories
DROP POLICY IF EXISTS "Users can view their tenant categories" ON public.categories;
CREATE POLICY "Users can view their tenant categories" ON public.categories
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert categories for their tenant" ON public.categories;
CREATE POLICY "Users can insert categories for their tenant" ON public.categories
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update their tenant categories" ON public.categories;
CREATE POLICY "Users can update their tenant categories" ON public.categories
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete their tenant categories" ON public.categories;
CREATE POLICY "Users can delete their tenant categories" ON public.categories
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create trigger for updated_at on categories
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
