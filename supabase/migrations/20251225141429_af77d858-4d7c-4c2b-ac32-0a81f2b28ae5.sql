-- Create payroll_records table for monthly salary payments
CREATE TABLE public.payroll_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  base_salary NUMERIC NOT NULL DEFAULT 0,
  deductions NUMERIC NOT NULL DEFAULT 0,
  advances_deducted NUMERIC NOT NULL DEFAULT 0,
  bonuses NUMERIC NOT NULL DEFAULT 0,
  net_salary NUMERIC NOT NULL DEFAULT 0,
  payment_date DATE,
  payment_method TEXT DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create salary_advances table
CREATE TABLE public.salary_advances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  advance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT,
  is_deducted BOOLEAN NOT NULL DEFAULT false,
  deducted_in_payroll_id UUID REFERENCES public.payroll_records(id),
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;

-- RLS policies for payroll_records
CREATE POLICY "Users can view their tenant payroll records" ON public.payroll_records
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert payroll records for their tenant" ON public.payroll_records
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant payroll records" ON public.payroll_records
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant payroll records" ON public.payroll_records
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS policies for salary_advances
CREATE POLICY "Users can view their tenant salary advances" ON public.salary_advances
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert salary advances for their tenant" ON public.salary_advances
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update their tenant salary advances" ON public.salary_advances
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete their tenant salary advances" ON public.salary_advances
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_payroll_records_updated_at
  BEFORE UPDATE ON public.payroll_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salary_advances_updated_at
  BEFORE UPDATE ON public.salary_advances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-generate SKU for products
CREATE OR REPLACE FUNCTION public.generate_product_sku()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix TEXT;
  seq_num INTEGER;
  new_sku TEXT;
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    -- Get first 3 chars of category or 'PRD' as default
    prefix := UPPER(COALESCE(LEFT(REGEXP_REPLACE(NEW.category, '[^a-zA-Z]', '', 'g'), 3), 'PRD'));
    IF LENGTH(prefix) < 3 THEN
      prefix := RPAD(prefix, 3, 'X');
    END IF;
    
    -- Get next sequence number for this tenant
    SELECT COALESCE(MAX(CAST(SUBSTRING(sku FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO seq_num
    FROM products
    WHERE tenant_id = NEW.tenant_id AND sku LIKE prefix || '-%';
    
    new_sku := prefix || '-' || LPAD(seq_num::TEXT, 6, '0');
    NEW.sku := new_sku;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-generating SKU
CREATE TRIGGER generate_sku_on_insert
  BEFORE INSERT ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.generate_product_sku();