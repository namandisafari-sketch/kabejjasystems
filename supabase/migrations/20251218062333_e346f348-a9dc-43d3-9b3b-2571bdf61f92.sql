-- Allow public read access to tenants for menu display
CREATE POLICY "Anyone can view active tenants for menu" 
ON public.tenants 
FOR SELECT 
USING (status = 'active');

-- Allow public read access to menu categories
CREATE POLICY "Anyone can view active menu categories" 
ON public.menu_categories 
FOR SELECT 
USING (is_active = true);

-- Allow public read access to products (menu items)
CREATE POLICY "Anyone can view active menu items" 
ON public.products 
FOR SELECT 
USING (is_active = true);

-- Allow public read access to restaurant tables for table info display
CREATE POLICY "Anyone can view active tables" 
ON public.restaurant_tables 
FOR SELECT 
USING (is_active = true);