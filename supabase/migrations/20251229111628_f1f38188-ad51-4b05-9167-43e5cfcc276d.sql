-- Rental Properties table
CREATE TABLE public.rental_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  property_type TEXT NOT NULL DEFAULT 'apartment', -- apartment, house, commercial, etc.
  total_units INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  amenities JSONB DEFAULT '[]'::jsonb,
  year_built INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rental Units table
CREATE TABLE public.rental_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.rental_properties(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  floor_number INTEGER,
  bedrooms INTEGER DEFAULT 1,
  bathrooms INTEGER DEFAULT 1,
  size_sqm NUMERIC,
  monthly_rent NUMERIC NOT NULL DEFAULT 0,
  deposit_amount NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available', -- available, occupied, maintenance, reserved
  amenities JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rental Tenants (people renting, different from app tenants)
CREATE TABLE public.rental_tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  id_number TEXT,
  id_type TEXT DEFAULT 'national_id', -- national_id, passport, etc.
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  occupation TEXT,
  employer TEXT,
  monthly_income NUMERIC,
  previous_address TEXT,
  previous_landlord_contact TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, inactive, blacklisted
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Leases table
CREATE TABLE public.leases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.rental_units(id) ON DELETE CASCADE,
  rental_tenant_id UUID NOT NULL REFERENCES public.rental_tenants(id) ON DELETE CASCADE,
  lease_number TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_rent NUMERIC NOT NULL,
  deposit_amount NUMERIC DEFAULT 0,
  deposit_paid NUMERIC DEFAULT 0,
  payment_due_day INTEGER DEFAULT 1, -- Day of month rent is due
  late_fee_amount NUMERIC DEFAULT 0,
  late_fee_grace_days INTEGER DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'active', -- draft, active, expired, terminated, renewed
  terms_and_conditions TEXT,
  special_conditions TEXT,
  move_in_date DATE,
  move_out_date DATE,
  renewal_reminder_days INTEGER DEFAULT 30,
  auto_renew BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rental Payments table
CREATE TABLE public.rental_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  rental_tenant_id UUID NOT NULL REFERENCES public.rental_tenants(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'cash', -- cash, bank_transfer, mobile_money, cheque
  reference_number TEXT,
  payment_type TEXT NOT NULL DEFAULT 'rent', -- rent, deposit, late_fee, utility, other
  status TEXT NOT NULL DEFAULT 'completed', -- pending, completed, failed, refunded
  late_fee_applied NUMERIC DEFAULT 0,
  notes TEXT,
  received_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Maintenance Requests table
CREATE TABLE public.maintenance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.rental_units(id) ON DELETE CASCADE,
  rental_tenant_id UUID REFERENCES public.rental_tenants(id),
  request_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general', -- plumbing, electrical, hvac, appliance, structural, general
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, emergency
  status TEXT NOT NULL DEFAULT 'open', -- open, in_progress, scheduled, completed, cancelled
  scheduled_date DATE,
  completed_date DATE,
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  contractor_name TEXT,
  contractor_phone TEXT,
  resolution_notes TEXT,
  reported_by TEXT,
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rental Documents table
CREATE TABLE public.rental_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  rental_tenant_id UUID REFERENCES public.rental_tenants(id) ON DELETE SET NULL,
  property_id UUID REFERENCES public.rental_properties(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL, -- lease_agreement, id_copy, inspection_report, notice, receipt, other
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Rental Messages table
CREATE TABLE public.rental_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rental_tenant_id UUID REFERENCES public.rental_tenants(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_type TEXT NOT NULL DEFAULT 'manager', -- manager, tenant
  sender_id UUID,
  is_read BOOLEAN DEFAULT false,
  parent_message_id UUID REFERENCES public.rental_messages(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Property Inspections table
CREATE TABLE public.property_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.rental_units(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  inspection_type TEXT NOT NULL DEFAULT 'move_in', -- move_in, move_out, routine, complaint
  inspection_date DATE NOT NULL,
  inspector_name TEXT,
  overall_condition TEXT DEFAULT 'good', -- excellent, good, fair, poor
  notes TEXT,
  findings JSONB DEFAULT '[]'::jsonb,
  tenant_signature_url TEXT,
  manager_signature_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.rental_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_inspections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rental_properties
CREATE POLICY "Users can manage their tenant properties" ON public.rental_properties
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for rental_units
CREATE POLICY "Users can manage their tenant units" ON public.rental_units
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for rental_tenants
CREATE POLICY "Users can manage their rental tenants" ON public.rental_tenants
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for leases
CREATE POLICY "Users can manage their tenant leases" ON public.leases
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for rental_payments
CREATE POLICY "Users can manage their tenant payments" ON public.rental_payments
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for maintenance_requests
CREATE POLICY "Users can manage their tenant maintenance" ON public.maintenance_requests
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for rental_documents
CREATE POLICY "Users can manage their tenant documents" ON public.rental_documents
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for rental_messages
CREATE POLICY "Users can manage their tenant messages" ON public.rental_messages
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- RLS Policies for property_inspections
CREATE POLICY "Users can manage their tenant inspections" ON public.property_inspections
  FOR ALL USING (tenant_id IN (SELECT profiles.tenant_id FROM profiles WHERE profiles.id = auth.uid()));

-- Function to generate lease number
CREATE OR REPLACE FUNCTION public.generate_lease_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lease_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO lease_count 
  FROM public.leases 
  WHERE tenant_id = NEW.tenant_id 
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  NEW.lease_number := 'LSE-' || year_prefix || '-' || LPAD(lease_count::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Trigger for lease number
CREATE TRIGGER set_lease_number
  BEFORE INSERT ON public.leases
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_lease_number();

-- Function to generate maintenance request number
CREATE OR REPLACE FUNCTION public.generate_maintenance_request_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO request_count 
  FROM public.maintenance_requests 
  WHERE tenant_id = NEW.tenant_id 
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  NEW.request_number := 'MNT-' || year_prefix || '-' || LPAD(request_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

-- Trigger for maintenance request number
CREATE TRIGGER set_maintenance_request_number
  BEFORE INSERT ON public.maintenance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_maintenance_request_number();

-- Add updated_at triggers
CREATE TRIGGER update_rental_properties_updated_at BEFORE UPDATE ON public.rental_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_units_updated_at BEFORE UPDATE ON public.rental_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_tenants_updated_at BEFORE UPDATE ON public.rental_tenants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON public.leases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert rental management modules
INSERT INTO public.business_modules (code, name, category, description, icon, applicable_business_types, display_order, is_core)
VALUES 
  ('rental_dashboard', 'Dashboard', 'core', 'Rental management overview', 'LayoutDashboard', ARRAY['rental_management'], 1, true),
  ('rental_properties', 'Properties', 'property', 'Manage rental properties', 'Building2', ARRAY['rental_management'], 2, true),
  ('rental_units', 'Units', 'property', 'Manage rental units', 'DoorOpen', ARRAY['rental_management'], 3, true),
  ('rental_tenants', 'Tenants', 'people', 'Manage rental tenants', 'Users', ARRAY['rental_management'], 4, true),
  ('rental_leases', 'Leases', 'legal', 'Manage lease agreements', 'FileText', ARRAY['rental_management'], 5, true),
  ('rental_payments', 'Payments', 'finance', 'Track rental payments', 'Wallet', ARRAY['rental_management'], 6, true),
  ('rental_maintenance', 'Maintenance', 'operations', 'Maintenance requests', 'Wrench', ARRAY['rental_management'], 7, true),
  ('rental_inspections', 'Inspections', 'operations', 'Property inspections', 'ClipboardCheck', ARRAY['rental_management'], 8, false),
  ('rental_documents', 'Documents', 'admin', 'Document storage', 'FolderOpen', ARRAY['rental_management'], 9, false),
  ('rental_messages', 'Messages', 'communication', 'Tenant communication', 'MessageSquare', ARRAY['rental_management'], 10, false),
  ('rental_reports', 'Reports', 'analytics', 'Financial reports', 'BarChart3', ARRAY['rental_management'], 11, false)
ON CONFLICT (code) DO NOTHING;