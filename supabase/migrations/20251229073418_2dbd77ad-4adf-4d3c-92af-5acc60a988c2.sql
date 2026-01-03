-- Repair Jobs table
CREATE TABLE public.repair_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  job_ref TEXT NOT NULL,
  device_type TEXT NOT NULL,
  device_model TEXT,
  device_imei TEXT,
  device_serial_number TEXT,
  device_state_before TEXT,
  fault_description TEXT NOT NULL,
  diagnosis TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'waiting_parts', 'completed', 'ready', 'delivered', 'collected', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  assigned_to UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  qr_code_data TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Repair Job Items (services and parts used)
CREATE TABLE public.repair_job_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
  item_id UUID,
  item_type TEXT NOT NULL CHECK (item_type IN ('service', 'product', 'part')),
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Repair Job Payments
CREATE TABLE public.repair_job_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.repair_jobs(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_reference TEXT,
  receipt_number TEXT,
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  received_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Spare Parts inventory (separate from products for repair shops)
CREATE TABLE public.spare_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  category TEXT,
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  reorder_level INTEGER DEFAULT 5,
  supplier TEXT,
  compatible_devices TEXT[], -- Array of device types this part is compatible with
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.repair_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_job_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_job_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for repair_jobs
CREATE POLICY "Users can view their tenant repair jobs"
ON public.repair_jobs FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert repair jobs for their tenant"
ON public.repair_jobs FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant repair jobs"
ON public.repair_jobs FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant repair jobs"
ON public.repair_jobs FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for repair_job_items
CREATE POLICY "Users can view job items"
ON public.repair_job_items FOR SELECT
USING (job_id IN (SELECT id FROM repair_jobs WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can insert job items"
ON public.repair_job_items FOR INSERT
WITH CHECK (job_id IN (SELECT id FROM repair_jobs WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can update job items"
ON public.repair_job_items FOR UPDATE
USING (job_id IN (SELECT id FROM repair_jobs WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "Users can delete job items"
ON public.repair_job_items FOR DELETE
USING (job_id IN (SELECT id FROM repair_jobs WHERE tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())));

-- RLS Policies for repair_job_payments
CREATE POLICY "Users can view their tenant job payments"
ON public.repair_job_payments FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert job payments for their tenant"
ON public.repair_job_payments FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant job payments"
ON public.repair_job_payments FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant job payments"
ON public.repair_job_payments FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies for spare_parts
CREATE POLICY "Users can view their tenant spare parts"
ON public.spare_parts FOR SELECT
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert spare parts for their tenant"
ON public.spare_parts FOR INSERT
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant spare parts"
ON public.spare_parts FOR UPDATE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant spare parts"
ON public.spare_parts FOR DELETE
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Function to generate job reference number
CREATE OR REPLACE FUNCTION public.generate_job_ref()
RETURNS TRIGGER AS $$
DECLARE
  job_count INTEGER;
  year_prefix TEXT;
BEGIN
  year_prefix := TO_CHAR(CURRENT_DATE, 'YYYY');
  SELECT COUNT(*) + 1 INTO job_count 
  FROM public.repair_jobs 
  WHERE tenant_id = NEW.tenant_id 
  AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);
  
  NEW.job_ref := 'JOB-' || year_prefix || '-' || LPAD(job_count::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-generate job ref
CREATE TRIGGER set_job_ref
  BEFORE INSERT ON public.repair_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_job_ref();

-- Update timestamp trigger for repair_jobs
CREATE TRIGGER update_repair_jobs_updated_at
  BEFORE UPDATE ON public.repair_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update timestamp trigger for spare_parts
CREATE TRIGGER update_spare_parts_updated_at
  BEFORE UPDATE ON public.spare_parts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add repair shop modules to business_modules
INSERT INTO public.business_modules (code, name, description, icon, category, applicable_business_types, is_core, is_active, display_order)
VALUES 
  ('jobs', 'Repair Jobs', 'Track and manage repair jobs', 'Wrench', 'repair', ARRAY['garage', 'tech_repair', 'repair_shop'], false, true, 35),
  ('parts', 'Spare Parts', 'Manage spare parts inventory', 'Cog', 'repair', ARRAY['garage', 'tech_repair', 'car_spares', 'repair_shop'], false, true, 36)
ON CONFLICT (code) DO UPDATE SET
  applicable_business_types = EXCLUDED.applicable_business_types,
  is_active = true;

-- Create indexes for better performance
CREATE INDEX idx_repair_jobs_tenant ON public.repair_jobs(tenant_id);
CREATE INDEX idx_repair_jobs_status ON public.repair_jobs(status);
CREATE INDEX idx_repair_jobs_customer ON public.repair_jobs(customer_id);
CREATE INDEX idx_repair_job_items_job ON public.repair_job_items(job_id);
CREATE INDEX idx_spare_parts_tenant ON public.spare_parts(tenant_id);
CREATE INDEX idx_spare_parts_category ON public.spare_parts(category);