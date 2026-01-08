-- Create suppliers table
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on suppliers
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- Suppliers RLS policies
CREATE POLICY "Users can view their tenant suppliers" ON public.suppliers
FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert suppliers for their tenant" ON public.suppliers
FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant suppliers" ON public.suppliers
FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant suppliers" ON public.suppliers
FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create product_categories table with built-in categories
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  name text NOT NULL,
  description text,
  business_type text,
  is_system boolean DEFAULT false,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on product_categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Categories RLS policies
CREATE POLICY "Users can view system categories" ON public.product_categories
FOR SELECT USING (is_system = true OR tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert categories for their tenant" ON public.product_categories
FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND is_system = false);

CREATE POLICY "Users can update their tenant categories" ON public.product_categories
FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND is_system = false);

CREATE POLICY "Users can delete their tenant categories" ON public.product_categories
FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()) AND is_system = false);

-- Insert system categories for different business types
INSERT INTO public.product_categories (name, business_type, is_system, display_order) VALUES
-- Restaurant categories
('Appetizers', 'restaurant', true, 1),
('Main Course', 'restaurant', true, 2),
('Beverages', 'restaurant', true, 3),
('Desserts', 'restaurant', true, 4),
('Sides', 'restaurant', true, 5),
('Soups & Salads', 'restaurant', true, 6),

-- Supermarket categories
('Groceries', 'supermarket', true, 1),
('Fresh Produce', 'supermarket', true, 2),
('Dairy & Eggs', 'supermarket', true, 3),
('Meat & Poultry', 'supermarket', true, 4),
('Beverages', 'supermarket', true, 5),
('Snacks & Confectionery', 'supermarket', true, 6),
('Household Items', 'supermarket', true, 7),
('Personal Care', 'supermarket', true, 8),
('Frozen Foods', 'supermarket', true, 9),
('Bakery', 'supermarket', true, 10),

-- Hotel categories
('Room Service', 'hotel', true, 1),
('Mini Bar', 'hotel', true, 2),
('Spa Products', 'hotel', true, 3),
('Gift Shop', 'hotel', true, 4),
('Restaurant Menu', 'hotel', true, 5),

-- Pharmacy categories
('Prescription Drugs', 'pharmacy', true, 1),
('Over-the-Counter', 'pharmacy', true, 2),
('Vitamins & Supplements', 'pharmacy', true, 3),
('Personal Care', 'pharmacy', true, 4),
('Medical Devices', 'pharmacy', true, 5),
('Baby Care', 'pharmacy', true, 6),

-- Salon categories
('Hair Services', 'salon', true, 1),
('Nail Services', 'salon', true, 2),
('Skincare', 'salon', true, 3),
('Hair Products', 'salon', true, 4),
('Beauty Products', 'salon', true, 5),

-- Hardware categories
('Tools', 'hardware', true, 1),
('Electrical', 'hardware', true, 2),
('Plumbing', 'hardware', true, 3),
('Building Materials', 'hardware', true, 4),
('Paint & Finishes', 'hardware', true, 5),
('Garden & Outdoor', 'hardware', true, 6),

-- General/Other categories
('General', 'other', true, 1),
('Electronics', 'other', true, 2),
('Clothing', 'other', true, 3),
('Accessories', 'other', true, 4),
('Services', 'other', true, 5);

-- Add trigger for updated_at on suppliers
CREATE TRIGGER update_suppliers_updated_at
BEFORE UPDATE ON public.suppliers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();