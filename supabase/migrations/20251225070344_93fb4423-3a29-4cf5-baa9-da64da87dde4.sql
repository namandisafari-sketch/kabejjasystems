-- Create business_modules table (available modules in the system)
CREATE TABLE public.business_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  applicable_business_types TEXT[] DEFAULT '{}',
  is_core BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create tenant_modules table (modules enabled for each tenant)
CREATE TABLE public.tenant_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  module_code TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  enabled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  enabled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tenant_id, module_code)
);

-- Enable RLS
ALTER TABLE public.business_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_modules ENABLE ROW LEVEL SECURITY;

-- RLS for business_modules (anyone can view active modules)
CREATE POLICY "Anyone can view active modules"
ON public.business_modules FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage modules"
ON public.business_modules FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role IN ('superadmin', 'admin')
));

-- RLS for tenant_modules
CREATE POLICY "Users can view their tenant modules"
ON public.tenant_modules FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant owners can manage modules"
ON public.tenant_modules FOR ALL
USING (tenant_id IN (
  SELECT tenant_id FROM profiles 
  WHERE id = auth.uid() 
  AND role IN ('tenant_owner', 'superadmin', 'admin')
));

-- Insert default modules
INSERT INTO public.business_modules (code, name, description, icon, category, applicable_business_types, is_core, display_order) VALUES
-- Core modules (all businesses)
('dashboard', 'Dashboard', 'Business overview and analytics', 'LayoutDashboard', 'core', '{}', true, 1),
('pos', 'Point of Sale', 'Process sales and transactions', 'ShoppingCart', 'core', '{}', true, 2),
('products', 'Products & Inventory', 'Manage products and stock', 'Package', 'core', '{}', true, 3),
('sales', 'Sales & Orders', 'View and manage orders', 'Receipt', 'core', '{}', true, 4),
('customers', 'Customers', 'Customer management', 'Users', 'core', '{}', true, 5),
('employees', 'Employees', 'Staff management', 'UserCircle', 'core', '{}', true, 6),
('expenses', 'Expenses', 'Track business expenses', 'Wallet', 'core', '{}', true, 7),
('reports', 'Reports', 'Business reports and analytics', 'BarChart3', 'core', '{}', true, 8),
('settings', 'Settings', 'Business settings', 'Settings', 'core', '{}', true, 100),

-- Restaurant/Bar/Cafe modules
('menu', 'Menu Management', 'Create and manage food/drink menus', 'UtensilsCrossed', 'restaurant', ARRAY['restaurant', 'bar', 'cafe'], false, 10),
('tables', 'Table Management', 'Manage restaurant tables', 'MapPin', 'restaurant', ARRAY['restaurant', 'bar', 'cafe'], false, 11),
('qr_menu', 'QR Code Menus', 'Digital menus with QR codes', 'QrCode', 'restaurant', ARRAY['restaurant', 'bar', 'cafe'], false, 12),
('kitchen', 'Kitchen Display', 'Kitchen order management', 'ChefHat', 'restaurant', ARRAY['restaurant', 'bar', 'cafe'], false, 13),

-- Hotel/Lodge modules
('rooms', 'Room Management', 'Manage hotel rooms', 'Bed', 'hotel', ARRAY['hotel', 'lodge', 'guest_house'], false, 20),
('bookings', 'Room Bookings', 'Manage reservations', 'CalendarDays', 'hotel', ARRAY['hotel', 'lodge', 'guest_house'], false, 21),

-- Salon/Spa modules
('services', 'Services', 'Manage service offerings', 'Scissors', 'salon', ARRAY['salon', 'spa', 'barber'], false, 30),
('appointments', 'Appointments', 'Schedule and manage appointments', 'Calendar', 'salon', ARRAY['salon', 'spa', 'barber'], false, 31),

-- Pharmacy/Healthcare modules
('prescriptions', 'Prescriptions', 'Manage prescriptions', 'Pill', 'pharmacy', ARRAY['pharmacy', 'hospital', 'clinic'], false, 40),
('patients', 'Patients', 'Patient records management', 'HeartPulse', 'pharmacy', ARRAY['pharmacy', 'hospital', 'clinic'], false, 41),

-- Repair/Workshop modules
('jobs', 'Job Cards', 'Track repair jobs', 'Wrench', 'repair', ARRAY['garage', 'repair_shop', 'tech_repair'], false, 50),
('parts', 'Spare Parts', 'Parts inventory', 'Cog', 'repair', ARRAY['garage', 'repair_shop', 'tech_repair', 'car_spares'], false, 51);

-- Create trigger for updated_at
CREATE TRIGGER update_business_modules_updated_at
BEFORE UPDATE ON public.business_modules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();