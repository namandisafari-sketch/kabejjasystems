// Business types configuration with their default modules

export interface BusinessTypeConfig {
  value: string;
  label: string;
  category: string;
  defaultModules: string[];
  billingType?: 'monthly' | 'per_term'; // Schools use per-term billing
}

export const businessTypes: BusinessTypeConfig[] = [
  // Schools (per-term billing)
  { value: 'kindergarten', label: 'Kindergarten/ECD', category: 'school', billingType: 'per_term', defaultModules: ['dashboard', 'students', 'classes', 'attendance', 'gate_checkin', 'visitor_register', 'ecd_progress', 'ecd_roles', 'ecd_pupils', 'ecd_learning_areas', 'ecd_pupil_cards', 'fees', 'discipline', 'employees', 'payroll', 'parents', 'timetable', 'term_calendar', 'admission_links', 'admission_confirmations', 'reports', 'settings'] },
  { value: 'primary_school', label: 'Primary School', category: 'school', billingType: 'per_term', defaultModules: ['dashboard', 'students', 'classes', 'attendance', 'gate_checkin', 'visitor_register', 'grades', 'subjects', 'fees', 'discipline', 'employees', 'payroll', 'parents', 'timetable', 'exams', 'exam_sessions', 'exam_results_import', 'exam_import_permissions', 'exam_access', 'term_calendar', 'admission_links', 'admission_confirmations', 'reports', 'settings'] },
  { value: 'secondary_school', label: 'Secondary School', category: 'school', billingType: 'per_term', defaultModules: ['dashboard', 'students', 'classes', 'attendance', 'gate_checkin', 'visitor_register', 'grades', 'subjects', 'fees', 'discipline', 'employees', 'payroll', 'parents', 'timetable', 'exams', 'exam_sessions', 'exam_results_import', 'exam_import_permissions', 'exam_access', 'term_calendar', 'uneb_registration', 'uneb_candidates', 'admission_links', 'admission_confirmations', 'reports', 'settings'] },
  
  // Retail
  { value: 'retail_shop', label: 'Retail Shop', category: 'retail', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings'] },
  { value: 'supermarket', label: 'Supermarket', category: 'retail', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings'] },
  { value: 'boutique', label: 'Boutique', category: 'retail', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings'] },
  { value: 'perfume_shop', label: 'Perfume Shop', category: 'retail', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings'] },
  { value: 'shoe_shop', label: 'Shoe Shop', category: 'retail', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings'] },
  { value: 'kitchenware_shop', label: 'Kitchenware Shop', category: 'retail', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings'] },
  { value: 'hardware', label: 'Hardware Store', category: 'retail', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings'] },
  { value: 'tech_shop', label: 'Tech/Gadgets Shop', category: 'retail', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings'] },
  
  // Restaurant/Bar/Cafe
  { value: 'restaurant', label: 'Restaurant', category: 'restaurant', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings', 'menu', 'tables', 'qr_menu', 'kitchen'] },
  { value: 'bar', label: 'Bar', category: 'restaurant', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings', 'menu', 'tables', 'qr_menu'] },
  { value: 'cafe', label: 'Cafe', category: 'restaurant', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings', 'menu', 'tables', 'qr_menu'] },
  
  // Hotel/Lodge
  { value: 'hotel', label: 'Hotel', category: 'hotel', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings', 'rooms', 'bookings'] },
  { value: 'lodge', label: 'Lodge', category: 'hotel', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings', 'rooms', 'bookings'] },
  { value: 'guest_house', label: 'Guest House', category: 'hotel', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings', 'rooms', 'bookings'] },
  
  // Salon/Spa
  { value: 'salon', label: 'Salon', category: 'salon', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings', 'services', 'appointments'] },
  { value: 'spa', label: 'Spa', category: 'salon', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings', 'services', 'appointments'] },
  { value: 'barber', label: 'Barber Shop', category: 'salon', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings', 'services', 'appointments'] },
  
  // Healthcare/Pharmacy
  { value: 'pharmacy', label: 'Pharmacy', category: 'pharmacy', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings', 'prescriptions', 'patients'] },
  { value: 'hospital', label: 'Hospital/Clinic', category: 'pharmacy', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings', 'prescriptions', 'patients'] },
  { value: 'clinic', label: 'Clinic', category: 'pharmacy', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings', 'patients'] },
  
  // Repair/Workshop
  { value: 'garage', label: 'Garage/Auto Workshop', category: 'repair', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings', 'jobs', 'parts'] },
  { value: 'tech_repair', label: 'Phone Repair', category: 'repair', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings', 'jobs', 'parts'] },
  { value: 'car_spares', label: 'Car Spare Parts', category: 'repair', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings', 'parts'] },
  { value: 'repair_shop', label: 'General Repair Shop', category: 'repair', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings', 'jobs'] },
  
  // Real Estate / Rental
  { value: 'rental_management', label: 'Property Rental Management', category: 'rental', defaultModules: ['rental_dashboard', 'rental_properties', 'rental_units', 'rental_tenants', 'rental_leases', 'rental_payments', 'rental_maintenance', 'rental_inspections', 'rental_documents', 'rental_messages', 'rental_reports', 'settings'] },
  { value: 'property_management', label: 'Property Management Company', category: 'rental', defaultModules: ['rental_dashboard', 'rental_properties', 'rental_units', 'rental_tenants', 'rental_leases', 'rental_payments', 'rental_maintenance', 'rental_inspections', 'rental_documents', 'rental_messages', 'rental_reports', 'employees', 'payroll', 'settings'] },
  
  // Other
  { value: 'other', label: 'Other', category: 'other', defaultModules: ['dashboard', 'pos', 'products', 'sales', 'customers', 'employees', 'expenses', 'reports', 'settings'] },
];

export const getBusinessTypeConfig = (businessType: string): BusinessTypeConfig | undefined => {
  return businessTypes.find(bt => bt.value === businessType);
};

// Priority order for categories (schools first, then pharmacy)
const categoryOrder = ['school', 'pharmacy', 'retail', 'restaurant', 'hotel', 'salon', 'repair', 'rental', 'other'];

export const getBusinessTypesByCategory = () => {
  const categories: Record<string, BusinessTypeConfig[]> = {};
  businessTypes.forEach(bt => {
    if (!categories[bt.category]) {
      categories[bt.category] = [];
    }
    categories[bt.category].push(bt);
  });
  
  // Return ordered categories with schools first
  const orderedCategories: Record<string, BusinessTypeConfig[]> = {};
  categoryOrder.forEach(cat => {
    if (categories[cat]) {
      orderedCategories[cat] = categories[cat];
    }
  });
  return orderedCategories;
};

export const categoryLabels: Record<string, string> = {
  school: 'Schools & Education',
  pharmacy: 'Healthcare & Pharmacy',
  retail: 'Retail & Shops',
  restaurant: 'Restaurant, Bar & Cafe',
  hotel: 'Hotels & Lodges',
  salon: 'Salon & Spa',
  repair: 'Repair & Workshop',
  rental: 'Rental & Property Management',
  other: 'Other',
};

// Check if a business type uses per-term billing
export const isSchoolBusiness = (businessType: string): boolean => {
  const config = getBusinessTypeConfig(businessType);
  return config?.billingType === 'per_term';
};
