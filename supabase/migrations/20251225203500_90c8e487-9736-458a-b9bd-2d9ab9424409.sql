-- Fix is_core flags - only dashboard, employees, settings should be truly core
-- Other modules should rely on applicable_business_types for filtering

UPDATE business_modules SET is_core = false WHERE code IN (
  'pos', 'products', 'sales', 'customers', 'expenses', 'reports', 'stock_alerts',
  'internal_usage', 'suppliers', 'categories', 'purchase_orders', 'business_cards'
);

-- Update applicable_business_types to be more accurate
-- Dashboard, employees, settings apply to ALL business types
UPDATE business_modules 
SET applicable_business_types = NULL 
WHERE code IN ('dashboard', 'employees', 'settings');

-- POS, products, sales, customers, expenses, reports should apply to retail/restaurant/hotel/salon/pharmacy businesses, NOT schools
UPDATE business_modules 
SET applicable_business_types = ARRAY['retail_shop', 'supermarket', 'boutique', 'perfume_shop', 'shoe_shop', 'kitchenware_shop', 'hardware', 'tech_shop', 'restaurant', 'bar', 'cafe', 'hotel', 'lodge', 'guest_house', 'salon', 'spa', 'barber', 'pharmacy', 'hospital', 'clinic', 'garage', 'tech_repair', 'car_spares', 'repair_shop', 'other']
WHERE code IN ('pos', 'products', 'sales', 'customers', 'expenses', 'reports', 'stock_alerts');

-- Suppliers, categories, purchase_orders apply to businesses with inventory
UPDATE business_modules 
SET applicable_business_types = ARRAY['retail_shop', 'supermarket', 'boutique', 'perfume_shop', 'shoe_shop', 'kitchenware_shop', 'hardware', 'tech_shop', 'restaurant', 'bar', 'cafe', 'hotel', 'lodge', 'guest_house', 'pharmacy', 'hospital', 'clinic', 'garage', 'tech_repair', 'car_spares', 'repair_shop', 'other']
WHERE code IN ('suppliers', 'categories', 'purchase_orders');

-- Internal usage for businesses with stock
UPDATE business_modules 
SET applicable_business_types = ARRAY['retail_shop', 'supermarket', 'boutique', 'restaurant', 'bar', 'cafe', 'hotel', 'lodge', 'guest_house', 'pharmacy', 'hospital', 'clinic', 'salon', 'spa', 'barber']
WHERE code = 'internal_usage';

-- Business cards for all businesses
UPDATE business_modules 
SET applicable_business_types = ARRAY['retail_shop', 'supermarket', 'boutique', 'perfume_shop', 'shoe_shop', 'kitchenware_shop', 'hardware', 'tech_shop', 'restaurant', 'bar', 'cafe', 'hotel', 'lodge', 'guest_house', 'salon', 'spa', 'barber', 'pharmacy', 'hospital', 'clinic', 'garage', 'tech_repair', 'car_spares', 'repair_shop', 'other']
WHERE code = 'business_cards';

-- Payroll applies to all business types including schools
UPDATE business_modules 
SET applicable_business_types = ARRAY['retail_shop', 'supermarket', 'boutique', 'perfume_shop', 'shoe_shop', 'kitchenware_shop', 'hardware', 'tech_shop', 'restaurant', 'bar', 'cafe', 'hotel', 'lodge', 'guest_house', 'salon', 'spa', 'barber', 'pharmacy', 'hospital', 'clinic', 'garage', 'tech_repair', 'car_spares', 'repair_shop', 'kindergarten', 'primary_school', 'secondary_school', 'other']
WHERE code = 'payroll';