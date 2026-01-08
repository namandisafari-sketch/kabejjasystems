-- Create restaurant tables for table management
CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  capacity INTEGER DEFAULT 4,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning')),
  location TEXT, -- e.g., 'indoor', 'outdoor', 'patio'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (tenant_id, table_number)
);

-- Enable RLS
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant_tables
CREATE POLICY "Users can view their tenant tables"
ON public.restaurant_tables FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert tables for their tenant"
ON public.restaurant_tables FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant tables"
ON public.restaurant_tables FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant tables"
ON public.restaurant_tables FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create menu categories table
CREATE TABLE public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for menu_categories
CREATE POLICY "Users can view their tenant categories"
ON public.menu_categories FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert categories for their tenant"
ON public.menu_categories FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant categories"
ON public.menu_categories FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant categories"
ON public.menu_categories FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Add restaurant-specific columns to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES restaurant_tables(id),
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'counter' CHECK (order_type IN ('dine_in', 'takeaway', 'counter')),
ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'pending' CHECK (order_status IN ('pending', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
ADD COLUMN IF NOT EXISTS order_number INTEGER;

-- Add category_id to products for menu organization
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES menu_categories(id);

-- Create function to generate order numbers per tenant per day
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  today_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO today_count
  FROM sales
  WHERE tenant_id = NEW.tenant_id
  AND DATE(created_at) = CURRENT_DATE;
  
  NEW.order_number := today_count;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for order numbers
DROP TRIGGER IF EXISTS set_order_number ON sales;
CREATE TRIGGER set_order_number
BEFORE INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION generate_order_number();

-- Update restaurant_tables updated_at trigger
CREATE TRIGGER update_restaurant_tables_updated_at
BEFORE UPDATE ON restaurant_tables
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Update menu_categories updated_at trigger  
CREATE TRIGGER update_menu_categories_updated_at
BEFORE UPDATE ON menu_categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();