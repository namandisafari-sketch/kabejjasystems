-- School Assets/Inventory Management System
-- Supports: Furniture, Equipment, Books, Sports items, etc.

-- Asset categories enum
CREATE TYPE public.asset_category AS ENUM (
  'furniture',
  'equipment', 
  'books',
  'sports',
  'electronics',
  'musical_instruments',
  'lab_equipment',
  'teaching_aids',
  'vehicles',
  'other'
);

-- Asset condition enum
CREATE TYPE public.asset_condition AS ENUM (
  'excellent',
  'good',
  'fair',
  'poor',
  'needs_repair',
  'damaged',
  'disposed'
);

-- Main school assets table
CREATE TABLE public.school_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category asset_category NOT NULL DEFAULT 'other',
  sub_category VARCHAR(100),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost NUMERIC(12,2),
  total_value NUMERIC(12,2),
  
  -- Location and assignment
  location VARCHAR(255),
  assigned_to_class_id UUID REFERENCES public.school_classes(id) ON DELETE SET NULL,
  assigned_to_teacher_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  assigned_date DATE,
  
  -- Purchase and warranty info
  purchase_date DATE,
  supplier VARCHAR(255),
  invoice_number VARCHAR(100),
  warranty_expiry DATE,
  warranty_notes TEXT,
  
  -- Condition and maintenance
  condition asset_condition NOT NULL DEFAULT 'good',
  last_inspection_date DATE,
  next_maintenance_date DATE,
  maintenance_notes TEXT,
  
  -- Depreciation
  useful_life_years INTEGER,
  salvage_value NUMERIC(12,2),
  depreciation_method VARCHAR(50) DEFAULT 'straight_line',
  current_book_value NUMERIC(12,2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  disposal_date DATE,
  disposal_reason TEXT,
  disposal_value NUMERIC(12,2),
  
  -- Metadata
  photo_url TEXT,
  barcode VARCHAR(100),
  serial_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  
  UNIQUE(tenant_id, asset_code)
);

-- Asset maintenance history
CREATE TABLE public.asset_maintenance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.school_assets(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(50) NOT NULL, -- repair, inspection, upgrade, cleaning
  description TEXT NOT NULL,
  cost NUMERIC(12,2),
  performed_by VARCHAR(255),
  performed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  condition_before asset_condition,
  condition_after asset_condition,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Asset assignment history (who had what and when)
CREATE TABLE public.asset_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.school_assets(id) ON DELETE CASCADE,
  assigned_to_type VARCHAR(20) NOT NULL, -- 'class', 'teacher', 'student', 'department'
  assigned_to_id UUID,
  assigned_to_name VARCHAR(255),
  quantity INTEGER DEFAULT 1,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_date DATE,
  assigned_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Auto-generate asset code
CREATE OR REPLACE FUNCTION public.generate_asset_code()
RETURNS TRIGGER AS $$
DECLARE
  category_prefix TEXT;
  seq_num INTEGER;
BEGIN
  -- Get category prefix
  category_prefix := UPPER(LEFT(NEW.category::TEXT, 3));
  
  -- Get next sequence number for this tenant and category
  SELECT COALESCE(MAX(CAST(SUBSTRING(asset_code FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.school_assets
  WHERE tenant_id = NEW.tenant_id AND asset_code LIKE category_prefix || '-%';
  
  NEW.asset_code := category_prefix || '-' || LPAD(seq_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_asset_code
BEFORE INSERT ON public.school_assets
FOR EACH ROW
WHEN (NEW.asset_code IS NULL OR NEW.asset_code = '')
EXECUTE FUNCTION public.generate_asset_code();

-- Calculate depreciation on update
CREATE OR REPLACE FUNCTION public.calculate_asset_depreciation()
RETURNS TRIGGER AS $$
DECLARE
  years_used NUMERIC;
  annual_depreciation NUMERIC;
BEGIN
  IF NEW.purchase_date IS NOT NULL AND NEW.unit_cost IS NOT NULL AND NEW.useful_life_years IS NOT NULL THEN
    years_used := EXTRACT(YEAR FROM AGE(CURRENT_DATE, NEW.purchase_date));
    annual_depreciation := (COALESCE(NEW.unit_cost, 0) * NEW.quantity - COALESCE(NEW.salvage_value, 0)) / NULLIF(NEW.useful_life_years, 0);
    NEW.current_book_value := GREATEST(
      COALESCE(NEW.salvage_value, 0),
      (COALESCE(NEW.unit_cost, 0) * NEW.quantity) - (annual_depreciation * years_used)
    );
  ELSE
    NEW.current_book_value := COALESCE(NEW.unit_cost, 0) * NEW.quantity;
  END IF;
  
  -- Calculate total value
  NEW.total_value := COALESCE(NEW.unit_cost, 0) * NEW.quantity;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER calculate_depreciation
BEFORE INSERT OR UPDATE ON public.school_assets
FOR EACH ROW
EXECUTE FUNCTION public.calculate_asset_depreciation();

-- Enable RLS
ALTER TABLE public.school_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for school_assets
CREATE POLICY "Users can view assets in their tenant"
ON public.school_assets FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can create assets in their tenant"
ON public.school_assets FOR INSERT
WITH CHECK (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update assets in their tenant"
ON public.school_assets FOR UPDATE
USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can delete assets in their tenant"
ON public.school_assets FOR DELETE
USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- RLS Policies for asset_maintenance
CREATE POLICY "Users can view maintenance in their tenant"
ON public.asset_maintenance FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can manage maintenance in their tenant"
ON public.asset_maintenance FOR ALL
USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- RLS Policies for asset_assignments
CREATE POLICY "Users can view assignments in their tenant"
ON public.asset_assignments FOR SELECT
USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can manage assignments in their tenant"
ON public.asset_assignments FOR ALL
USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Triggers for updated_at
CREATE TRIGGER update_school_assets_updated_at
BEFORE UPDATE ON public.school_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_school_assets_tenant ON public.school_assets(tenant_id);
CREATE INDEX idx_school_assets_category ON public.school_assets(tenant_id, category);
CREATE INDEX idx_school_assets_condition ON public.school_assets(tenant_id, condition);
CREATE INDEX idx_school_assets_assigned_class ON public.school_assets(assigned_to_class_id);
CREATE INDEX idx_asset_maintenance_asset ON public.asset_maintenance(asset_id);
CREATE INDEX idx_asset_assignments_asset ON public.asset_assignments(asset_id);